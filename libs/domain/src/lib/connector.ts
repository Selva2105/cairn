import type { DomainEvent } from './events';

export interface RawSignal {
  externalId: string;
  raw: unknown;
}

export interface ConnectorContext {
  householdId: string;
  credentials?: Record<string, unknown>;
  since?: Date;
}

export interface Connector {
  key: string; // 'gmail', 'calendar', ...
  schedule: 'cron' | 'webhook';
  fetch(context: ConnectorContext): Promise<RawSignal[]>;
  normalize(raw: RawSignal): DomainEvent;
}
