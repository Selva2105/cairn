import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import type { DomainEvent } from '@cairn/domain';
import { PrismaService } from '@cairn/database';
import { EVENT_TYPES } from '@cairn/shared-constants';
import { hashDedupeKey } from '@cairn/shared-utils';

import { PipelineEventsService } from './pipeline-events.service';

const DEFAULT_BILL_REMINDER_DAYS = [7, 3, 1];

/**
 * Scans bills for each household using their configured billReminderDays.
 *
 * For a bill with dueDate and configured reminderDays [7, 3, 1]:
 *   • When inside the 7-day window (7d down to 4d) → dedupeKey: BILL_REMINDER_7D_<id>
 *   • When inside the 3-day window (3d down to 2d) → dedupeKey: BILL_REMINDER_3D_<id>
 *   • When inside the 1-day window (1d down to 0d) → dedupeKey: BILL_REMINDER_1D_<id>
 *   • When overdue (dueDate in past)               → dedupeKey: BILL_OVERDUE_<id>
 *
 * Deduplication guarantees each notification fires exactly once per threshold.
 */
@Injectable()
export class BillDueScannerService {
  private readonly logger = new Logger(BillDueScannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: PipelineEventsService,
  ) {}

  async scan(householdId?: string): Promise<number> {
    const now = new Date();

    const households = await this.prisma.household.findMany({
      ...(householdId ? { where: { id: householdId } } : {}),
      select: {
        id: true,
        config: { select: { billReminderDays: true } },
      },
    });

    let totalCreated = 0;

    for (const household of households) {
      const rawReminderDays =
        household.config?.billReminderDays &&
        household.config.billReminderDays.length > 0
          ? household.config.billReminderDays
          : DEFAULT_BILL_REMINDER_DAYS;

      const sortedDays = [...rawReminderDays].sort((a, b) => b - a);
      const maxLookahead = sortedDays[0] ?? 7;

      const lookaheadDate = new Date(
        now.getTime() + maxLookahead * 24 * 60 * 60 * 1000,
      );

      const bills = await this.prisma.bill.findMany({
        where: {
          householdId: household.id,
          dueDate: { lte: lookaheadDate },
        },
      });

      for (const bill of bills) {
        const msUntilDue = bill.dueDate.getTime() - now.getTime();
        const daysUntilDue = Math.ceil(msUntilDue / (1000 * 60 * 60 * 24));

        const basePayload = {
          billId: bill.id,
          vendor: bill.vendor,
          amount: Number(bill.amount),
          currency: bill.currency,
          dueDate: bill.dueDate.toISOString(),
          isRecurring: bill.isRecurring,
        };

        // ── Active reminder thresholds (before due date) ────────────────────
        if (daysUntilDue > 0) {
          for (let i = 0; i < sortedDays.length; i++) {
            const threshold = sortedDays[i];
            const nextLower = sortedDays[i + 1] ?? 0;

            if (
              threshold !== undefined &&
              daysUntilDue <= threshold &&
              daysUntilDue > nextLower
            ) {
              const dedupeKey = hashDedupeKey([
                `BILL_REMINDER_${threshold}D`,
                bill.id,
              ]);

              const event: DomainEvent = {
                id: randomUUID(),
                householdId: household.id,
                occurredAt: now.toISOString(),
                source: 'manual',
                dedupeKey,
                type: EVENT_TYPES.BILL_DETECTED,
                payload: {
                  ...basePayload,
                  isReminder: true,
                  daysUntilDue,
                  reminderThreshold: threshold,
                },
              } as DomainEvent;

              if (await this.events.persistIfNew(household.id, event)) {
                totalCreated++;
                this.logger.log(
                  `Bill reminder: "${bill.vendor}" — ${threshold}d threshold (${daysUntilDue}d remaining)`,
                );
              }
              break;
            }
          }
        }

        // ── Overdue alert ───────────────────────────────────────────────────
        if (msUntilDue <= 0) {
          const dedupeKey = hashDedupeKey(['BILL_OVERDUE', bill.id]);
          const event: DomainEvent = {
            id: randomUUID(),
            householdId: household.id,
            occurredAt: now.toISOString(),
            source: 'manual',
            dedupeKey,
            type: EVENT_TYPES.BILL_DETECTED,
            payload: {
              ...basePayload,
              isReminder: true,
              isOverdue: true,
              daysUntilDue: 0,
            },
          } as DomainEvent;

          if (await this.events.persistIfNew(household.id, event)) {
            totalCreated++;
            this.logger.log(`Bill overdue alert: "${bill.vendor}"`);
          }
        }
      }
    }

    return totalCreated;
  }
}
