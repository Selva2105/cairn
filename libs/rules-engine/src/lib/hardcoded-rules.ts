import type {
  BillDetected,
  DocumentExpiring,
  MaintenanceDue,
  TaskExtracted,
} from '@cairn/domain';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';
import { daysUntil, isWithinDays } from '@cairn/shared-utils';

import type { RuleAction } from './types';

const DOCUMENT_EXPIRY_WARNING_DAYS = 30;
const BILL_DUE_SOON_DAYS = 7;

export function evaluateDocumentExpiring(
  event: DocumentExpiring,
): RuleAction[] {
  // Unlike isWithinDays (upcoming-only, used below for bills/maintenance), a document that has
  // already passed its expiresOn must still notify -- "your passport expired" is the whole
  // point, not something to silently drop once the date's in the past.
  const remaining = daysUntil(new Date(event.payload.expiresOn));
  if (remaining <= DOCUMENT_EXPIRY_WARNING_DAYS) {
    return [
      {
        action: 'notify',
        channel: NOTIFICATION_CHANNELS.EMAIL,
        priority: 'high',
      },
    ];
  }
  return [];
}

export function evaluateBillDetected(event: BillDetected): RuleAction[] {
  const priority = isWithinDays(
    new Date(event.payload.dueDate),
    BILL_DUE_SOON_DAYS,
  )
    ? 'high'
    : 'normal';
  return [{ action: 'notify', channel: NOTIFICATION_CHANNELS.EMAIL, priority }];
}

export function evaluateMaintenanceDue(event: MaintenanceDue): RuleAction[] {
  if (
    isWithinDays(new Date(event.payload.dueOn), DOCUMENT_EXPIRY_WARNING_DAYS)
  ) {
    return [
      {
        action: 'notify',
        channel: NOTIFICATION_CHANNELS.EMAIL,
        priority: 'normal',
      },
    ];
  }
  return [];
}

export function evaluateTaskExtracted(_event: TaskExtracted): RuleAction[] {
  return [
    {
      action: 'notify',
      channel: NOTIFICATION_CHANNELS.DASHBOARD,
      priority: 'low',
    },
  ];
}
