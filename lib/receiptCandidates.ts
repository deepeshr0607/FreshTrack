// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { ocrLines } from './receiptOcrProbe.ts';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { validatePantryDraft } from './pantry.ts';
import type { PantryDraft } from './pantry';
import type { ExpirySelection } from '../types/api';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { expiryDraft, expirySelection, resolveExpiry } from './pantryExpiry.ts';
import type { ExpiryDraft } from './pantryExpiry';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { isPossibleReceiptFoodName } from './receiptItemNames.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { receiptQuantityHint } from './receiptQuantity.ts';

export interface LocalReceiptCandidate {
  id: string;
  original: string;
  draft: PantryDraft;
  expirySelection?: ExpirySelection;
  detectedPrice: string | null;
  currency: 'INR' | 'unspecified' | 'unsupported';
  reviewed: boolean;
  selected: boolean;
  /** Local provenance only; never part of the reviewed API payload. */
  sourceLineIds?: string[];
}
export interface UnassignedReceiptLine { id: string; original: string; reason: string; kind: 'name' | 'amount' | 'other' }
export interface ReceiptParseResult {
  candidates: LocalReceiptCandidate[];
  remaining: UnassignedReceiptLine[];
}
const nonItem = /^(?:grand\s+total|sub\s*total|total|tax|cgst|sgst|igst|gst|vat|cess|discount|saving[s]?|round\s*off|cash|change|balance|amount\s+(?:due|paid)|paid|payment|card|credit|debit|upi|visa|mastercard|receipt|invoice|bill\s*(?:no|number|#)|date|time|tel|phone|address|thank\s*you|welcome|www\.|https?:|gstin|fssai|qty\b|quantity\b|item\s+description)(?:\b|\s|[.:#])/i;
const money = /^(.*?)\s+(?:(₹|INR|Rs\.?|\$|USD|EUR|€|GBP|£)\s*)?((?:0|[1-9]\d{0,7})[.,]\d{2})(?:\s*(₹|INR|Rs\.?|\$|USD|EUR|€|GBP|£))?$/i;
const amountOnly = /^(?:(₹|INR|Rs\.?|\$|USD|EUR|€|GBP|£)\s*)?((?:0|[1-9]\d{0,7})[.,]\d{2})(?:\s*(₹|INR|Rs\.?|\$|USD|EUR|€|GBP|£))?$/i;
const columnHeading = /^(?:item(?:\s+name)?|description|particulars|rate|price|amount|mrp|s\.?\s*no\.?)(?:\s+(?:qty|quantity|rate|price|amount|mrp))*$/i;
const normalizedLine = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim();
const validName = (value: string) => value.length <= 120 && (value.match(/\p{L}/gu)?.length ?? 0) >= 2 && !/[\u0000-\u001f\u007f]/.test(value);
const priceInfo = (price: string, marker: string) => ({ detectedPrice: price.replace(',', '.'),
  currency: (/[$€£]|USD|EUR|GBP/i.test(marker) ? 'unsupported' : marker ? 'INR' : 'unspecified') as LocalReceiptCandidate['currency'] });
const emptyDraft = (name = '', price = ''): PantryDraft => ({ name, category: 'Other', quantity: '', unit: '', price, expiresOn: '' });
/** Keep same-line candidates; classify separate columns for explicit pairing, never inferred order. */
export function parseReceiptCandidates(value: unknown): ReceiptParseResult {
  const lines = ocrLines(value);
  const candidates: LocalReceiptCandidate[] = [], remaining: ReceiptParseResult['remaining'] = [];
  for (const [index, original] of lines.entries()) {
    const line = normalizedLine(original);
    const id = `line-${index}`;
    const match = money.exec(line);
    const name = match?.[1]?.trim() ?? '';
    if (nonItem.test(line) || columnHeading.test(line) || (match && columnHeading.test(name))) { remaining.push({ id, original, kind: 'other', reason: 'Likely header, payment or summary — not selected' }); continue; }
    if (amountOnly.test(line)) { remaining.push({ id, original, kind: 'amount', reason: 'Separate amount — choose its matching item name against the photo' }); continue; }
    if (!match || !validName(name) || candidates.length >= 20) {
      const nameOnly = !match && validName(line) && !/\d[.,]\d|[@₹$€£]|\b(?:INR|USD|EUR|GBP|Rs\.?)\b/i.test(line);
      remaining.push({ id, original, kind: nameOnly ? 'name' : 'other', reason: candidates.length >= 20 ? 'Review limit reached (20 rows)' : nameOnly ? 'Separate name — choose its matching amount against the photo' : 'Uncertain layout or missing same-line price' }); continue;
    }
    const marker = `${match[2] ?? ''}${match[4] ?? ''}`;
    const { currency, detectedPrice } = priceInfo(match[3]!, marker);
    candidates.push({ id, original, detectedPrice, currency,
      draft: emptyDraft(name, currency === 'unsupported' ? '' : detectedPrice), reviewed: false, selected: false, sourceLineIds: [id] });
  }
  return { candidates, remaining };
}
export function usedReceiptLineIds(rows: LocalReceiptCandidate[]): Set<string> {
  return new Set(rows.flatMap(row => row.sourceLineIds ?? []));
}
/** Propose known food names without borrowing a price from another OCR line.
 * Keep the base parse intact so removing a suggestion frees its original line for matching.
 * Existing same-line candidates take priority within the shared 20-row review limit.
 */
export function suggestReceiptNameOnlyItems(parsed: ReceiptParseResult): LocalReceiptCandidate[] {
  const rows = [...parsed.candidates];
  const used = usedReceiptLineIds(rows);
  for (const line of parsed.remaining) {
    if (rows.length >= 20) break;
    const name = normalizedLine(line.original);
    const quantity = receiptQuantityHint(name);
    // A clear leading weight may contain a decimal; keep its quantity unfilled until review.
    if ((line.kind !== 'name' && !quantity) || used.has(line.id) || !validName(name) ||
      /[\dOo][.,][\dOo]/.test(quantity?.itemText ?? name) || !isPossibleReceiptFoodName(name)) continue;
    rows.push({ id: line.id, original: line.original, sourceLineIds: [line.id],
      draft: emptyDraft(name), detectedPrice: null, currency: 'unspecified', reviewed: false, selected: false });
    used.add(line.id);
  }
  return rows;
}
/** Strings lack coordinates. User-selected name/amount IDs are required, even for equal-size columns. */
export function pairReceiptLines(lines: UnassignedReceiptLine[], nameId: string, amountId: string, rows: LocalReceiptCandidate[]): LocalReceiptCandidate {
  if (rows.length >= 20) throw Error('Use at most 20 review rows. Remove a grocery before matching another.');
  const name = lines.find(line => line.id === nameId), amount = lines.find(line => line.id === amountId), used = usedReceiptLineIds(rows);
  if (!name || !amount || name.kind !== 'name' || amount.kind !== 'amount' || name.id === amount.id || used.has(name.id) || used.has(amount.id)) throw Error('Choose one unused item-name line and one unused amount line.');
  const itemName = normalizedLine(name.original), match = amountOnly.exec(normalizedLine(amount.original));
  if (!validName(itemName) || nonItem.test(itemName) || columnHeading.test(itemName) || !match) throw Error('These lines cannot be matched safely. Use Add Missing to enter the grocery.');
  const { detectedPrice, currency } = priceInfo(match[2]!, `${match[1] ?? ''}${match[3] ?? ''}`);
  return { id: `pair-${name.id}-${amount.id}`, original: `${name.original}\n${amount.original}`, sourceLineIds: [name.id, amount.id],
    detectedPrice, currency, draft: emptyDraft(itemName, currency === 'unsupported' ? '' : detectedPrice), reviewed: false, selected: false };
}
export function manualReceiptCandidate(id: string, original = ''): LocalReceiptCandidate {
  return { id, original, detectedPrice: null, currency: 'unspecified', draft: emptyDraft(), reviewed: false, selected: false };
}
/** Legacy date-only reviews remain manual; OCR never infers an expiry source. */
export function receiptCandidateExpiry(row: { draft: PantryDraft; expirySelection?: ExpirySelection }) {
  const resolved = resolveExpiry(row.expirySelection ?? { packageDate: null, userDate: row.draft.expiresOn, preset: null });
  if (resolved.expiresOn !== row.draft.expiresOn) throw Error('Expiry date does not match the reviewed choice.');
  return resolved;
}
export function receiptExpiryDraft(row: LocalReceiptCandidate): ExpiryDraft {
  if (!row.expirySelection) return { ...expiryDraft(), userDate: row.draft.expiresOn };
  const resolved = receiptCandidateExpiry(row);
  return { packageDate: resolved.expirySource === 'PACKAGE_DATE' ? resolved.expiresOn : '',
    userDate: resolved.expirySource === 'USER_ENTERED' ? resolved.expiresOn : '',
    baseDate: resolved.expirySource === 'PRESET_ESTIMATE' ? resolved.purchaseDate! : '',
    days: resolved.expirySource === 'PRESET_ESTIMATE' ? String(resolved.freshnessPresetDays) : '' };
}
/** Save only the winning source. Clearing it later cannot revive an unused lower choice. */
export function saveReceiptCandidate(row: LocalReceiptCandidate, form: ExpiryDraft): LocalReceiptCandidate {
  const resolved = resolveExpiry(expirySelection(form));
  const chosen: ExpirySelection = { packageDate: resolved.expirySource === 'PACKAGE_DATE' ? resolved.expiresOn : null,
    userDate: resolved.expirySource === 'USER_ENTERED' ? resolved.expiresOn : null,
    preset: resolved.expirySource === 'PRESET_ESTIMATE' ? { baseDate: resolved.purchaseDate!, days: resolved.freshnessPresetDays! } : null };
  const draft = { ...row.draft, expiresOn: resolved.expiresOn };
  const issue = receiptCandidateIssue(draft); if (issue) throw Error(issue);
  return { ...row, draft, expirySelection: chosen, reviewed: true, selected: true };
}
export function receiptExpiryLabel(item: { expiresOn: string; expirySelection?: ExpirySelection }): string {
  const source = item.expirySelection ? resolveExpiry(item.expirySelection).expirySource : 'USER_ENTERED';
  return `${source === 'PACKAGE_DATE' ? 'Package date' : source === 'PRESET_ESTIMATE' ? 'Estimated' : 'User set'}: ${item.expiresOn}`;
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
  const used = new Set<string>();
  for (const row of selected) {
    for (const id of row.sourceLineIds ?? []) {
      if (used.has(id)) return { error: 'An OCR line is used by more than one selected grocery. Remove the overlapping review.', rows: [], repeated: [] };
      used.add(id);
    }
    if (!row.reviewed) return { error: 'Save each selected grocery review first.', rows: [], repeated: [] };
    try { receiptCandidateExpiry(row); } catch (error) { return { error: (error as Error).message, rows: [], repeated: [] }; }
    const issue = receiptCandidateIssue(row.draft);
    if (issue) return { error: issue, rows: [], repeated: [] };
  }
  const names = selected.map(row => row.draft.name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'));
  return { error: null, rows: selected, repeated: selected.filter((_, index) => names.indexOf(names[index]!) !== index).map(row => row.draft.name) };
}
