export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationChannel {
  key: string;
  send(payload: NotificationPayload): Promise<void>;
}
