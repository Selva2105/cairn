import { randomUUID } from 'node:crypto';

import type {
  Connector,
  ConnectorContext,
  DomainEvent,
  RawSignal,
} from '@cairn/domain';
import { hashDedupeKey } from '@cairn/shared-utils';

import { parseReceiptText } from './parse-receipt-text';

/**
 * Never polled -- a receipt photo is uploaded on demand from the dashboard, not fetched on a
 * schedule (and running OCR synchronously inside the daily pipeline-run endpoint risks the
 * ~60s free-tier function ceiling; ARCHITECTURE.md §18.6). normalize() stays pure (no I/O): the
 * caller runs OCR first (see ocr.service.ts's recognizeText, an async, I/O-bound step) and
 * passes the resulting plain text in as raw.raw.
 */
export class OcrConnector implements Connector {
  readonly key = 'OCR' as const;
  readonly schedule = 'webhook' as const;

  async fetch(_context: ConnectorContext): Promise<RawSignal[]> {
    return [];
  }

  normalize(raw: RawSignal): DomainEvent {
    const { text } = raw.raw as { text: string };
    const parsed = parseReceiptText(text);
    if (!parsed) {
      throw new Error(
        `Receipt scan ${raw.externalId} did not match the extraction heuristic`,
      );
    }

    const { confidence, ...payload } = parsed;

    return {
      id: randomUUID(),
      householdId: '',
      occurredAt: new Date().toISOString(),
      source: 'ocr',
      dedupeKey: hashDedupeKey([this.key, raw.externalId]),
      type: 'BillDetected',
      confidence,
      payload,
    } as DomainEvent;
  }
}
