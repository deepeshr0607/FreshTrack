import type { PantryDraft } from './pantry';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { RECEIPT_FOODS } from './receiptFoodCatalog.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { isPossibleReceiptFoodName } from './receiptItemNames.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { receiptNameSuggestion } from './receiptNameAliases.ts';

export interface ReceiptFoodRecognition {
  status: 'matched' | 'ambiguous' | 'unknown';
  category: PantryDraft['category'];
  foodId: string | null;
  label: string | null;
}
const unresolved = (status: 'ambiguous' | 'unknown'): ReceiptFoodRecognition => ({ status, category: 'Other', foodId: null, label: null });

/** Name-based suggestions only; never verifies freshness, ingredients, storage or safety. */
export function recognizeReceiptFood(name: string): ReceiptFoodRecognition {
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name) || !isPossibleReceiptFoodName(name)) return unresolved('unknown');
  const text = (receiptNameSuggestion(name)?.name ?? name).normalize('NFKC').toLowerCase();
  const words = new Set(text.split(/[^a-z]+/));
  if (['soap', 'shampoo', 'detergent', 'lotion', 'cleaner', 'pet', 'dog', 'cat', 'toy'].some(word => words.has(word))) return unresolved('unknown');
  // These names describe a preparation/form whose ingredient words do not identify the purchase.
  if (['soup', 'juice', 'jam', 'sauce', 'masala', 'seasoning', 'powder', 'mix', 'blend', 'burger', 'sandwich', 'cooked', 'flavour', 'flavor', 'flavoured', 'flavored'].some(word => words.has(word))) return unresolved('ambiguous');
  const dairyWord = ['milk', 'yogurt', 'yoghurt', 'curd', 'cheese', 'butter'].some(word => words.has(word));
  if (dairyWord && (['almond', 'oat', 'soya', 'soy', 'coconut', 'rice', 'peanut', 'cashew'].some(word => words.has(word)) ||
    /\b(?:non[\s-]*dairy|dairy[\s-]*free|plant[\s-]*based)\b/.test(text))) return unresolved('ambiguous');
  if (/\b(?:not|never|non)[\s-]+frozen\b/.test(text)) return unresolved('ambiguous');
  const matches = RECEIPT_FOODS.filter(food => food.words.some(word => words.has(word)));
  const products = matches.filter(food => food.finishedProduct);
  const choices = products.length ? products : matches;
  if (choices.length !== 1) return unresolved(matches.length ? 'ambiguous' : 'unknown');
  const food = choices[0]!;
  return { status: 'matched', category: words.has('frozen') ? 'Frozen' : food.category, foodId: food.id, label: food.label };
}

/** Explicit user action only; later manual category choices are never auto-overwritten. */
export function applyReceiptFoodCategory(draft: PantryDraft): PantryDraft {
  const match = recognizeReceiptFood(draft.name);
  return match.status === 'matched' ? { ...draft, category: match.category } : draft;
}
