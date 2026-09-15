import { Injectable, Logger } from '@nestjs/common';
import { fromPrismaEventType } from '@cairn/domain';
import type { DomainEvent, PrismaDomainEventType } from '@cairn/domain';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';
import { NotificationDispatchService } from '@cairn/notifications';
import { RulesEngineService } from '@cairn/rules-engine';

import { ConnectorRegistryService } from './connector-registry.service';
import {
  PipelineEventsService,
  type PendingEvent,
} from './pipeline-events.service';

export interface PipelineRunSummary {
  ingested: number;
  skipped: number;
  failedConnectors: number;
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
  ) {}

  async runOnce(householdId?: string): Promise<PipelineRunSummary> {
    const summary: PipelineRunSummary = {
      ingested: 0,
      skipped: 0,
      failedConnectors: 0,
      processed: 0,
      notified: 0,
    };

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
      const actions = this.rules.evaluate(toDomainEvent(row));

      for (const action of actions) {
        if (action.channel !== NOTIFICATION_CHANNELS.EMAIL) {
          continue;
        }
        for (const member of row.household.members) {
          await this.notifications.dispatch(NOTIFICATION_CHANNELS.EMAIL, {
            to: member.user.email,
            subject: `Cairn: ${row.type.replace(/_/g, ' ').toLowerCase()}`,
            body: `<p>${JSON.stringify(row.payload)}</p>`,
          });
          summary.notified++;
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
