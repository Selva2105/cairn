import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EVENT_TYPES } from '@cairn/shared-constants';
import { hashDedupeKey } from '@cairn/shared-utils';
import { describe, expect, it } from 'vitest';

import { GmailConnector } from './gmail.connector';

const sampleBillEmail = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__/bill-email.json'), 'utf-8'),
);

describe('GmailConnector.normalize', () => {
  it('normalizes a labelled bill email into a high-confidence BillDetected event', () => {
    const connector = new GmailConnector();

    const event = connector.normalize(sampleBillEmail);

    expect(event.type).toBe(EVENT_TYPES.BILL_DETECTED);
    expect(event.confidence).toBe('high');
    expect(event.dedupeKey).toBe(
      hashDedupeKey([connector.key, sampleBillEmail.externalId]),
    );
    if (event.type === EVENT_TYPES.BILL_DETECTED) {
      expect(event.payload.vendor).toBe('Acme Electricity');
      expect(event.payload.amount).toBe(1250);
      expect(event.payload.currency).toBe('INR');
      expect(event.payload.isRecurring).toBe(false);
    }
  });

  it('throws when the email does not match the bill-detection heuristic', () => {
    const connector = new GmailConnector();
    const noise = {
      externalId: 'not-a-bill',
      raw: {
        id: 'not-a-bill',
        snippet: 'Hey, want to grab lunch?',
        payload: { headers: [], body: {} },
      },
    };

    expect(() => connector.normalize(noise)).toThrow();
  });
});
