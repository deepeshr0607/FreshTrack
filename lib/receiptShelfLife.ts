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
  guidance?: string;
  confirmationLabel?: string;
}
const produce = { source: 'University of Maryland Extension', sourceUrl: 'https://extension.umd.edu/resource/storing-garden-fruits-and-vegetables' };
const cold = { source: 'FoodSafety.gov', sourceUrl: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts' };
const dairy = { source: 'USDA FSIS', sourceUrl: 'https://ask.fsis.usda.gov/article/How-long-can-you-keep-dairy-products-like-yogurt-milk-and-cheese-in-the-refrigerator' };
const virginia = { source: 'Virginia Cooperative Extension', sourceUrl: 'https://www.pubs.ext.vt.edu/content/dam/pubs_ext_vt_edu/348/348-960/FST-510.pdf' };

/** Reviewed 2026-10-19. Lower bounds are tracking defaults, never verified safety dates.
 * Conditions must be confirmed; a receipt cannot establish age or cold-chain history.
 * No category-wide fallback, verified package-date claim or frozen-quality expiry inference.
 */
export const RECEIPT_STORAGE_RULES: readonly ReceiptStorageRule[] = [
  { id: 'watermelon-whole', foodIds: ['watermelon'], condition: 'Whole uncut watermelon, intact rind, cool ventilated storage around 13°C; not cut or prepared', rangeDays: [14, 14],
    source: 'University of Minnesota Extension', sourceUrl: 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/harvesting-and-storing-home-garden-vegetables',
    guidance: 'Two-week reference for cool storage. Shorten this tracking estimate for warmer storage or older fruit; it does not apply after cutting.' },
  { id: 'apples', foodIds: ['apple'], condition: 'Firm whole apples, uncut, refrigerated at 4°C or below in a sealed bag', rangeDays: [21, 21],
    source: 'Iowa State University Extension', sourceUrl: 'https://spendsmart.extension.iastate.edu/produce-item/apples/',
    guidance: 'Whole refrigerated apples: up to three weeks. App tracking duration: 21 days; shorten it for older fruit.' },
  { id: 'bananas', foodIds: ['banana'], condition: 'Whole bananas, already ripe, peel intact, refrigerated at 4°C or below', rangeDays: [3, 3], ...virginia },
  { id: 'oranges', foodIds: ['orange'], condition: 'Whole ripe oranges, unpeeled, refrigerated at 4°C or below', rangeDays: [10, 21], ...virginia },
  { id: 'grapes', foodIds: ['grape'], condition: 'Fresh whole grapes, unwashed, refrigerated at 4°C or below', rangeDays: [7, 7], ...virginia },
  { id: 'berries', foodIds: ['strawberry'], condition: 'Fresh whole berries, unwashed, refrigerated at 4°C or below', rangeDays: [2, 3], ...produce },
  { id: 'pear', foodIds: ['pear'], condition: 'Whole pears, already ripe, refrigerated at 4°C or below', rangeDays: [5, 5], ...produce },
  { id: 'greens', foodIds: ['spinach', 'lettuce'], condition: 'Fresh unwashed greens, refrigerated at 4°C or below in a ventilated bag', rangeDays: [2, 4], ...produce },
  { id: 'carrot', foodIds: ['carrot'], condition: 'Whole carrots, tops removed, refrigerated at 4°C or below', rangeDays: [7, 14], ...produce },
  { id: 'brassicas', foodIds: ['broccoli', 'cabbage'], condition: 'Whole fresh broccoli or cabbage, refrigerated at 4°C or below in a ventilated bag', rangeDays: [3, 6], ...produce },
  { id: 'roots', foodIds: ['potato', 'onion'], condition: 'Whole dry potatoes or onions, cool dry ventilated storage away from light', rangeDays: [14, 28], ...produce },
  { id: 'chicken', foodIds: ['chicken'], condition: 'Fresh raw chicken, continuously refrigerated at 4°C or below; not cooked or thawed', rangeDays: [1, 2], ...cold },
  { id: 'fish', foodIds: ['fish'], condition: 'Fresh raw fin fish, whole or fillet, continuously refrigerated at 4°C or below; not thawed or processed', rangeDays: [1, 3], ...cold },
  { id: 'beef-cuts', foodIds: ['beef'], condition: 'Fresh raw beef steaks, chops or roasts, continuously refrigerated at 4°C or below; not ground, stew or organ meat', rangeDays: [3, 5], ...cold },
  { id: 'eggs', foodIds: ['egg'], condition: 'Raw eggs in intact shells, continuously refrigerated at 4°C or below', rangeDays: [21, 35], ...cold },
  { id: 'milk-refrigerated', foodIds: ['milk'], condition: 'Fresh pasteurized dairy milk, unopened, continuously refrigerated at 4°C or below; earlier label instructions apply',
    rangeDays: [7, 7], ...dairy, confirmationLabel: 'Confirm Refrigerated Milk & Use Estimate' },
  { id: 'rice-white-dry', foodIds: ['rice'], condition: 'Uncooked dry white rice, tightly sealed, cool dry storage around 21°C; check package instructions',
    rangeDays: [365, 365], ...virginia, guidance: 'White rice guidance: use within one year. App tracking duration: 365 days; this does not verify remaining package life.',
    confirmationLabel: 'Confirm Dry White Rice & Use Estimate' },
  { id: 'rice-brown-dry', foodIds: ['rice'], condition: 'Uncooked dry brown rice, tightly sealed, cool dry storage around 21°C; check package instructions',
    rangeDays: [180, 180], source: 'Utah State University Extension', sourceUrl: 'https://extension.usu.edu/preserve-the-harvest/files/Food-Storage-Booklet.pdf',
    guidance: 'Brown rice guidance: up to six months at about 21°C. App tracking duration: 180 days, a day-based approximation; older stock needs a shorter date.',
    confirmationLabel: 'Confirm Dry Brown Rice & Use Estimate' },
];

export function receiptStorageRules(name: string): readonly ReceiptStorageRule[] {
  const food = recognizeReceiptFood(name);
  // A fresh-storage rule must never be offered for an explicitly different product form.
  if (food.status !== 'matched' || /\b(?:frozen|thawed|dried|dehydrated|canned|tinned|pickled|preserved|cut|sliced|chopped|peeled|cooked|roasted|fried|boiled|smoked|paste|puree|pureed|instant)\b/i.test(name)) return [];
  if (['apple', 'banana', 'orange', 'grape'].includes(food.foodId!) && /\b(?:pie|cider|candy|candied|caramel|smoothie|drink|nectar|raisins|unripe)\b/i.test(name)) return [];
  if (food.foodId === 'fish' && /\b(?:fingers?|sticks?|balls?|nuggets?|surimi|curry|jerky)\b/i.test(name)) return [];
  if (food.foodId === 'beef' && /\b(?:ground|mince|minced|hamburger|stew|stewing|diced|cubed|offal|liver|kidney|heart|sausage|pastrami|corned|biltong|jerky)\b/i.test(name)) return [];
  if (food.foodId === 'milk' && (/\b(?:raw|unpasteuri[sz]ed|uht|ultra|shelf|stable|sterili[sz]ed|opened|opening|condensed|evaporated|concentrated|powdered|dry|reconstituted|infant|formula|breast)\b/i.test(name) || /\b(?:ultra[\s-]*pasteuri[sz]ed|shelf[\s-]*stable|(?:not|non)[\s-]+pasteuri[sz]ed)\b/i.test(name))) return [];
  if (food.foodId === 'rice') {
    if (/\b(?:wild|red|black|puffed|popped|crispy|sushi|risotto|biryani|ready|meal|porridge)\b/i.test(name)) return [];
    const brown = /\bbrown\b/i.test(name), white = /\bwhite\b/i.test(name);
    if (brown && white) return [];
    return RECEIPT_STORAGE_RULES.filter(rule => rule.foodIds.includes('rice') &&
      (!brown || rule.id === 'rice-brown-dry') && (!white || rule.id === 'rice-white-dry'));
  }
  return RECEIPT_STORAGE_RULES.filter(rule => rule.foodIds.includes(food.foodId!));
}

export function receiptStorageNotice(name: string): string | null {
  if (/\bmilk\b/i.test(name)) return 'Check the printed milk date first. The refrigerated estimate requires unopened pasteurized dairy milk. Raw, UHT, opened, powdered and plant-based milk need different guidance; no shared milk duration is assumed.';
  if (/\brice\b/i.test(name)) return 'Confirm whether this is dry white or brown rice. These durations do not apply to cooked rice. Cooked rice needs cooking-time and cooling review; a purchase date cannot establish that. Follow the package instructions, especially in warmer storage.';
  return null;
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
