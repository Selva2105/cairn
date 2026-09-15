import type {
  BillDetected,
  DocumentExpiring,
  MaintenanceDue,
  TaskExtracted,
} from '@cairn/domain';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';
import { isWithinDays } from '@cairn/shared-utils';

import type { RuleAction } from './types';

const DOCUMENT_EXPIRY_WARNING_DAYS = 30;
const BILL_DUE_SOON_DAYS = 7;

export function evaluateDocumentExpiring(
  event: DocumentExpiring,
): RuleAction[] {
  if (
    isWithinDays(
      new Date(event.payload.expiresOn),
      DOCUMENT_EXPIRY_WARNING_DAYS,
    )
  ) {
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
