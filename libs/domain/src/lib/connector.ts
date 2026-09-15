import type { DomainEvent } from './events';

export type ConnectorKey = 'GMAIL' | 'CALENDAR' | 'MANUAL' | 'OCR' | 'WHATSAPP';

export interface RawSignal {
  externalId: string;
  raw: unknown;
}

export interface ConnectorContext {
  householdId: string;
  // Mirrors the DB-backed ConnectorConfig row (libs/database) without importing it directly --
  // libs/domain can't depend on the data-tier lib, so this shape is duplicated deliberately.
  enabled: boolean;
  credentials?: Record<string, unknown>;
  lastRunAt?: Date;
  since?: Date;
}

export interface Connector {
  key: ConnectorKey;
  schedule: 'cron' | 'webhook';
  fetch(context: ConnectorContext): Promise<RawSignal[]>;
  normalize(raw: RawSignal): DomainEvent;
}
