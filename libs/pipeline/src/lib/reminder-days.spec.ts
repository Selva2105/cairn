import { describe, expect, it } from 'vitest';

import { mergeReminderDays, ruleThresholds } from './reminder-days';

const rule = (lte: unknown) =>
  ({ when: { daysUntil: { field: 'payload.expiresOn', lte } } }) as never;

describe('mergeReminderDays', () => {
  it('adds a rule threshold larger than the configured days', () => {
    expect(mergeReminderDays([30, 14, 1], [60])).toEqual([60, 30, 14, 1]);
  });

  it('dedupes and sorts largest first', () => {
    expect(mergeReminderDays([1, 14, 30], [14, 7])).toEqual([30, 14, 7, 1]);
  });
});

describe('ruleThresholds', () => {
  it('reads lte from each rule and ignores malformed ones', () => {
    expect(
      ruleThresholds([rule(60), rule(0), rule('x'), rule(7.5), {} as never]),
    ).toEqual([60]);
  });

  it('caps absurd thresholds at a year', () => {
    expect(ruleThresholds([rule(9999)])).toEqual([365]);
  });
});
