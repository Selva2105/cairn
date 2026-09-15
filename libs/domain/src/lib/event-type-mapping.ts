import { EVENT_TYPES, type EventType } from '@cairn/shared-constants';

/**
 * `libs/shared/constants`'s EVENT_TYPES uses PascalCase string values to match the wire
 * event contract (e.g. 'BillDetected'), while the Prisma `DomainEventType` enum is
 * SCREAMING_SNAKE_CASE by DB convention. This is the deliberate translation between the
 * two -- see ADR 0006 and ARCHITECTURE.md §6.
 */
export type PrismaDomainEventType =
  'BILL_DETECTED' | 'DOCUMENT_EXPIRING' | 'MAINTENANCE_DUE' | 'TASK_EXTRACTED';

const EVENT_TYPE_TO_PRISMA: Record<EventType, PrismaDomainEventType> = {
  [EVENT_TYPES.BILL_DETECTED]: 'BILL_DETECTED',
  [EVENT_TYPES.DOCUMENT_EXPIRING]: 'DOCUMENT_EXPIRING',
  [EVENT_TYPES.MAINTENANCE_DUE]: 'MAINTENANCE_DUE',
  [EVENT_TYPES.TASK_EXTRACTED]: 'TASK_EXTRACTED',
};

const PRISMA_TO_EVENT_TYPE: Record<PrismaDomainEventType, EventType> = {
  BILL_DETECTED: EVENT_TYPES.BILL_DETECTED,
  DOCUMENT_EXPIRING: EVENT_TYPES.DOCUMENT_EXPIRING,
  MAINTENANCE_DUE: EVENT_TYPES.MAINTENANCE_DUE,
  TASK_EXTRACTED: EVENT_TYPES.TASK_EXTRACTED,
};

export function toDomainEventType(eventType: EventType): PrismaDomainEventType {
  return EVENT_TYPE_TO_PRISMA[eventType];
}

export function fromPrismaEventType(
  prismaEventType: PrismaDomainEventType,
): EventType {
  return PRISMA_TO_EVENT_TYPE[prismaEventType];
}
