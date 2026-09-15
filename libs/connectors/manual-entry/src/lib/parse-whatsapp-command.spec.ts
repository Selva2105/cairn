import { EVENT_TYPES } from '@cairn/shared-constants';
import { describe, expect, it } from 'vitest';

import { parseWhatsAppCommand } from './parse-whatsapp-command';

describe('parseWhatsAppCommand', () => {
  it('parses a bill command', () => {
    const result = parseWhatsAppCommand('bill Electricity 1200 15-Oct-2026');
    expect(result?.type).toBe(EVENT_TYPES.BILL_DETECTED);
    expect(result?.payload).toMatchObject({
      vendor: 'Electricity',
      amount: 1200,
      currency: 'INR',
    });
  });

  it('parses a multi-word vendor', () => {
    const result = parseWhatsAppCommand('bill City Power Co 850 01-Nov-2026');
    expect(result?.payload).toMatchObject({
      vendor: 'City Power Co',
      amount: 850,
    });
  });

  it('parses a doc command', () => {
    const result = parseWhatsAppCommand('doc passport 2027-03-01');
    expect(result?.type).toBe(EVENT_TYPES.DOCUMENT_EXPIRING);
    expect(result?.payload).toMatchObject({ documentType: 'passport' });
  });

  it('parses a task command', () => {
    const result = parseWhatsAppCommand('task Fix the leaking tap');
    expect(result?.type).toBe(EVENT_TYPES.TASK_EXTRACTED);
    expect(result?.payload).toMatchObject({
      description: 'Fix the leaking tap',
    });
  });

  it('returns null for unrecognized text', () => {
    expect(parseWhatsAppCommand('hello there')).toBeNull();
  });
});
