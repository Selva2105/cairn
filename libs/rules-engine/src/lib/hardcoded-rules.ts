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
  // If the event was emitted by the config-driven scanner (with reminderThreshold,
  // daysUntilExpiry, or isExpired), it has already qualified based on household preferences.
  if (
    event.payload.reminderThreshold !== undefined ||
    event.payload.daysUntilExpiry !== undefined ||
    event.payload.isExpired
  ) {
    return [
      {
        action: 'notify',
        channel: NOTIFICATION_CHANNELS.EMAIL,
        priority: 'high',
      },
    ];
  }

  // Fallback for ad-hoc or direct signals
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
  // If the event is a reminder or overdue alert from BillDueScannerService, notify immediately.
  if (event.payload.isReminder || event.payload.isOverdue) {
    return [
      {
        action: 'notify',
        channel: NOTIFICATION_CHANNELS.EMAIL,
        priority: 'high',
      },
    ];
  }

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
