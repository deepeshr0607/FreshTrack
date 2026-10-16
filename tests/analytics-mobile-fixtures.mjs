export const emptyAmount = () => ({ count: 0, purchaseCount: 0, purchaseCostMinor: '0', estimatedCount: 0, estimatedCostMinor: '0', unknownCount: 0 });
export function analyticsFixture() {
  const asOf = '2026-10-16T12:00:00.000Z', timezone = 'Asia/Kolkata';
  const months = [5, 6, 7, 8, 9, 10].map(number => ({ month: `2026-${String(number).padStart(2, '0')}`, timezone, asOf, currencyCode: 'INR', basis: 'LATEST_EFFECTIVE_OUTCOME',
    period: number === 10 ? 'MONTH_TO_DATE' : 'COMPLETE', wasted: emptyAmount(), consumedBeforeOrOnExpiry: emptyAmount(), consumedAfterExpiry: emptyAmount(), unconfirmed: emptyAmount() }));
  months[4].wasted = { ...emptyAmount(), count: 1, purchaseCount: 1, purchaseCostMinor: '1000' };
  months[5].wasted = { ...emptyAmount(), count: 2, purchaseCount: 1, purchaseCostMinor: '6050', unknownCount: 1 };
  months[5].consumedBeforeOrOnExpiry = { ...emptyAmount(), count: 1, purchaseCount: 1, purchaseCostMinor: '7200' };
  return { month: '2026-10', previousMonth: '2026-09', timezone, asOf, currencyCode: 'INR', months, categories: ['PRODUCE', 'DAIRY', 'BAKERY', 'SNACKS', 'MEAT', 'FROZEN', 'OTHER'].map(category => ({ category, wasted: category === 'PRODUCE' ? structuredClone(months[5].wasted) : emptyAmount(), consumedBeforeOrOnExpiry: category === 'DAIRY' ? structuredClone(months[5].consumedBeforeOrOnExpiry) : emptyAmount(), consumedAfterExpiry: emptyAmount(), unconfirmed: emptyAmount() })),
    comparison: { basis: 'PURCHASE_VALUES_ONLY', period: 'MONTH_TO_DATE', wastedPurchaseDeltaMinor: '5050', consumedPurchaseDeltaMinor: '7200' } };
}
