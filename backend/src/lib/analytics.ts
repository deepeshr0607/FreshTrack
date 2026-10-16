import { Prisma } from '@prisma/client';
import { InvalidApiInput } from './api';
import type { AnalyticsAmount, AnalyticsSummary, AnalyticsSeries } from '../contracts/api';

export function analyticsMonth(value: unknown): string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new InvalidApiInput('Use month YYYY-MM.');
  }
  return value;
}

/** Bound the public range independently of query-string parsing. */
export function analyticsMonthCount(count: unknown): number {
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 2 || count > 12) throw new InvalidApiInput('Use 2 to 12 months.');
  return count;
}
/** Calendar arithmetic avoids local Date/DST rollover; require 2–12 month keys. */
export function analyticsMonths(month: string, count: number): string[] {
  analyticsMonth(month);
  analyticsMonthCount(count);
  const [year, number] = month.split('-').map(Number), last = (year - 1) * 12 + number - 1;
  if (last - count + 1 < 0) throw new InvalidApiInput('Month range precedes year 0001.');
  return Array.from({ length: count }, (_, index) => {
    const value = last - count + 1 + index;
    return `${String(Math.floor(value / 12) + 1).padStart(4, '0')}-${String(value % 12 + 1).padStart(2, '0')}`;
  });
}

/** The caller prefixes WITH. Bind all selectors; household membership is rechecked in SQL. */
export function analyticsGroupsQuery(householdId: string, subject: string, month: string | string[], timezone: string, now: Date) {
  const months = typeof month === 'string' ? [month] : month;
  return Prisma.sql`effective AS (
    SELECT DISTINCT ON (e."pantryItemId") e.*
    FROM "PantryItemEvent" e
    WHERE e."householdId" = ${householdId}::uuid AND e."occurredAt" <= ${now}
      AND e."eventType"::text IN ('STATUS_CHANGED', 'RESTORED')
      AND e."previousStatus"::text IS DISTINCT FROM e."newStatus"::text
      AND EXISTS (SELECT 1 FROM "HouseholdMember" m WHERE m."householdId" = e."householdId" AND m."authSubject" = ${subject})
    ORDER BY e."pantryItemId", e."occurredAt" DESC, e.id DESC
  ), classified AS (
    SELECT CASE
      WHEN "newStatus"::text = 'ASSUMED_CONSUMED' OR source::text = 'SYSTEM' THEN 'unconfirmed'
      WHEN "newStatus"::text = 'WASTED' THEN 'wasted'
      WHEN ("occurredAt" AT TIME ZONE timezone)::date <= "expiresOn" THEN 'consumedBeforeOrOnExpiry'
      ELSE 'consumedAfterExpiry' END AS bucket,
      "costSource"::text AS provenance, "currencyCode", "totalCostMinor",
      to_char("occurredAt" AT TIME ZONE ${timezone}, 'YYYY-MM') AS month
    FROM effective
    WHERE "newStatus"::text IN ('CONSUMED', 'WASTED', 'ASSUMED_CONSUMED')
      AND to_char("occurredAt" AT TIME ZONE ${timezone}, 'YYYY-MM') BETWEEN ${months[0]} AND ${months[months.length - 1]}
  )
  SELECT month, bucket, provenance, "currencyCode" AS currency,
    count(*)::text AS count, COALESCE(sum("totalCostMinor"), 0)::text AS amount
  FROM classified GROUP BY month, bucket, provenance, "currencyCode"`;
}

export interface AnalyticsGroup { month?: string; bucket: string; provenance: string; currency: string; count: string; amount: string }
const amount = (): AnalyticsAmount => ({ count: 0, purchaseCount: 0, purchaseCostMinor: '0', estimatedCount: 0, estimatedCostMinor: '0', unknownCount: 0 });
/** SQL bigint totals travel as decimal strings, never rounded through floating point. */
export function analyticsSummary(groups: AnalyticsGroup[], month: string, timezone: string, asOf: string): AnalyticsSummary {
  const totals = { wasted: amount(), consumedBeforeOrOnExpiry: amount(), consumedAfterExpiry: amount(), unconfirmed: amount() };
  for (const group of groups) {
    if (!Object.hasOwn(totals, group.bucket) || group.currency !== 'INR' || !['PURCHASE', 'ESTIMATE', 'UNKNOWN'].includes(group.provenance)
      || !/^[1-9]\d*$/.test(group.count) || !/^(0|[1-9]\d*)$/.test(group.amount) || !Number.isSafeInteger(Number(group.count))
      || group.provenance === 'UNKNOWN' && group.amount !== '0') throw new Error('INVALID_ANALYTICS_GROUP');
    const target = totals[group.bucket as keyof typeof totals], count = Number(group.count);
    target.count += count;
    if (!Number.isSafeInteger(target.count)) throw new Error('ANALYTICS_COUNT_LIMIT');
    if (group.provenance === 'UNKNOWN') target.unknownCount += count;
    else if (group.provenance === 'PURCHASE') { target.purchaseCount += count; target.purchaseCostMinor = String(BigInt(target.purchaseCostMinor) + BigInt(group.amount)); }
    else { target.estimatedCount += count; target.estimatedCostMinor = String(BigInt(target.estimatedCostMinor) + BigInt(group.amount)); }
  }
  return { month, timezone, currencyCode: 'INR', asOf, basis: 'LATEST_EFFECTIVE_OUTCOME', ...totals };
}

export function analyticsSeries(groups: AnalyticsGroup[], months: string[], timezone: string, asOf: string, currentMonth: string): AnalyticsSeries {
  if (groups.some(row => !row.month || !months.includes(row.month))) throw new Error('INVALID_ANALYTICS_MONTH_GROUP');
  const points = months.map(month => ({ ...analyticsSummary(groups.filter(row => row.month === month), month, timezone, asOf),
    period: month < currentMonth ? 'COMPLETE' as const : month === currentMonth ? 'MONTH_TO_DATE' as const : 'FUTURE' as const }));
  const selected = points[points.length - 1], previous = points[points.length - 2];
  const future = selected.period === 'FUTURE';
  const consumed = (row: AnalyticsSummary) => BigInt(row.consumedBeforeOrOnExpiry.purchaseCostMinor) + BigInt(row.consumedAfterExpiry.purchaseCostMinor);
  return { month: selected.month, previousMonth: previous.month, timezone, currencyCode: 'INR', asOf, months: points,
    comparison: { basis: 'PURCHASE_VALUES_ONLY', period: future ? 'FUTURE_PERIOD' : selected.period === 'MONTH_TO_DATE' ? 'MONTH_TO_DATE' : 'COMPLETE_PERIODS',
      wastedPurchaseDeltaMinor: future ? null : String(BigInt(selected.wasted.purchaseCostMinor) - BigInt(previous.wasted.purchaseCostMinor)),
      consumedPurchaseDeltaMinor: future ? null : String(consumed(selected) - consumed(previous)) } };
}
