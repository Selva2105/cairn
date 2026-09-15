import type { DomainEvent } from '@cairn/domain';
import { daysUntil } from '@cairn/shared-utils';

import type { RuleDefinition } from './dsl-types';
import type { RuleAction } from './types';

/**
 * Evaluates one v2 declarative rule against an event, returning the actions it fires (or an
 * empty array if the rule doesn't apply or its condition isn't met). Never throws on
 * malformed input -- a bad rule a household author wrote shouldn't take down the whole digest
 * run, it just doesn't fire.
 */
export function evaluateRule(
  rule: RuleDefinition,
  event: DomainEvent,
): RuleAction[] {
  if (rule.on !== event.type) {
    return [];
  }

  const fieldValue = getByPath(event, rule.when.daysUntil.field);
  if (typeof fieldValue !== 'string') {
    return [];
  }

  const targetDate = new Date(fieldValue);
  if (Number.isNaN(targetDate.getTime())) {
    return [];
  }

  const remaining = daysUntil(targetDate);
  const { lte, gte } = rule.when.daysUntil;
  if (lte !== undefined && remaining > lte) {
    return [];
  }
  if (gte !== undefined && remaining < gte) {
    return [];
  }

  return rule.then.map((action) => ({ ...action }));
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
