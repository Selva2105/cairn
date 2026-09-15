export const EVENT_TYPES = {
  BILL_DETECTED: 'BillDetected',
  DOCUMENT_EXPIRING: 'DocumentExpiring',
  MAINTENANCE_DUE: 'MaintenanceDue',
  TASK_EXTRACTED: 'TaskExtracted',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
