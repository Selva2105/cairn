import { Injectable } from '@nestjs/common';
import type { DomainEvent } from '@cairn/domain';
import { toDomainEventType } from '@cairn/domain';
import { Prisma, PrismaService } from '@cairn/database';

const pendingEventWithHousehold =
  Prisma.validator<Prisma.EventLogDefaultArgs>()({
    include: {
      household: {
        include: {
          members: { include: { user: { select: { email: true } } } },
        },
      },
    },
  });

export type PendingEvent = Prisma.EventLogGetPayload<
  typeof pendingEventWithHousehold
>;

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PipelineEventsService {
  constructor(private readonly prisma: PrismaService) {}

  listActiveHouseholdIds(): Promise<string[]> {
    return this.prisma.household
      .findMany({ select: { id: true } })
      .then((rows) => rows.map((row) => row.id));
  }

  /**
   * Inserts the event, returning whether it was newly created. The EventLog.dedupeKey unique
   * constraint is the real guarantee (not just this check) -- a concurrent duplicate insert
   * fails with Prisma's P2002 and is treated as "already processed," per
   * CAIRN_DATABASE_ENGINEERING.md §6.
   */
  async persistIfNew(
    householdId: string,
    event: DomainEvent,
  ): Promise<boolean> {
    try {
      await this.prisma.eventLog.create({
        data: {
          householdId,
          type: toDomainEventType(event.type),
          source:
            event.source.toUpperCase() as Prisma.EventLogCreateInput['source'],
          payload: (event.confidence
            ? { ...event.payload, confidence: event.confidence }
            : event.payload) as Prisma.InputJsonValue,
          dedupeKey: event.dedupeKey,
          occurredAt: new Date(event.occurredAt),
        },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION
      ) {
        return false;
      }
      throw error;
    }
  }

  listPending(householdId?: string): Promise<PendingEvent[]> {
    return this.prisma.eventLog.findMany({
      where: { processedAt: null, ...(householdId ? { householdId } : {}) },
      ...pendingEventWithHousehold,
    });
  }

  markProcessed(eventId: string): Promise<unknown> {
    return this.prisma.eventLog.update({
      where: { id: eventId },
      data: { processedAt: new Date() },
    });
  }

  recordNotificationSent(
    householdId: string,
    eventId: string,
    channel: 'EMAIL' | 'WHATSAPP',
    payload: object,
  ): Promise<unknown> {
    return this.prisma.notification.create({
      data: {
        householdId,
        eventId,
        channel,
        status: 'SENT',
        payload: payload as Prisma.InputJsonValue,
        sentAt: new Date(),
      },
    });
  }

  recordNotificationFailed(
    householdId: string,
    eventId: string,
    channel: 'EMAIL' | 'WHATSAPP',
    payload: object,
    failReason: string,
  ): Promise<unknown> {
    return this.prisma.notification.create({
      data: {
        householdId,
        eventId,
        channel,
        status: 'FAILED',
        payload: payload as Prisma.InputJsonValue,
        failReason,
      },
    });
  }
}
