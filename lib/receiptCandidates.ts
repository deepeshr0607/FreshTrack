// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { ocrLines } from './receiptOcrProbe.ts';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { validatePantryDraft } from './pantry.ts';
import type { PantryDraft } from './pantry';

export interface LocalReceiptCandidate {
  id: string;
  original: string;
  draft: PantryDraft;
  detectedPrice: string | null;
  currency: 'INR' | 'unspecified' | 'unsupported';
  reviewed: boolean;
  selected: boolean;
}
export interface ReceiptParseResult {
  candidates: LocalReceiptCandidate[];
  remaining: { id: string; original: string; reason: string }[];
}
const nonItem = /^(?:grand\s+total|sub\s*total|total|tax|cgst|sgst|igst|gst|vat|cess|discount|saving[s]?|round\s*off|cash|change|balance|amount\s+(?:due|paid)|paid|payment|card|credit|debit|upi|visa|mastercard|receipt|invoice|bill\s*(?:no|number|#)|date|time|tel|phone|address|thank\s*you|welcome|www\.|https?:|gstin|fssai|qty\b|quantity\b|item\s+description)(?:\b|\s|[.:#])/i;
const money = /^(.*?)\s+(?:(₹|INR|Rs\.?|\$|USD|EUR|€|GBP|£)\s*)?((?:0|[1-9]\d{0,7})[.,]\d{2})(?:\s*(₹|INR|Rs\.?|\$|USD|EUR|€|GBP|£))?$/i;
const emptyDraft = (name = '', price = ''): PantryDraft => ({ name, category: 'Other', quantity: '', unit: '', price, expiresOn: '' });
/** Same-line prices only. Unassigned lines remain available; never join unrelated OCR columns. */
export function parseReceiptCandidates(value: unknown): ReceiptParseResult {
  const lines = ocrLines(value);
  const candidates: LocalReceiptCandidate[] = [], remaining: ReceiptParseResult['remaining'] = [];
  for (const [index, original] of lines.entries()) {
    const line = original.normalize('NFC').replace(/\s+/g, ' ').trim();
    const id = `line-${index}`;
    const match = money.exec(line);
    const name = match?.[1]?.trim() ?? '';
    if (nonItem.test(line)) { remaining.push({ id, original, reason: 'Likely header, payment or summary — not selected' }); continue; }
    if (!match || name.length > 120 || (name.match(/\p{L}/gu)?.length ?? 0) < 2 || candidates.length >= 20) {
      remaining.push({ id, original, reason: candidates.length >= 20 ? 'Review limit reached (20 rows)' : 'Uncertain layout or missing same-line price' }); continue;
    }
    const marker = `${match[2] ?? ''}${match[4] ?? ''}`;
    const currency = /[$€£]|USD|EUR|GBP/i.test(marker) ? 'unsupported' : marker ? 'INR' : 'unspecified';
    const detectedPrice = match[3]!.replace(',', '.');
    candidates.push({ id, original, detectedPrice, currency,
      draft: emptyDraft(name, currency === 'unsupported' ? '' : detectedPrice), reviewed: false, selected: false });
  }
  return { candidates, remaining };
}
export function manualReceiptCandidate(id: string, original = ''): LocalReceiptCandidate {
  return { id, original, detectedPrice: null, currency: 'unspecified', draft: emptyDraft(), reviewed: false, selected: false };
}
/** Same bounds as the real Pantry form; no expiry, quantity, unit or price is inferred. */
export function receiptCandidateIssue(draft: PantryDraft): string | null {
  if (draft.name.trim().length > 120 || draft.unit.trim().length > 32) return 'Use a name up to 120 characters and a unit up to 32.';
  const issue = validatePantryDraft(draft);
  if (issue) return issue;
  if (!/^(0|[1-9]\d{0,8})([.,]\d{1,3})?$/.test(draft.quantity.trim())) return 'Quantity supports up to three decimal places.';
  const price = draft.price.trim().replace(',', '.');
  if (price && (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(price) || Number(price) * 100 > 2147483647)) return 'Use a rupee value with up to two decimal places, at most ₹21474836.47.';
  return null;
}
/** Repeated purchases are hints only; review never merges, consumes or writes inventory. */
export function receiptReviewSummary(rows: LocalReceiptCandidate[]) {
  const selected = rows.filter(row => row.selected);
  if (!selected.length) return { error: 'Review and select at least one grocery.', rows: [] as LocalReceiptCandidate[], repeated: [] as string[] };
  if (selected.length > 20 || new Set(rows.map(row => row.id)).size !== rows.length) return { error: 'Use at most 20 distinct review rows.', rows: [], repeated: [] };
  for (const row of selected) {
    if (!row.reviewed) return { error: 'Save each selected grocery review first.', rows: [], repeated: [] };
    const issue = receiptCandidateIssue(row.draft);
    if (issue) return { error: issue, rows: [], repeated: [] };
  }
  const names = selected.map(row => row.draft.name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'));
  return { error: null, rows: selected, repeated: selected.filter((_, index) => names.indexOf(names[index]!) !== index).map(row => row.draft.name) };
}
