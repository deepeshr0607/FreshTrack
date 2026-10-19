import type { PantryDraft } from './pantry';

export interface ReceiptQuantityHint { quantity: string; unit: string | null; itemText: string }
const NUMBER = '(?:0|[1-9]\\d{0,8})(?:[.,]\\d{1,3})?';
const UNITS: Readonly<Record<string, string>> = {
  kg: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg', g: 'g', gram: 'g', grams: 'g',
  l: 'l', lt: 'l', ltr: 'l', ltrs: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  pc: 'piece', pcs: 'piece', piece: 'piece', pieces: 'piece',
  pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack',
};
const UNIT = Object.keys(UNITS).sort((a, b) => b.length - a.length).join('|');
const leadingMeasure = new RegExp(`^(${NUMBER})\\s*(${UNIT})\\s+(.+)$`, 'i');
const leadingCount = /^([1-9]\d{0,8})\s*[x×]\s*(.+)$/i;
const labelledQuantity = new RegExp(`^(.+?)\\s+(?:qty|quantity)\\s*[:=]?\\s*(${NUMBER})(?:\\s*(${UNIT}))?$`, 'i');

/** Explicit receipt quantity syntax only. A trailing product size is not purchased quantity. */
export function receiptQuantityHint(value: string): ReceiptQuantityHint | null {
  if (value.length > 120 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const text = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const measure = leadingMeasure.exec(text), count = leadingCount.exec(text), labelled = labelledQuantity.exec(text);
  let quantity: string, unit: string | null, itemText: string;
  if (measure) { quantity = measure[1]!; unit = UNITS[measure[2]!.toLowerCase()]!; itemText = measure[3]!; }
  else if (count) { quantity = count[1]!; unit = null; itemText = count[2]!; }
  else if (labelled) { quantity = labelled[2]!; unit = labelled[3] ? UNITS[labelled[3].toLowerCase()]! : null; itemText = labelled[1]!; }
  else return null;
  quantity = quantity.replace(',', '.');
  if (Number(quantity) <= 0 || (itemText.match(/\p{L}/gu)?.length ?? 0) < 2) return null;
  // Multiple quantity expressions are ambiguous; do not choose one silently.
  if (/\b(?:qty|quantity)\b|^\d|\b\d+\s*[x×]\s*\d/i.test(itemText)) return null;
  return { quantity, unit, itemText };
}

/** User-triggered only. No price multiplication, name replacement or date/category changes. */
export function applyReceiptQuantityHint(draft: PantryDraft): PantryDraft {
  const hint = receiptQuantityHint(draft.name);
  return hint ? { ...draft, quantity: hint.quantity, unit: hint.unit ?? draft.unit } : draft;
}
