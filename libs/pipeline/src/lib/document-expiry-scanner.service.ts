import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { DomainEvent } from '@cairn/domain';
import { PrismaService } from '@cairn/database';
import { EVENT_TYPES } from '@cairn/shared-constants';
import { hashDedupeKey } from '@cairn/shared-utils';

import { PipelineEventsService } from './pipeline-events.service';

const EXPIRY_LOOKAHEAD_DAYS = 30;

/**
 * A Document row (created via the dashboard, DocumentsModule) is the source of truth --
 * unlike Gmail/manual entries, it never arrives as a discrete signal to normalize. This scans
 * for documents entering the expiry window and creates two independently-deduped events per
 * document: a "coming up" reminder the moment it enters the 30-day window, and a separate
 * "has now expired" alert the moment expiresOn (full date *and* time) actually passes -- distinct
 * dedupeKeys so getting the early reminder doesn't suppress the later expiry notice, or vice
 * versa. Each still only ever fires once (dedupeKey scoped to document id, not the scan date).
 */
@Injectable()
export class DocumentExpiryScannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: PipelineEventsService,
  ) {}

  async scan(householdId?: string): Promise<number> {
    const now = new Date();
    const lookahead = new Date(
      now.getTime() + EXPIRY_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
    );

    const documents = await this.prisma.document.findMany({
      where: {
        expiresOn: { lte: lookahead },
        ...(householdId ? { householdId } : {}),
      },
    });

    let created = 0;
    for (const document of documents) {
      const payload = {
        documentType: document.type.toLowerCase(),
        expiresOn: document.expiresOn.toISOString(),
      };

      const reminder: DomainEvent = {
        id: randomUUID(),
        householdId: document.householdId,
        occurredAt: now.toISOString(),
        source: 'manual',
        dedupeKey: hashDedupeKey(['DOCUMENT_EXPIRY_SCAN', document.id]),
        type: EVENT_TYPES.DOCUMENT_EXPIRING,
        payload,
      } as DomainEvent;

      if (await this.events.persistIfNew(document.householdId, reminder)) {
        created++;
      }

      if (document.expiresOn.getTime() <= now.getTime()) {
        const expired: DomainEvent = {
          id: randomUUID(),
          householdId: document.householdId,
          occurredAt: now.toISOString(),
          source: 'manual',
          dedupeKey: hashDedupeKey(['DOCUMENT_EXPIRED_SCAN', document.id]),
          type: EVENT_TYPES.DOCUMENT_EXPIRING,
          payload,
        } as DomainEvent;

        if (await this.events.persistIfNew(document.householdId, expired)) {
          created++;
        }
      }
    }
    return created;
  }
}
