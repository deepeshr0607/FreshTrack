// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { receiptNameSuggestion } from './receiptNameAliases.ts';
/** Name-detection hints only. No category, quantity, storage or shelf-life inference. */
const FOOD_WORDS: ReadonlySet<string> = new Set([
  'milk', 'yogurt', 'yoghurt', 'curd', 'paneer', 'cheese', 'butter',
  'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'mango', 'mangoes',
  'grape', 'grapes', 'tomato', 'tomatoes', 'potato', 'potatoes', 'onion', 'onions',
  'carrot', 'carrots', 'spinach', 'broccoli', 'cabbage', 'lettuce',
  'chicken', 'mutton', 'beef', 'pork', 'fish', 'prawn', 'prawns', 'egg', 'eggs',
  'bread', 'bun', 'buns', 'biscuit', 'biscuits', 'cookie', 'cookies', 'cake',
  'rice', 'flour', 'atta', 'dal', 'lentils', 'pasta', 'noodles', 'oats',
  'sugar', 'salt', 'oil', 'tea', 'coffee', 'chocolate',
]);
const METADATA = /\b(?:shop|store|stores|market|mart|supermarket|trading|address|road|street|lane|avenue|branch|cashier|salesperson|counter|invoice|receipt|bill|payment|total|subtotal|tax|discount|savings|phone|telephone|fax|customer|thank|website|email|support|offer|coupon|points)\b|www\.|https?:|@/i;

/** Conservative English vocabulary; unknown names stay available for manual review. */
export function isPossibleReceiptFoodName(value: string): boolean {
  if (METADATA.test(value)) return false;
  const words = (receiptNameSuggestion(value)?.name ?? value).normalize('NFKC').toLowerCase().split(/[^a-z]+/);
  return words.some(word => FOOD_WORDS.has(word));
}
