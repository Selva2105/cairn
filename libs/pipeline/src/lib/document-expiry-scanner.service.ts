import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import type { DomainEvent } from '@cairn/domain';
import { PrismaService } from '@cairn/database';
import { EVENT_TYPES } from '@cairn/shared-constants';
import { hashDedupeKey } from '@cairn/shared-utils';

import { PipelineEventsService } from './pipeline-events.service';
import { mergeReminderDays, ruleThresholds } from './reminder-days';

// Fallback reminder schedule if household has no config row yet
const DEFAULT_DOC_REMINDER_DAYS = [30, 14, 1];

/**
 * Scans documents for each household using their configured docReminderDays.
 *
 * For a document expiring and configured reminderDays [30, 14, 1]:
 *   • When inside the 30-day window (30d down to 15d) → dedupeKey: DOC_REMINDER_30D_<id>
 *   • When inside the 14-day window (14d down to 2d)  → dedupeKey: DOC_REMINDER_14D_<id>
 *   • When inside the 1-day window (1d down to 0d)   → dedupeKey: DOC_REMINDER_1D_<id>
 *   • After expiresOn actually passes                → dedupeKey: DOC_EXPIRED_<id>
 *
 * Each dedupeKey ensures the notification is sent exactly once per threshold,
 * regardless of how frequently the pipeline runs.
 */
@Injectable()
export class DocumentExpiryScannerService {
  private readonly logger = new Logger(DocumentExpiryScannerService.name);

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
        config: { select: { docReminderDays: true, digestTime: true } },
      },
    });

    let totalCreated = 0;

    for (const household of households) {
      const rawReminderDays =
        household.config?.docReminderDays &&
        household.config.docReminderDays.length > 0
          ? household.config.docReminderDays
          : DEFAULT_DOC_REMINDER_DAYS;

      // Sort descending, e.g. [30, 14, 1]
      // Active rules' "notify within N days" thresholds also become reminder windows --
      // otherwise a 60-day rule could never fire before the scanner's own largest window.
      const sortedDays = mergeReminderDays(
        rawReminderDays,
        ruleThresholds(
          await this.events.getActiveRules(household.id, 'DOCUMENT_EXPIRING'),
        ),
      );
      const maxLookahead = sortedDays[0] ?? 30;

      const lookaheadDate = new Date(
        now.getTime() + maxLookahead * 24 * 60 * 60 * 1000,
      );

      const documents = await this.prisma.document.findMany({
        where: {
          householdId: household.id,
          expiresOn: { lte: lookaheadDate },
        },
      });

      for (const document of documents) {
        const msUntilExpiry = document.expiresOn.getTime() - now.getTime();
        const daysUntilExpiry = Math.ceil(
          msUntilExpiry / (1000 * 60 * 60 * 24),
        );

        const basePayload = {
          documentId: document.id,
          documentLabel: document.label,
          documentType: document.type.toLowerCase(),
          expiresOn: document.expiresOn.toISOString(),
        };

        // ── Active reminder thresholds (before expiry) ──────────────────────
        if (daysUntilExpiry > 0) {
          for (let i = 0; i < sortedDays.length; i++) {
            const threshold = sortedDays[i];
            const nextLower = sortedDays[i + 1] ?? 0;

            // Trigger when daysUntilExpiry is within (nextLower, threshold]
            if (
              threshold !== undefined &&
              daysUntilExpiry <= threshold &&
              daysUntilExpiry > nextLower
            ) {
              const dedupeKey = hashDedupeKey([
                `DOC_REMINDER_${threshold}D`,
                document.id,
              ]);

              const event: DomainEvent = {
                id: randomUUID(),
                householdId: household.id,
                occurredAt: now.toISOString(),
                source: 'manual',
                dedupeKey,
                type: EVENT_TYPES.DOCUMENT_EXPIRING,
                payload: {
                  ...basePayload,
                  daysUntilExpiry,
                  reminderThreshold: threshold,
                },
              } as DomainEvent;

              if (await this.events.persistIfNew(household.id, event)) {
                totalCreated++;
                this.logger.log(
                  `Doc reminder: "${document.label}" — ${threshold}d threshold (${daysUntilExpiry}d remaining)`,
                );
              }
              break;
            }
          }
        }

        // ── Expired alert (after expiry has passed) ──────────────────────────
        if (msUntilExpiry <= 0) {
          const dedupeKey = hashDedupeKey(['DOC_EXPIRED', document.id]);
          const event: DomainEvent = {
            id: randomUUID(),
            householdId: household.id,
            occurredAt: now.toISOString(),
            source: 'manual',
            dedupeKey,
            type: EVENT_TYPES.DOCUMENT_EXPIRING,
            payload: {
              ...basePayload,
              daysUntilExpiry: 0,
              isExpired: true,
            },
          } as DomainEvent;

          if (await this.events.persistIfNew(household.id, event)) {
            totalCreated++;
            this.logger.log(`Doc expired alert: "${document.label}"`);
          }
        }
      }
    }

    return totalCreated;
  }
}
