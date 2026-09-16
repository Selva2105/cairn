import { Injectable, Logger } from '@nestjs/common';
import { fromPrismaEventType } from '@cairn/domain';
import type { DomainEvent, PrismaDomainEventType } from '@cairn/domain';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';
import {
  buildEmailContent,
  NotificationDispatchService,
} from '@cairn/notifications';
import { RulesEngineService } from '@cairn/rules-engine';

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
  documentsScanned: number;
  processed: number;
  notified: number;
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
  ) {}

  /**
   * Persists a single event sourced outside the polling loop above -- a dashboard form
   * submission or a parsed WhatsApp command. Returns false if it's a dedupe hit.
   */
  recordManualEvent(householdId: string, event: DomainEvent): Promise<boolean> {
    return this.events.persistIfNew(householdId, event);
  }

  async runOnce(householdId?: string): Promise<PipelineRunSummary> {
    const summary: PipelineRunSummary = {
      ingested: 0,
      skipped: 0,
      failedConnectors: 0,
      documentsScanned: 0,
      processed: 0,
      notified: 0,
    };

    summary.documentsScanned =
      await this.documentExpiryScanner.scan(householdId);
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
        try {
          const rawSignals = await connector.fetch(context);
          for (const raw of rawSignals) {
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
          }
        } catch (error) {
          // One bad connector doesn't take down the household's whole digest run --
          // CAIRN_WORKER_ENGINEERING.md §4.
          this.logger.error(
            `Connector ${connector.key} failed for household ${id}`,
            error as Error,
          );
          summary.failedConnectors++;
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

      for (const action of actions) {
        if (action.channel !== NOTIFICATION_CHANNELS.EMAIL) {
          continue;
        }
        const { subject, body: html } = buildEmailContent(domainEvent);
        for (const member of row.household.members) {
          const payload = {
            to: member.user.email,
            subject,
            body: html,
          };
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
              `Failed to send EMAIL notification for event ${row.id}`,
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
      }

      await this.events.markProcessed(row.id);
      summary.processed++;
    }
  }
}

function toDomainEvent(row: PendingEvent): DomainEvent {
  return {
    id: row.id,
    householdId: row.householdId,
    occurredAt: row.occurredAt.toISOString(),
    source: row.source.toLowerCase() as DomainEvent['source'],
    dedupeKey: row.dedupeKey,
    type: fromPrismaEventType(row.type as PrismaDomainEventType),
    payload: row.payload,
  } as DomainEvent;
}
