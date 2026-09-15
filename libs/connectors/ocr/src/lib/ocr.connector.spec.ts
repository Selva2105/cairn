import { hashDedupeKey } from '@cairn/shared-utils';
import { describe, expect, it } from 'vitest';

import { OcrConnector } from './ocr.connector';

describe('OcrConnector.normalize', () => {
  it('normalizes recognized receipt text into a low-confidence BillDetected event', () => {
    const connector = new OcrConnector();
    const raw = {
      externalId: 'scan-1',
      raw: {
        text: 'Corner Grocery\n01/12/2026\nMilk 2.50\nBread 1.80\nTotal Rs. 4.30',
      },
    };

    const event = connector.normalize(raw);

    expect(event.type).toBe('BillDetected');
    expect(event.confidence).toBe('low');
    expect(event.dedupeKey).toBe(hashDedupeKey([connector.key, 'scan-1']));
    if (event.type === 'BillDetected') {
      expect(event.payload.vendor).toBe('Corner Grocery');
      expect(event.payload.amount).toBe(4.3);
      expect(event.payload.currency).toBe('INR');
    }
  });

  it('throws when no amount can be extracted from the scanned text', () => {
    const connector = new OcrConnector();
    const raw = {
      externalId: 'scan-2',
      raw: { text: 'a blurry unreadable scan' },
    };

    expect(() => connector.normalize(raw)).toThrow();
  });
});
