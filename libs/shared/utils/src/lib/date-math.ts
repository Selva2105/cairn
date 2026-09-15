const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(date: Date, from: Date = new Date()): number {
  return Math.ceil((date.getTime() - from.getTime()) / MS_PER_DAY);
}

export function isWithinDays(
  date: Date,
  days: number,
  from: Date = new Date(),
): boolean {
  const remaining = daysUntil(date, from);
  return remaining >= 0 && remaining <= days;
}
