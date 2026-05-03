/**
 * Business-day arithmetic for SLA deadlines (e.g. the 3-day rule to upload
 * a propuesta after the levantamiento is scheduled).
 *
 * "Business day" here = Mon–Fri. Holidays are NOT considered — if Innovative
 * needs holiday-awareness later, swap this module or pass a holiday list in.
 *
 * All helpers treat the input date as a specific instant. They do NOT
 * normalize to local midnight; callers decide whether they want
 * start-of-day or end-of-day semantics.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Returns a new Date that is `days` business days after `start`.
 * The returned date sits at the end of the business day (23:59:59.999)
 * so SLA comparisons `deadline < now` behave correctly.
 */
export function addBusinessDays(start: Date | string, days: number): Date {
  const result = new Date(start);
  result.setHours(23, 59, 59, 999);
  if (days <= 0) return result;
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added++;
  }
  return result;
}

/**
 * Number of business days between `from` and `to`.
 * Positive when `to` is after `from`. Counts calendar weekends as 0.
 */
export function businessDaysBetween(from: Date | string, to: Date | string): number {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const sign = b.getTime() >= a.getTime() ? 1 : -1;
  const start = sign > 0 ? a : b;
  const end = sign > 0 ? b : a;
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() < end.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekend(cursor)) count++;
  }
  return sign * count;
}
