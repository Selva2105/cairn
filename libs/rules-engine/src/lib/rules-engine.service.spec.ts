import { describe, expect, it } from 'vitest';
import { EVENT_TYPES } from '@cairn/shared-constants';

import { RulesEngineService } from './rules-engine.service';
import type { RuleDefinition } from './dsl-types';

function billDetectedEvent(confidence?: 'high' | 'low') {
  return {
    id: 'evt-1',
    householdId: 'household-1',
    occurredAt: new Date().toISOString(),
    source: 'gmail',
    dedupeKey: 'dedupe-1',
    type: 'BillDetected',
    confidence,
    payload: {
      vendor: 'Acme Water',
      amount: 42,
      currency: 'USD',
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      isRecurring: false,
    },
  } as never;
}

describe('RulesEngineService', () => {
  const engine = new RulesEngineService();

  it('routes a low-confidence event to review instead of notifying', () => {
    const actions = engine.evaluate(billDetectedEvent('low'));
    expect(actions).toEqual([{ action: 'review' }]);
  });

  it('evaluates normally when confidence is high', () => {
    const actions = engine.evaluate(billDetectedEvent('high'));
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ action: 'notify' });
  });

  it('evaluates normally when confidence is absent (manual/authoritative sources)', () => {
    const actions = engine.evaluate(billDetectedEvent(undefined));
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ action: 'notify' });
  });

  it("the review gate overrides a household's own configured rules", () => {
    const configuredRules: RuleDefinition[] = [
      {
        id: 'rule-1',
        on: EVENT_TYPES.BILL_DETECTED,
        when: { daysUntil: { field: 'payload.dueDate', lte: 60 } },
        then: [{ action: 'notify', channel: 'email', priority: 'low' }],
      },
    ];
    const actions = engine.evaluate(billDetectedEvent('low'), configuredRules);
    expect(actions).toEqual([{ action: 'review' }]);
  });
});
