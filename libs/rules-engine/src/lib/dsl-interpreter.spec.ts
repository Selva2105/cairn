import type { DomainEvent } from '@cairn/domain';
import { describe, expect, it } from 'vitest';

import { evaluateRule } from './dsl-interpreter';
import type { RuleDefinition } from './dsl-types';

const documentExpiringSoon: DomainEvent = {
  id: '1',
  householdId: 'h1',
  occurredAt: new Date().toISOString(),
  source: 'manual',
  dedupeKey: 'k1',
  type: 'DocumentExpiring',
  payload: {
    documentType: 'passport',
    expiresOn: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

const rule: RuleDefinition = {
  id: 'rule-doc-expiry-30d',
  on: 'DocumentExpiring',
  when: { daysUntil: { field: 'payload.expiresOn', lte: 30 } },
  then: [{ action: 'notify', channel: 'email', priority: 'high' }],
};

describe('evaluateRule', () => {
  it('fires when the field is within the threshold', () => {
    expect(evaluateRule(rule, documentExpiringSoon)).toEqual([
      { action: 'notify', channel: 'email', priority: 'high' },
    ]);
  });

  it('does not fire for a different event type', () => {
    expect(
      evaluateRule({ ...rule, on: 'BillDetected' }, documentExpiringSoon),
    ).toEqual([]);
  });

  it('does not fire once outside the threshold', () => {
    const farOut: DomainEvent = {
      ...documentExpiringSoon,
      payload: {
        ...documentExpiringSoon.payload,
        expiresOn: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    };
    expect(evaluateRule(rule, farOut)).toEqual([]);
  });

  it('does not throw on a malformed field path', () => {
    expect(
      evaluateRule(
        {
          ...rule,
          when: { daysUntil: { field: 'payload.doesNotExist', lte: 30 } },
        },
        documentExpiringSoon,
      ),
    ).toEqual([]);
  });
});
