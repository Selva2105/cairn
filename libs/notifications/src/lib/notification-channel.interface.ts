export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListRow[];
}

export interface InteractivePayload {
  type: 'button' | 'list';
  buttons?: InteractiveButton[];
  buttonText?: string;
  sections?: InteractiveListSection[];
}

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  interactive?: InteractivePayload;
}

export interface NotificationChannel {
  key: string;
  send(payload: NotificationPayload): Promise<void>;
}
