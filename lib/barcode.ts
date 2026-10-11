import type { ExpirySource, ItemCategory, PantryItem } from './mock';
import { createPantryItem, validatePantryDraft, type PantryDraft } from './pantry';

export interface BarcodeProduct {
  barcode: string; name: string; category: ItemCategory; unit: string; price: string;
  emoji: string; estimateDays: number; sampleStampDays: number; target: string;
}
/** Synthetic barcode values for the packaged products visible in the supplied design. */
export const MOCK_BARCODE_PRODUCTS: BarcodeProduct[] = [
  { barcode: '000000000001', name: 'Chobani Greek Yogurt (32oz)', category: 'Dairy', unit: 'tub', price: '5.29',
    emoji: '🍶', estimateDays: 14, sampleStampDays: 24, target: 'Stamped lid rim or foil' },
  { barcode: '000000000002', name: 'Kettle Sea Salt Chips', category: 'Snacks', unit: 'bag', price: '3.99',
    emoji: '🥔', estimateDays: 45, sampleStampDays: 60, target: 'Stamped on top back seam' },
  { barcode: '000000000003', name: 'Sourdough Crackers', category: 'Bakery', unit: 'box', price: '4.99',
    emoji: '🍞', estimateDays: 30, sampleStampDays: 40, target: 'Stamped on bottom flap' },
];
export interface BarcodeCandidate {
  id: string; product: BarcodeProduct; draft: PantryDraft; expirySource: ExpirySource;
  confirmed: boolean; duplicateChoice?: 'skip' | 'separate';
}
export function barcodeLookup(code: string): BarcodeProduct | null {
  return MOCK_BARCODE_PRODUCTS.find((product) => product.barcode === code.trim()) ?? null;
}
export function dateAfter(days: number, today = new Date()): string {
  const date = new Date(today); date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function newBarcodeCandidate(product: BarcodeProduct, id: string): BarcodeCandidate {
  return { id, product, draft: { name: product.name, category: product.category, quantity: '1', unit: product.unit,
    price: product.price, expiresOn: '' }, expirySource: 'USER_ENTERED', confirmed: false };
}
const normalized = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function barcodeDuplicates(row: BarcodeCandidate, pantry: PantryItem[], preceding: BarcodeCandidate[] = []): string[] {
  return [...pantry.filter((item) => item.status === 'ACTIVE' &&
    (item.barcode === row.product.barcode || normalized(item.name) === normalized(row.draft.name))).map((item) => item.name),
    ...preceding.filter((item) => item.duplicateChoice !== 'skip' && (item.product.barcode === row.product.barcode ||
      normalized(item.draft.name) === normalized(row.draft.name))).map((item) => item.draft.name)];
}
export function prepareBarcodeImport(queue: BarcodeCandidate[], pantry: PantryItem[], batchId: string):
  { items: PantryItem[]; error: null } | { items: null; error: string } {
  if (!queue.length) return { items: null, error: 'Scan an item before reviewing the queue.' };
  const result: PantryItem[] = [];
  for (const [index, row] of queue.entries()) {
    const error = validatePantryDraft(row.draft);
    if (error) return { items: null, error: `${row.draft.name}: ${error}` };
    if (!row.confirmed) return { items: null, error: `Confirm an expiry option for ${row.draft.name}.` };
    if (barcodeDuplicates(row, pantry, queue.slice(0, index)).length && !row.duplicateChoice) {
      return { items: null, error: `Choose Skip or Add separately for ${row.draft.name}.` };
    }
    if (row.duplicateChoice === 'skip') continue;
    const item = createPantryItem(`${batchId}-${row.id}`, row.draft)!;
    result.push({ ...item, source: 'BARCODE', barcode: row.product.barcode, expirySource: row.expirySource,
      imageEmoji: row.product.emoji, note: `${item.note ? `${item.note} ` : ''}Demo barcode lookup; ${row.expirySource === 'PACKAGE_DATE' ?
        'package date confirmed from a simulated stamp, not a real camera.' : row.expirySource === 'PRESET_ESTIMATE' ? 'expiry is an estimate.' : 'expiry entered by user.'}` });
  }
  if (!result.length) return { items: null, error: 'All items are skipped. Keep at least one item to add.' };
  if (new Set(result.map((item) => item.id)).size !== result.length) return { items: null, error: 'Repeated queue IDs cannot be imported.' };
  return { items: result, error: null };
}
