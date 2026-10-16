import { Prisma } from '@prisma/client';
import { InvalidApiInput } from './api';
import type { AnalyticsAmount, AnalyticsSummary } from '../contracts/api';

export function analyticsMonth(value: unknown): string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new InvalidApiInput('Use month YYYY-MM.');
  }
  return value;
}

/** The caller prefixes WITH. Bind all selectors; household membership is rechecked in SQL. */
export function analyticsGroupsQuery(householdId: string, subject: string, month: string, timezone: string, now: Date) {
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
      "costSource"::text AS provenance, "currencyCode", "totalCostMinor"
    FROM effective
    WHERE "newStatus"::text IN ('CONSUMED', 'WASTED', 'ASSUMED_CONSUMED')
      AND to_char("occurredAt" AT TIME ZONE ${timezone}, 'YYYY-MM') = ${month}
  )
  SELECT bucket, provenance, "currencyCode" AS currency,
    count(*)::text AS count, COALESCE(sum("totalCostMinor"), 0)::text AS amount
  FROM classified GROUP BY bucket, provenance, "currencyCode"`;
}

export interface AnalyticsGroup { bucket: string; provenance: string; currency: string; count: string; amount: string }
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
