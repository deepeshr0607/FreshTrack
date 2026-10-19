import type { PantryDraft } from './pantry';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { receiptQuantityHint } from './receiptQuantity.ts';

/** Explicit supported spellings, not fuzzy matches or verified retailer product identities. */
const ALIASES: Readonly<Record<string, string>> = {
  'MKL LOPFT': 'Low-Fat Milk',
  'CHKN BRST': 'Chicken Breast',
  'WW BRD': 'Whole Wheat Bread',
  'BSMT RICE': 'Basmati Rice',
  BNNA: 'Bananas', TMTO: 'Tomato', PTTO: 'Potato',
};
export interface ReceiptNameSuggestion { name: string; matchedText: string }

/** Exact alias plus optional metric package size; retain explicit quantity wrappers. */
export function receiptNameSuggestion(value: string): ReceiptNameSuggestion | null {
  if (value.length > 120 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const text = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const item = receiptQuantityHint(text)?.itemText ?? text;
  const match = /^(.*?)(\s+\d+(?:[.,]\d{1,3})?\s*(?:kg|g|l|ml))?$/i.exec(item)!;
  const matchedText = match[1]!;
  const expansion = ALIASES[matchedText.toUpperCase()];
  if (!expansion) return null;
  const name = text.replace(item, expansion + (match[2] ?? ''));
  return name.length <= 120 ? { name, matchedText } : null;
}

/** Apply only on user request; all other reviewed fields remain unchanged. */
export function applyReceiptNameSuggestion(draft: PantryDraft): PantryDraft {
  const suggestion = receiptNameSuggestion(draft.name);
  return suggestion ? { ...draft, name: suggestion.name } : draft;
}
