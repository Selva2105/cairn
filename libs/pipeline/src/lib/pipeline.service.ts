import { Injectable, Logger } from '@nestjs/common';
import { fromPrismaEventType } from '@cairn/domain';
import type {
  DomainEvent,
  PrismaDomainEventType,
  RawSignal,
} from '@cairn/domain';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';
import {
  buildEmailContent,
  NotificationDispatchService,
} from '@cairn/notifications';
import { RulesEngineService } from '@cairn/rules-engine';
import type { RuleAction } from '@cairn/rules-engine';

import { BillDueScannerService } from './bill-due-scanner.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { DocumentExpiryScannerService } from './document-expiry-scanner.service';
import {
  PipelineEventsService,
  type PendingEvent,
} from './pipeline-events.service';

export interface PipelineRunSummary {
  ingested: number;
  skipped: number;
  failedConnectors: number;
  failedSignals: number;
  documentsScanned: number;
  billsScanned: number;
  processed: number;
  notified: number;
  queuedForReview: number;
}

function emptySummary(): PipelineRunSummary {
  return {
    ingested: 0,
    skipped: 0,
    failedConnectors: 0,
    failedSignals: 0,
    documentsScanned: 0,
    billsScanned: 0,
    processed: 0,
    notified: 0,
    queuedForReview: 0,
  };
}

/**
 * Plain, infrastructure-agnostic: this class doesn't import bullmq or any HTTP decorator.
 * apps/worker wraps it in a BullMQ Processor; apps/api's PipelineModule wraps it in an HTTP
 * controller Vercel Cron hits. See CAIRN_WORKER_ENGINEERING.md §1.
 */
@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly connectors: ConnectorRegistryService,
    private readonly rules: RulesEngineService,
    private readonly notifications: NotificationDispatchService,
    private readonly events: PipelineEventsService,
    private readonly documentExpiryScanner: DocumentExpiryScannerService,
    private readonly billDueScanner: BillDueScannerService,
  ) {}

  /**
   * Persists a single event sourced outside the polling loop above -- a dashboard form
   * submission or a parsed WhatsApp command. Returns false if it's a dedupe hit.
   */
  recordManualEvent(householdId: string, event: DomainEvent): Promise<boolean> {
    return this.events.persistIfNew(householdId, event);
  }

  /**
   * Approves a low-confidence event held by the review gate (see
   * RulesEngineService.evaluate): re-evaluates it as if it were trustworthy and dispatches
   * notifications through the household's normal rules. Returns null if the event isn't
   * actually pending review for this household (already handled, or belongs to another one).
   */
  async approveReviewEvent(
    householdId: string,
    eventId: string,
  ): Promise<PipelineRunSummary | null> {
    const row = await this.events.getPendingReviewEvent(householdId, eventId);
    if (!row) {
      return null;
    }
    const domainEvent = { ...toDomainEvent(row), confidence: undefined };
    const configuredRules = await this.events.getActiveRules(
      row.householdId,
      row.type as PrismaDomainEventType,
    );
    const actions = this.rules.evaluate(domainEvent, configuredRules);
    const summary = emptySummary();
    await this.dispatchActions(row, domainEvent, actions, summary);
    return summary;
  }

  /**
   * Dismisses a low-confidence event as a false positive -- marks it processed without ever
   * notifying anyone.
   */
  async dismissReviewEvent(
    householdId: string,
    eventId: string,
  ): Promise<boolean> {
    const row = await this.events.getPendingReviewEvent(householdId, eventId);
    if (!row) {
      return false;
    }
    await this.events.markProcessed(eventId);
    return true;
  }

  async runOnce(householdId?: string): Promise<PipelineRunSummary> {
    const summary = emptySummary();

    summary.documentsScanned =
      await this.documentExpiryScanner.scan(householdId);
    summary.billsScanned = await this.billDueScanner.scan(householdId);
    await this.ingestFromConnectors(householdId, summary);
    await this.evaluateAndNotifyPending(householdId, summary);

    return summary;
  }

  private async ingestFromConnectors(
    householdId: string | undefined,
    summary: PipelineRunSummary,
  ): Promise<void> {
    const householdIds = householdId
      ? [householdId]
      : await this.events.listActiveHouseholdIds();

    for (const id of householdIds) {
      const enabledConnectors = await this.connectors.getEnabledFor(id);

      for (const { connector, context } of enabledConnectors) {
        let rawSignals: RawSignal[];
        try {
          rawSignals = await connector.fetch(context);
        } catch (error) {
          // One bad connector doesn't take down the household's whole digest run --
          // CAIRN_WORKER_ENGINEERING.md §4.
          this.logger.error(
            `Connector ${connector.key} failed for household ${id}`,
            error as Error,
          );
          summary.failedConnectors++;
          continue;
        }

        for (const raw of rawSignals) {
          try {
            const event: DomainEvent = {
              ...connector.normalize(raw),
              householdId: id,
            };
            const wasNew = await this.events.persistIfNew(id, event);
            if (wasNew) {
              summary.ingested++;
            } else {
              summary.skipped++;
            }
          } catch (error) {
            // One malformed signal (an unparseable email, a bad calendar event) shouldn't
            // drop every other signal this connector fetched in the same run.
            this.logger.error(
              `Connector ${connector.key} failed to normalize a signal for household ${id}`,
              error as Error,
            );
            summary.failedSignals++;
          }
        }
      }
    }
  }

  private async evaluateAndNotifyPending(
    householdId: string | undefined,
    summary: PipelineRunSummary,
  ): Promise<void> {
    const pending = await this.events.listPending(householdId);

    for (const row of pending) {
      const domainEvent = toDomainEvent(row);
      const configuredRules = await this.events.getActiveRules(
        row.householdId,
        row.type as PrismaDomainEventType,
      );
      const actions = this.rules.evaluate(domainEvent, configuredRules);

      if (actions.some((action) => action.action === 'review')) {
        await this.events.flagForReview(row.id);
        summary.queuedForReview++;
        continue;
      }

      await this.dispatchActions(row, domainEvent, actions, summary);
    }
  }

  private async dispatchActions(
    row: PendingEvent,
    domainEvent: DomainEvent,
    actions: RuleAction[],
    summary: PipelineRunSummary,
  ): Promise<void> {
    if (actions.length === 0) {
      await this.events.markProcessed(row.id);
      summary.processed++;
      return;
    }

    // Read the household's preferred digest channel (defaults EMAIL)
    const digestChannel = await this.events.getHouseholdDigestChannel(
      row.householdId,
    );
    const sendEmail = digestChannel === 'EMAIL' || digestChannel === 'BOTH';
    const sendWhatsApp =
      digestChannel === 'WHATSAPP' || digestChannel === 'BOTH';

    const { subject, body: html, text } = buildEmailContent(domainEvent);

    for (const member of row.household.members) {
      // ── EMAIL ──────────────────────────────────────────────────────────
      if (sendEmail) {
        const payload = { to: member.user.email, subject, body: html };
        try {
          await this.notifications.dispatch(
            NOTIFICATION_CHANNELS.EMAIL,
            payload,
          );
          await this.events.recordNotificationSent(
            row.householdId,
            row.id,
            'EMAIL',
            payload,
          );
          summary.notified++;
        } catch (error) {
          this.logger.error(
            `Failed EMAIL for event ${row.id} → ${member.user.email}`,
            error as Error,
          );
          await this.events.recordNotificationFailed(
            row.householdId,
            row.id,
            'EMAIL',
            payload,
            (error as Error).message,
          );
        }
      }

      // ── WHATSAPP ───────────────────────────────────────────────────────
      if (sendWhatsApp) {
        const phone = member.user.phone;
        if (!phone) {
          this.logger.warn(
            `Skipping WhatsApp for ${member.user.email} — no phone linked`,
          );
          continue;
        }
        const plainBody =
          text ??
          html
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const waPayload = { to: phone, subject, body: plainBody };
        try {
          await this.notifications.dispatch(
            NOTIFICATION_CHANNELS.WHATSAPP,
            waPayload,
          );
          await this.events.recordNotificationSent(
            row.householdId,
            row.id,
            'WHATSAPP',
            waPayload,
          );
          summary.notified++;
        } catch (error) {
          this.logger.error(
            `Failed WhatsApp for event ${row.id} → ${phone}`,
            error as Error,
          );
          await this.events.recordNotificationFailed(
            row.householdId,
            row.id,
            'WHATSAPP',
            waPayload,
            (error as Error).message,
          );
        }
      }
    }

    await this.events.markProcessed(row.id);
    summary.processed++;
  }
}

function toDomainEvent(row: PendingEvent): DomainEvent {
  // `confidence` is folded into the JSON payload at insert time (PipelineEventsService
  // .persistIfNew) since EventLog has no dedicated column for it -- pull it back out so the
  // rules engine's confidence gate actually sees it.
  const payload = row.payload as Record<string, unknown> & {
    confidence?: 'high' | 'low';
  };
  return {
    id: row.id,
    householdId: row.householdId,
    occurredAt: row.occurredAt.toISOString(),
    source: row.source.toLowerCase() as DomainEvent['source'],
    dedupeKey: row.dedupeKey,
    type: fromPrismaEventType(row.type as PrismaDomainEventType),
    confidence: payload.confidence,
    payload,
  } as DomainEvent;
}
