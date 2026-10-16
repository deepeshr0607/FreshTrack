import { Prisma, ItemCategory } from '@prisma/client';
import type { AnalyticsSeries, AnalyticsUsedItem } from '../contracts/api';
import { analyticsEffectiveQuery } from './analytics';
import { calendarDate, householdDate, utcTimestamp } from './inventoryRules';
import { minorAmount } from './serialization';

export function analyticsUsedQuery(householdId: string, subject: string, month: string, timezone: string, now: Date) {
  return Prisma.sql`${analyticsEffectiveQuery(householdId, subject, now)}
    SELECT e.id::text AS "eventId", e."pantryItemId"::text AS "pantryItemId", p.name,
      e.category::text AS category, e."totalCostMinor"::text AS "totalCostMinor",
      e."costSource"::text AS "costSource", e."currencyCode",
      to_char(e."occurredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "occurredAt",
      e."expiresOn"::text AS "expiresOn", e.timezone AS "outcomeTimezone",
      (p."archivedAt" IS NULL)::text AS reviewable
    FROM effective e JOIN "PantryItem" p ON p.id = e."pantryItemId" AND p."householdId" = e."householdId"
    WHERE e."newStatus"::text = 'CONSUMED' AND e.source::text <> 'SYSTEM'
      AND (e."occurredAt" AT TIME ZONE e.timezone)::date <= e."expiresOn"
      AND to_char(e."occurredAt" AT TIME ZONE ${timezone}, 'YYYY-MM') = ${month}
    ORDER BY e."occurredAt" DESC, e.id DESC LIMIT 20`;
}
export interface AnalyticsUsedRow {
  eventId: string; pantryItemId: string; name: string; category: string; totalCostMinor: string | null;
  costSource: string; currencyCode: string; occurredAt: string; expiresOn: string; outcomeTimezone: string; reviewable: string;
}
/** Names are current; financial/category/expiry fields are immutable event snapshots. */
export function withAnalyticsUsedRows(data: Omit<AnalyticsSeries, 'usedBeforeExpiry'>, rows: AnalyticsUsedRow[]): AnalyticsSeries {
  const total = data.months[data.months.length - 1].consumedBeforeOrOnExpiry.count;
  if (rows.length !== Math.min(total, 20)) throw Error('INCOMPLETE_ANALYTICS_ENTRIES');
  const ids = new Set<string>(), items = new Set<string>();
  const uuid = (value: string) => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
  const entries = rows.map((row): AnalyticsUsedItem => {
    if (!uuid(row.eventId) || !uuid(row.pantryItemId) || ids.has(row.eventId.toLowerCase()) || items.has(row.pantryItemId.toLowerCase())
      || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 200 || /[\u0000-\u001f\u007f]/.test(row.name)
      || !Object.values(ItemCategory).includes(row.category as ItemCategory) || row.currencyCode !== 'INR'
      || !['PURCHASE', 'ESTIMATE', 'UNKNOWN'].includes(row.costSource) || !['true', 'false'].includes(row.reviewable)) throw Error('INVALID_ANALYTICS_ENTRY');
    ids.add(row.eventId.toLowerCase()); items.add(row.pantryItemId.toLowerCase());
    const occurredAt = utcTimestamp(new Date(row.occurredAt)), expiresOn = calendarDate(row.expiresOn);
    if (occurredAt !== row.occurredAt || occurredAt > data.asOf || householdDate(new Date(occurredAt), data.timezone).slice(0, 7) !== data.month
      || householdDate(new Date(occurredAt), row.outcomeTimezone) > expiresOn) throw Error('INVALID_ANALYTICS_ENTRY_DATE');
    if (row.totalCostMinor !== null && !/^(0|[1-9]\d{0,9})$/.test(row.totalCostMinor)) throw Error('INVALID_ANALYTICS_ENTRY_COST');
    const totalCostMinor = minorAmount(row.totalCostMinor === null ? null : Number(row.totalCostMinor));
    if ((row.costSource === 'UNKNOWN') !== (totalCostMinor === null)) throw Error('INVALID_ANALYTICS_ENTRY_COST');
    return { ...row, category: row.category as ItemCategory, costSource: row.costSource as AnalyticsUsedItem['costSource'], currencyCode: 'INR',
      occurredAt, expiresOn, totalCostMinor, reviewable: row.reviewable === 'true' };
  });
  for (const category of data.categories) {
    const selected = entries.filter(row => row.category === category.category), expected = category.consumedBeforeOrOnExpiry;
    const actual = { count: selected.length, purchaseCount: selected.filter(row => row.costSource === 'PURCHASE').length,
      estimatedCount: selected.filter(row => row.costSource === 'ESTIMATE').length, unknownCount: selected.filter(row => row.costSource === 'UNKNOWN').length };
    for (const key of ['count', 'purchaseCount', 'estimatedCount', 'unknownCount'] as const) {
      if (total <= 20 ? actual[key] !== expected[key] : actual[key] > expected[key]) throw Error('INCONSISTENT_ANALYTICS_ENTRIES');
    }
    for (const [source, key] of [['PURCHASE', 'purchaseCostMinor'], ['ESTIMATE', 'estimatedCostMinor']] as const) {
      const actual = selected.filter(row => row.costSource === source).reduce((sum, row) => sum + BigInt(row.totalCostMinor!), 0n), target = BigInt(expected[key]);
      if (total <= 20 ? actual !== target : actual > target) throw Error('INCONSISTENT_ANALYTICS_ENTRIES');
    }
  }
  return { ...data, usedBeforeExpiry: { total, nameBasis: 'CURRENT_PANTRY_NAME', items: entries } };
}
