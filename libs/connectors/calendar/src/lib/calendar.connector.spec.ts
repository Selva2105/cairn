import { hashDedupeKey } from '@cairn/shared-utils';
import { describe, expect, it } from 'vitest';

import { CalendarConnector } from './calendar.connector';

describe('CalendarConnector.normalize', () => {
  it('normalizes a structured "asset - task" title as high confidence', () => {
    const connector = new CalendarConnector();
    const raw = {
      externalId: 'evt-1',
      raw: {
        id: 'evt-1',
        summary: 'Car - Annual service',
        start: { dateTime: '2026-11-01T09:00:00.000Z' },
      },
    };

    const event = connector.normalize(raw);

    expect(event.type).toBe('MaintenanceDue');
    expect(event.confidence).toBe('high');
    expect(event.dedupeKey).toBe(hashDedupeKey([connector.key, 'evt-1']));
    if (event.type === 'MaintenanceDue') {
      expect(event.payload.asset).toBe('Car');
      expect(event.payload.task).toBe('Annual service');
    }
  });

  it('normalizes an unstructured title as low confidence', () => {
    const connector = new CalendarConnector();
    const raw = {
      externalId: 'evt-2',
      raw: {
        id: 'evt-2',
        summary: 'Boiler service reminder',
        start: { date: '2026-11-05' },
      },
    };

    const event = connector.normalize(raw);
    expect(event.confidence).toBe('low');
  });

  it('throws when the title has no maintenance keyword', () => {
    const connector = new CalendarConnector();
    const raw = {
      externalId: 'evt-3',
      raw: {
        id: 'evt-3',
        summary: 'Lunch with Sam',
        start: { date: '2026-11-05' },
      },
    };

    expect(() => connector.normalize(raw)).toThrow();
  });
});
