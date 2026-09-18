import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { toDomainEventType } from '@cairn/domain';
import { Prisma, PrismaService, type EventLog } from '@cairn/database';
import {
  PipelineEventsService,
  PipelineService,
  type PendingEvent,
  type PipelineRunSummary,
} from '@cairn/pipeline';
import type { EventType } from '@cairn/shared-constants';
import { hashDedupeKey } from '@cairn/shared-utils';

import { CreateManualEventDto } from './dto/create-manual-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineEvents: PipelineEventsService,
    private readonly pipeline: PipelineService,
  ) {}

  list(householdId: string): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: { householdId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * Low-confidence events a fuzzy connector flagged, awaiting approve/dismiss --
   * see RulesEngineService.evaluate's confidence gate.
   */
  listNeedingReview(householdId: string): Promise<PendingEvent[]> {
    return this.pipelineEvents.listNeedingReview(householdId);
  }

  async approveReview(
    householdId: string,
    eventId: string,
  ): Promise<PipelineRunSummary> {
    const summary = await this.pipeline.approveReviewEvent(
      householdId,
      eventId,
    );
    if (!summary) {
      throw new NotFoundException('Event is not pending review');
    }
    return summary;
  }

  async dismissReview(householdId: string, eventId: string): Promise<void> {
    const dismissed = await this.pipeline.dismissReviewEvent(
      householdId,
      eventId,
    );
    if (!dismissed) {
      throw new NotFoundException('Event is not pending review');
    }
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
