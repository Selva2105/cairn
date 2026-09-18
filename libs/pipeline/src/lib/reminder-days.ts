import type { RuleDefinition } from '@cairn/rules-engine';

const MAX_REMINDER_DAYS = 365;

/** The `daysUntil.lte` thresholds of a household's active rules -- the "start alerting N days
 * before" values, which must also become scan windows or the rule can never fire that early. */
export function ruleThresholds(rules: RuleDefinition[]): number[] {
  const thresholds: number[] = [];
  for (const rule of rules) {
    const lte = rule.when?.daysUntil?.lte;
    if (typeof lte === 'number' && Number.isInteger(lte) && lte > 0) {
      thresholds.push(Math.min(lte, MAX_REMINDER_DAYS));
    }
  }
  return thresholds;
}

/** Union of the household's preferred reminder days and its rules' thresholds, largest first. */
export function mergeReminderDays(
  configured: number[],
  fromRules: number[],
): number[] {
  return [...new Set([...configured, ...fromRules])]
    .filter((days) => days > 0)
    .sort((a, b) => b - a);
}
