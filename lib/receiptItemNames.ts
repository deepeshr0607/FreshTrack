// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { receiptNameSuggestion } from './receiptNameAliases.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { RECEIPT_FOODS } from './receiptFoodCatalog.ts';
/** Name-detection hints only. No category, quantity, storage or shelf-life inference. */
const FOOD_WORDS: ReadonlySet<string> = new Set(RECEIPT_FOODS.flatMap(food => food.words));
const METADATA = /\b(?:shop|store|stores|market|mart|supermarket|trading|address|road|street|lane|avenue|branch|cashier|salesperson|counter|invoice|receipt|bill|payment|total|subtotal|tax|discount|savings|phone|telephone|fax|customer|thank|website|email|support|offer|coupon|points)\b|www\.|https?:|@/i;

/** Conservative English vocabulary; unknown names stay available for manual review. */
export function isPossibleReceiptFoodName(value: string): boolean {
  if (METADATA.test(value)) return false;
  const words = (receiptNameSuggestion(value)?.name ?? value).normalize('NFKC').toLowerCase().split(/[^a-z]+/);
  return words.some(word => FOOD_WORDS.has(word));
}
