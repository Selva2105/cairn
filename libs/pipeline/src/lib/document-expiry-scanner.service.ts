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
 * for documents entering the expiry window and creates the DocumentExpiring event once (a
 * dedupeKey scoped to the document id, not the scan date, so it never re-fires daily).
 */
@Injectable()
export class DocumentExpiryScannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: PipelineEventsService,
  ) {}

  async scan(householdId?: string): Promise<number> {
    const lookahead = new Date(
      Date.now() + EXPIRY_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
    );

    const documents = await this.prisma.document.findMany({
      where: {
        expiresOn: { lte: lookahead },
        ...(householdId ? { householdId } : {}),
      },
    });

    let created = 0;
    for (const document of documents) {
      const event: DomainEvent = {
        id: randomUUID(),
        householdId: document.householdId,
        occurredAt: new Date().toISOString(),
        source: 'manual',
        dedupeKey: hashDedupeKey(['DOCUMENT_EXPIRY_SCAN', document.id]),
        type: EVENT_TYPES.DOCUMENT_EXPIRING,
        payload: {
          documentType: document.type.toLowerCase(),
          expiresOn: document.expiresOn.toISOString(),
        },
      } as DomainEvent;

      const wasNew = await this.events.persistIfNew(
        document.householdId,
        event,
      );
      if (wasNew) {
        created++;
      }
    }
    return created;
  }
}
