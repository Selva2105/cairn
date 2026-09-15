import { Injectable, Logger } from '@nestjs/common';
import { fromPrismaEventType } from '@cairn/domain';
import type { DomainEvent, PrismaDomainEventType } from '@cairn/domain';
import { Prisma, PrismaService } from '@cairn/database';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';
import { NotificationDispatchService } from '@cairn/notifications';
import { RulesEngineService } from '@cairn/rules-engine';

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

type PendingEvent = Prisma.EventLogGetPayload<typeof pendingEventWithHousehold>;

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: RulesEngineService,
    private readonly notificationDispatch: NotificationDispatchService,
  ) {}

  async runOnce(
    householdId?: string,
  ): Promise<{ processed: number; notified: number }> {
    const pendingEvents = await this.prisma.eventLog.findMany({
      where: { processedAt: null, ...(householdId ? { householdId } : {}) },
      ...pendingEventWithHousehold,
    });

    let notified = 0;

    for (const row of pendingEvents) {
      notified += await this.processEvent(row);
    }

    return { processed: pendingEvents.length, notified };
  }

  private async processEvent(row: PendingEvent): Promise<number> {
    const domainEvent = toDomainEvent(row);
    const actions = this.rulesEngine.evaluate(domainEvent);
    let notified = 0;

    for (const action of actions) {
      if (action.channel !== NOTIFICATION_CHANNELS.EMAIL) {
        continue;
      }

      for (const member of row.household.members) {
        await this.sendAndRecord(row, member.user.email);
        notified += 1;
      }
    }

    await this.prisma.eventLog.update({
      where: { id: row.id },
      data: { processedAt: new Date() },
    });
    return notified;
  }

  private async sendAndRecord(row: PendingEvent, to: string): Promise<void> {
    const subject = `Cairn: ${row.type.replace(/_/g, ' ').toLowerCase()}`;
    const body = `<p>${JSON.stringify(row.payload)}</p>`;

    try {
      await this.notificationDispatch.dispatch(NOTIFICATION_CHANNELS.EMAIL, {
        to,
        subject,
        body,
      });
      await this.prisma.notification.create({
        data: {
          householdId: row.householdId,
          eventId: row.id,
          channel: 'EMAIL',
          status: 'SENT',
          payload: row.payload ?? {},
          sentAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send notification for event ${row.id}`,
        error as Error,
      );
      await this.prisma.notification.create({
        data: {
          householdId: row.householdId,
          eventId: row.id,
          channel: 'EMAIL',
          status: 'FAILED',
          payload: row.payload ?? {},
          failReason: (error as Error).message,
        },
      });
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
