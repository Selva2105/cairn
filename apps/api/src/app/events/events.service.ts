import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { toDomainEventType } from '@cairn/domain';
import { Prisma, PrismaService, type EventLog } from '@cairn/database';
import type { EventType } from '@cairn/shared-constants';
import { hashDedupeKey } from '@cairn/shared-utils';

import { CreateManualEventDto } from './dto/create-manual-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(householdId: string): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: { householdId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async recordManualEvent(
    householdId: string,
    dto: CreateManualEventDto,
  ): Promise<EventLog> {
    const dedupeKey = hashDedupeKey([
      'MANUAL',
      householdId,
      dto.externalId ?? randomUUID(),
    ]);
    const existing = await this.prisma.eventLog.findUnique({
      where: { dedupeKey },
    });
    if (existing) {
      return existing; // idempotent no-op -- ARCHITECTURE.md §8
    }

    return this.prisma.eventLog.create({
      data: {
        householdId,
        type: toDomainEventType(dto.type as EventType),
        source: 'MANUAL',
        payload: dto.payload as Prisma.InputJsonValue,
        dedupeKey,
        occurredAt: new Date(),
      },
    });
  }
}
