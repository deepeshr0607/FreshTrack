import type { AnalyticsAmount, AnalyticsSummary, AnalyticsSeries } from '../types/api';
export function validMonth(value: string) { return /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value); }
export function shiftAnalyticsMonth(month: string, offset: number): string | null {
  if (!validMonth(month) || !Number.isInteger(offset)) return null;
  const [year, number] = month.split('-').map(Number), value = (year - 1) * 12 + number - 1 + offset;
  return value < 0 || value >= 9999 * 12 ? null : `${String(Math.floor(value / 12) + 1).padStart(4, '0')}-${String(value % 12 + 1).padStart(2, '0')}`;
}
export function formatAnalyticsMoney(minor: string): string {
  if (!/^-?(0|[1-9]\d{0,24})$/.test(minor)) throw Error('INVALID_ANALYTICS_MONEY');
  const value = BigInt(minor), absolute = value < 0n ? -value : value;
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value < 0n ? '−' : ''}₹${whole}.${String(absolute % 100n).padStart(2, '0')}`;
}
export function consumedAmount(row: AnalyticsSummary): AnalyticsAmount {
  const a = row.consumedBeforeOrOnExpiry, b = row.consumedAfterExpiry;
  return { count: a.count + b.count, purchaseCount: a.purchaseCount + b.purchaseCount,
    purchaseCostMinor: String(BigInt(a.purchaseCostMinor) + BigInt(b.purchaseCostMinor)), estimatedCount: a.estimatedCount + b.estimatedCount,
    estimatedCostMinor: String(BigInt(a.estimatedCostMinor) + BigInt(b.estimatedCostMinor)), unknownCount: a.unknownCount + b.unknownCount };
}
export const analyticsPeriodLabel = (period: string) => period === 'MONTH_TO_DATE' ? 'Month to date' : period === 'FUTURE' ? 'Future month · no comparison' : 'Complete calendar month';
export function analyticsReport(data: AnalyticsSeries): string {
  const row = data.months[data.months.length - 1], consumed = consumedAmount(row);
  return `FreshTrack — ${row.month} household report\nTimezone: ${data.timezone}\n${analyticsPeriodLabel(row.period)}\nAs of: ${data.asOf}\nConsumed recorded purchase value: ${formatAnalyticsMoney(consumed.purchaseCostMinor)} (${consumed.purchaseCount} entries)\nConfirmed waste recorded purchase value: ${formatAnalyticsMoney(row.wasted.purchaseCostMinor)} (${row.wasted.purchaseCount} entries)\nEstimated consumed/waste values: ${formatAnalyticsMoney(consumed.estimatedCostMinor)} / ${formatAnalyticsMoney(row.wasted.estimatedCostMinor)}\nUnknown-price consumed/wasted entries: ${consumed.unknownCount} / ${row.wasted.unknownCount}\nUnconfirmed outcomes excluded: ${row.unconfirmed.count}\nPurchase waste change vs ${data.previousMonth}: ${data.comparison.wastedPurchaseDeltaMinor === null ? 'Unavailable for future month' : formatAnalyticsMoney(data.comparison.wastedPurchaseDeltaMinor)}\nCurrent-month comparisons use month-to-date totals against the previous calendar month.\nLatest effective outcomes; Undo can revise earlier months. Consumed value is not a savings or carbon estimate.`;
}
/** Exact values remain strings; only relative drawing heights use a bounded 0..100 ratio. */
export function analyticsBarPercent(value: string, maximum: string): number {
  const max = BigInt(maximum);
  return max === 0n ? 0 : Number(BigInt(value) * 10000n / max) / 100;
}
