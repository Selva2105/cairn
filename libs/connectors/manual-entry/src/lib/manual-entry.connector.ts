import { randomUUID } from 'node:crypto';

import type {
  Connector,
  ConnectorContext,
  DomainEvent,
  RawSignal,
} from '@cairn/domain';
import { hashDedupeKey } from '@cairn/shared-utils';

import type { ParsedCommand } from './parse-whatsapp-command';

/**
 * Never polled -- both inbound paths (a structured dashboard form submission, or a parsed
 * WhatsApp command) call normalize() directly with an already-structured ParsedCommand.
 * See CAIRN_CONNECTORS_ENGINEERING.md §5.
 */
export class ManualEntryConnector implements Connector {
  readonly key = 'MANUAL' as const;
  readonly schedule = 'webhook' as const;

  async fetch(_context: ConnectorContext): Promise<RawSignal[]> {
    return [];
  }

  normalize(raw: RawSignal): DomainEvent {
    const command = raw.raw as ParsedCommand;

    return {
      id: randomUUID(),
      householdId: '',
      occurredAt: new Date().toISOString(),
      source: 'manual',
      dedupeKey: hashDedupeKey([this.key, raw.externalId]),
      type: command.type,
      payload: command.payload,
    } as DomainEvent;
  }
}
