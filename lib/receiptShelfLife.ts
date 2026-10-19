import type { ExpiryDraft } from './pantryExpiry';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { recognizeReceiptFood } from './receiptFoodRecognition.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';

export interface ReceiptStorageRule {
  id: string;
  foodIds: readonly string[];
  condition: string;
  rangeDays: readonly [number, number];
  source: string;
  sourceUrl: string;
}
const produce = { source: 'University of Maryland Extension', sourceUrl: 'https://extension.umd.edu/resource/storing-garden-fruits-and-vegetables' };
const cold = { source: 'FoodSafety.gov', sourceUrl: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts' };

/** Reviewed 2026-10-19. Lower bounds are tracking defaults, never verified safety dates.
 * Conditions must be confirmed; a receipt cannot establish age or cold-chain history.
 * No category-wide fallback, packaged-food duration or frozen-quality expiry inference.
 */
export const RECEIPT_STORAGE_RULES: readonly ReceiptStorageRule[] = [
  { id: 'berries', foodIds: ['strawberry'], condition: 'Fresh whole berries, unwashed, refrigerated at 4°C or below', rangeDays: [2, 3], ...produce },
  { id: 'pear', foodIds: ['pear'], condition: 'Whole pears, already ripe, refrigerated at 4°C or below', rangeDays: [5, 5], ...produce },
  { id: 'greens', foodIds: ['spinach', 'lettuce'], condition: 'Fresh unwashed greens, refrigerated at 4°C or below in a ventilated bag', rangeDays: [2, 4], ...produce },
  { id: 'carrot', foodIds: ['carrot'], condition: 'Whole carrots, tops removed, refrigerated at 4°C or below', rangeDays: [7, 14], ...produce },
  { id: 'brassicas', foodIds: ['broccoli', 'cabbage'], condition: 'Whole fresh broccoli or cabbage, refrigerated at 4°C or below in a ventilated bag', rangeDays: [3, 6], ...produce },
  { id: 'roots', foodIds: ['potato', 'onion'], condition: 'Whole dry potatoes or onions, cool dry ventilated storage away from light', rangeDays: [14, 28], ...produce },
  { id: 'chicken', foodIds: ['chicken'], condition: 'Fresh raw chicken, continuously refrigerated at 4°C or below; not cooked or thawed', rangeDays: [1, 2], ...cold },
  { id: 'eggs', foodIds: ['egg'], condition: 'Raw eggs in intact shells, continuously refrigerated at 4°C or below', rangeDays: [21, 35], ...cold },
];

export function receiptStorageRules(name: string): readonly ReceiptStorageRule[] {
  const food = recognizeReceiptFood(name);
  // A fresh-storage rule must never be offered for an explicitly different product form.
  if (food.status !== 'matched' || /\b(?:frozen|thawed|dried|dehydrated|canned|tinned|pickled|preserved|cut|sliced|chopped|peeled|cooked|roasted|fried|boiled|smoked|paste|puree|pureed|instant)\b/i.test(name)) return [];
  return RECEIPT_STORAGE_RULES.filter(rule => rule.foodIds.includes(food.foodId!));
}

/** Explicit confirmation only. Uses the existing validated calendar calculator and wire contract. */
export function applyReceiptStorageRule(name: string, ruleId: string, purchaseDate: string, today: string, current: ExpiryDraft): ExpiryDraft {
  const rule = receiptStorageRules(name).find(value => value.id === ruleId);
  if (!rule) throw Error('Choose a supported food and storage condition.');
  // Validate both calendar dates before comparing their canonical YYYY-MM-DD strings.
  resolveExpiry({ packageDate: today, userDate: null, preset: null });
  const preset = { baseDate: purchaseDate, days: rule.rangeDays[0] };
  resolveExpiry({ packageDate: null, userDate: null, preset });
  if (purchaseDate > today) throw Error('Purchase date cannot be in the future.');
  if (current.packageDate || current.userDate) throw Error('A package or manual date already takes priority. Clear it before choosing an estimate.');
  return { ...current, baseDate: purchaseDate, days: String(preset.days) };
}
