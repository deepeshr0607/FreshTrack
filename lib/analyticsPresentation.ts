import type { AnalyticsAmount, AnalyticsSummary, AnalyticsSeries, PantryCategory } from '../types/api';
export const ANALYTICS_CATEGORIES: { code: PantryCategory; name: string; emoji: string }[] = [
  { code: 'PRODUCE', name: 'Produce', emoji: '🥬' }, { code: 'DAIRY', name: 'Dairy', emoji: '🥛' },
  { code: 'BAKERY', name: 'Bakery', emoji: '🍞' }, { code: 'SNACKS', name: 'Snacks', emoji: '🥨' },
  { code: 'MEAT', name: 'Meat', emoji: '🥩' }, { code: 'FROZEN', name: 'Frozen', emoji: '🧊' }, { code: 'OTHER', name: 'Other', emoji: '🛒' },
];
export function validMonth(value: string) { return /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value); }
export function analyticsCalendarDate(instant: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(row => row.type === type)!.value;
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}
export function analyticsUsedPrice(item: { costSource: string; totalCostMinor: number | null }): string {
  return item.costSource === 'UNKNOWN' ? 'Unknown price' : `${item.costSource === 'ESTIMATE' ? 'Estimated ' : 'Recorded '}${formatAnalyticsMoney(String(item.totalCostMinor))}`;
}
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
export function consumedAmount(row: Pick<AnalyticsSummary, 'consumedBeforeOrOnExpiry' | 'consumedAfterExpiry'>): AnalyticsAmount {
  const a = row.consumedBeforeOrOnExpiry, b = row.consumedAfterExpiry;
  return { count: a.count + b.count, purchaseCount: a.purchaseCount + b.purchaseCount,
    purchaseCostMinor: String(BigInt(a.purchaseCostMinor) + BigInt(b.purchaseCostMinor)), estimatedCount: a.estimatedCount + b.estimatedCount,
    estimatedCostMinor: String(BigInt(a.estimatedCostMinor) + BigInt(b.estimatedCostMinor)), unknownCount: a.unknownCount + b.unknownCount };
}
export const analyticsPeriodLabel = (period: string) => period === 'MONTH_TO_DATE' ? 'Month to date' : period === 'FUTURE' ? 'Future month · no comparison' : 'Complete calendar month';
export function analyticsReport(data: AnalyticsSeries): string {
  const row = data.months[data.months.length - 1], consumed = consumedAmount(row);
  const report = `FreshTrack — ${row.month} household report\nTimezone: ${data.timezone}\n${analyticsPeriodLabel(row.period)}\nAs of: ${data.asOf}\nConsumed recorded purchase value: ${formatAnalyticsMoney(consumed.purchaseCostMinor)} (${consumed.purchaseCount} entries)\nConfirmed waste recorded purchase value: ${formatAnalyticsMoney(row.wasted.purchaseCostMinor)} (${row.wasted.purchaseCount} entries)\nEstimated consumed/waste values: ${formatAnalyticsMoney(consumed.estimatedCostMinor)} / ${formatAnalyticsMoney(row.wasted.estimatedCostMinor)}\nUnknown-price consumed/wasted entries: ${consumed.unknownCount} / ${row.wasted.unknownCount}\nUnconfirmed outcomes excluded: ${row.unconfirmed.count}\nPurchase waste change vs ${data.previousMonth}: ${data.comparison.wastedPurchaseDeltaMinor === null ? 'Unavailable for future month' : formatAnalyticsMoney(data.comparison.wastedPurchaseDeltaMinor)}\nCurrent-month comparisons use month-to-date totals against the previous calendar month.\nLatest effective outcomes; Undo can revise earlier months. Consumed value is not a savings or carbon estimate.`;
  const categories = data.categories.map(category => {
    const used = consumedAmount(category);
    return `${ANALYTICS_CATEGORIES.find(row => row.code === category.category)!.name}: consumed ${formatAnalyticsMoney(used.purchaseCostMinor)}, wasted ${formatAnalyticsMoney(category.wasted.purchaseCostMinor)}; estimated consumed/wasted ${formatAnalyticsMoney(used.estimatedCostMinor)}/${formatAnalyticsMoney(category.wasted.estimatedCostMinor)}; unknown-price consumed/wasted ${used.unknownCount}/${category.wasted.unknownCount}`;
  }).join('\n');
  return report + '\nOutcome-time category purchase values (estimates/unknowns excluded):\n' + categories
    + `\nLatest ${data.usedBeforeExpiry.items.length} of ${data.usedBeforeExpiry.total} confirmed uses on/before expiry (current Pantry names; outcome-time values):\n`
    + data.usedBeforeExpiry.items.map(item => `${item.name}: ${analyticsUsedPrice(item)}; used ${analyticsCalendarDate(item.occurredAt, item.outcomeTimezone)} (${item.outcomeTimezone}), expiry ${item.expiresOn}`).join('\n');
}
/** Exact values remain strings; only relative drawing heights use a bounded 0..100 ratio. */
export function analyticsBarPercent(value: string, maximum: string): number {
  const max = BigInt(maximum);
  return max === 0n ? 0 : Number(BigInt(value) * 10000n / max) / 100;
}
/** Largest remainders: tenths of a percent sum to 100.0; no denominator means no share. */
export function analyticsCategoryShares(values: string[]): (number | null)[] {
  if (values.some(value => !/^(0|[1-9]\d{0,24})$/.test(value))) throw Error('INVALID_CATEGORY_VALUES');
  const amounts = values.map(BigInt), total = amounts.reduce((sum, value) => sum + value, 0n);
  if (total === 0n) return amounts.map(() => null);
  const shares = amounts.map(value => Number(value * 1000n / total));
  const order = amounts.map((value, index) => ({ index, remainder: value * 1000n % total }))
    .sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  const left = 1000 - shares.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < left; index++) shares[order[index].index]++;
  return shares;
}
