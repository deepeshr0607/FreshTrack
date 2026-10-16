import type { AnalyticsAmount, AnalyticsSeries } from '../types/api';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { apiOrigin } from './backendIdentity.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { NeonAuthError } from './neonAuth.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { validMonth, shiftAnalyticsMonth, consumedAmount } from './analyticsPresentation.ts';
const record = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: any) => Number.isSafeInteger(value) && value >= 0;
const money = (value: any) => typeof value === 'string' && /^(0|[1-9]\d{0,24})$/.test(value);
function amount(value: any): value is AnalyticsAmount {
  return record(value) && ['count', 'purchaseCount', 'estimatedCount', 'unknownCount'].every(key => count(value[key]))
    && value.count === value.purchaseCount + value.estimatedCount + value.unknownCount && money(value.purchaseCostMinor) && money(value.estimatedCostMinor)
    && (value.purchaseCount !== 0 || value.purchaseCostMinor === '0') && (value.estimatedCount !== 0 || value.estimatedCostMinor === '0');
}
export function validAnalyticsSeries(value: any, requested?: string): value is AnalyticsSeries {
  try {
    if (!record(value) || !validMonth(value.month) || value.previousMonth !== shiftAnalyticsMonth(value.month, -1) || requested && value.month !== requested
      || value.currencyCode !== 'INR' || typeof value.timezone !== 'string' || value.timezone.length > 64
      || typeof value.asOf !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value.asOf) || !Number.isFinite(Date.parse(value.asOf))
      || !Array.isArray(value.months) || value.months.length !== 6) return false;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: value.timezone, calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit' }).formatToParts(new Date(value.asOf));
    const current = `${parts.find(row => row.type === 'year')!.value.padStart(4, '0')}-${parts.find(row => row.type === 'month')!.value}`;
    if (!requested && value.month !== current) return false;
    if (!value.months.every((row: any, index: number) => record(row) && row.month === shiftAnalyticsMonth(value.month, index - 5)
      && row.timezone === value.timezone && row.asOf === value.asOf && row.currencyCode === 'INR' && row.basis === 'LATEST_EFFECTIVE_OUTCOME'
      && row.period === (row.month < current ? 'COMPLETE' : row.month === current ? 'MONTH_TO_DATE' : 'FUTURE')
      && ['wasted', 'consumedBeforeOrOnExpiry', 'consumedAfterExpiry', 'unconfirmed'].every(key => amount(row[key]) && (row.period !== 'FUTURE' || row[key].count === 0))
      && count(row.consumedBeforeOrOnExpiry.count + row.consumedAfterExpiry.count))) return false;
    const last = value.months[5], previous = value.months[4], comparison = value.comparison;
    if (!record(comparison) || comparison.basis !== 'PURCHASE_VALUES_ONLY' || comparison.period !== (last.period === 'FUTURE' ? 'FUTURE_PERIOD' : last.period === 'MONTH_TO_DATE' ? 'MONTH_TO_DATE' : 'COMPLETE_PERIODS')) return false;
    return comparison.wastedPurchaseDeltaMinor === (last.period === 'FUTURE' ? null : String(BigInt(last.wasted.purchaseCostMinor) - BigInt(previous.wasted.purchaseCostMinor)))
      && comparison.consumedPurchaseDeltaMinor === (last.period === 'FUTURE' ? null : String(BigInt(consumedAmount(last).purchaseCostMinor) - BigInt(consumedAmount(previous).purchaseCostMinor)));
  } catch { return false; }
}
export function createAnalyticsApi(baseUrl: string | undefined, getToken: () => Promise<string>, allowLocalHttp = false, fetcher: typeof fetch = fetch) {
  return { async series(month?: string): Promise<AnalyticsSeries> {
    if (month !== undefined && (!validMonth(month) || !shiftAnalyticsMonth(month, -5))) throw new NeonAuthError('ANALYTICS_MONTH', 'Use YYYY-MM with at least five earlier calendar months.');
    const origin = apiOrigin(baseUrl, allowLocalHttp), token = await getToken();
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetcher(`${origin}/api/v1/analytics/series?months=6${month ? `&month=${month}` : ''}`, {
        method: 'GET', headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', redirect: 'error', signal: controller.signal });
      if (!response.ok) {
        let code; try { code = (await response.json())?.error?.code; } catch { /* Never display raw responses. */ }
        throw new NeonAuthError(response.status === 401 ? 'ANALYTICS_UNAUTHORIZED' : code === 'HOUSEHOLD_REQUIRED' ? 'HOUSEHOLD_REQUIRED' : 'ANALYTICS_UNAVAILABLE',
          response.status === 401 ? 'Your session was rejected. Sign in again.' : code === 'HOUSEHOLD_REQUIRED' ? 'Open Pantry to set up your household, then retry analytics.' : 'Analytics are unavailable. Please retry.');
      }
      const body = await response.json();
      if (!validAnalyticsSeries(body?.data, month)) throw new NeonAuthError('ANALYTICS_RESPONSE', 'The analytics response could not be verified. Please retry.');
      return body.data;
    } catch (error) {
      if (error instanceof NeonAuthError) throw error;
      throw new NeonAuthError('ANALYTICS_NETWORK', 'Unable to reach analytics. Check your connection and retry.');
    } finally { clearTimeout(timeout); }
  } };
}
