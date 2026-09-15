export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  PUSH: 'push',
  DASHBOARD: 'dashboard',
} as const;

export type NotificationChannelName =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];
