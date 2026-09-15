export const QUEUE_NAMES = {
  CONNECTOR_INGEST: 'connector-ingest',
  RULES_EVALUATION: 'rules-evaluation',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
