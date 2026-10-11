import type { PantryItem } from './mock';
import { createPantryItem, type PantryDraft, validatePantryDraft } from './pantry';

export interface ReceiptCandidate {
  id: string;
  draft: PantryDraft;
  estimatedDate: string;
  selected: boolean;
  duplicateChoice?: 'skip' | 'separate';
  emoji: string;
  note: string;
}

/** Four visible reference rows; decorative eight-item/$28.16 totals are not invented groceries. */
export const MOCK_RECEIPT = {
  retailer: "Trader Joe's #142",
  rows: [
    { id: 'spinach', name: 'Organic Baby Spinach', category: 'Produce', unit: 'bag', price: '3.99', days: 5, emoji: '🥬', note: 'Auto-rule applied' },
    { id: 'milk', name: 'Whole Vitamin D Milk', category: 'Dairy', unit: 'gallon', price: '4.29', days: 7, emoji: '🥛', note: 'Cap unverified · estimated date' },
    { id: 'yogurt', name: 'Greek Yogurt Plain 32oz', category: 'Dairy', unit: 'tub', price: '2.89', days: 14, emoji: '🍶', note: 'Sealed default' },
    { id: 'bread', name: 'Rustic Sourdough Boule', category: 'Bakery', unit: 'loaf', price: '4.99', days: 6, emoji: '🍞', note: 'Pantry standard' },
  ],
} as const;

export function newReceiptCandidates(today = new Date()): ReceiptCandidate[] {
  return MOCK_RECEIPT.rows.map((row) => {
    const date = new Date(today); date.setDate(date.getDate() + row.days);
    const expiresOn = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { id: row.id, draft: { name: row.name, category: row.category, quantity: '1', unit: row.unit,
      price: row.price, expiresOn }, estimatedDate: expiresOn, selected: true, emoji: row.emoji, note: row.note };
  });
}

const normalized = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Conservative possible-duplicate hints; never fuzzy-merge or change existing purchases. */
export function receiptDuplicates(candidate: ReceiptCandidate, pantry: PantryItem[], preceding: ReceiptCandidate[] = []): string[] {
  const name = normalized(candidate.draft.name);
  return [...pantry.filter((item) => item.status === 'ACTIVE' && normalized(item.name) === name).map((item) => item.name),
    ...preceding.filter((item) => item.selected && item.duplicateChoice !== 'skip' && normalized(item.draft.name) === name).map((item) => item.draft.name)];
}

export function prepareReceiptImport(candidates: ReceiptCandidate[], pantry: PantryItem[], batchId: string):
  { items: PantryItem[]; error: null } | { items: null; error: string } {
  const selected = candidates.filter((item) => item.selected);
  if (!selected.length) return { items: null, error: 'Select at least one grocery.' };
  const result: PantryItem[] = [];
  for (const [index, candidate] of selected.entries()) {
    const error = validatePantryDraft(candidate.draft);
    if (error) return { items: null, error: `${candidate.draft.name || 'Grocery'}: ${error}` };
    if (receiptDuplicates(candidate, pantry, selected.slice(0, index)).length && !candidate.duplicateChoice) {
      return { items: null, error: `Choose Skip or Add separately for ${candidate.draft.name}.` };
    }
    if (candidate.duplicateChoice === 'skip') continue;
    const item = createPantryItem(`${batchId}-${candidate.id}`, candidate.draft)!;
    result.push({ ...item, source: 'RECEIPT', imageEmoji: candidate.emoji,
      expirySource: candidate.draft.expiresOn === candidate.estimatedDate ? 'PRESET_ESTIMATE' : 'USER_ENTERED',
      note: `${item.note ? `${item.note} ` : ''}Receipt review: ${candidate.note}` });
  }
  if (!result.length) return { items: null, error: 'All selected groceries are skipped. Select an item to add.' };
  if (new Set(result.map((item) => item.id)).size !== result.length) return { items: null, error: 'Receipt contains repeated candidate IDs.' };
  return { items: result, error: null };
}
