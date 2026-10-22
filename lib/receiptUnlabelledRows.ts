import type { LocalReceiptCandidate } from './receiptCandidates';
import type { ReceiptTextBox } from './receiptTextBoxes';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { parseReceiptCandidates, pairReceiptLines } from './receiptCandidates.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { receiptTextBoxes } from './receiptTextBoxes.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { isNonFoodReceiptName } from './receiptItemNames.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { RECEIPT_MAX_ITEMS } from './receiptLimits.ts';
const cy = (line: ReceiptTextBox) => line.box.y + line.box.height / 2;
const right = (line: ReceiptTextBox) => line.box.x + line.box.width;
const footer = /^(?:sub\s*total|grand\s+total|total|cash|payment|balance|change|tax|gst|vat)(?:\b|\s|:)/i;
const metadata = /\b(?:receipt|invoice|subtotal|total|tax|discount|coupon|savings?|cashier|payment|telephone|phone|address|market|store|shipping|delivery|handling|fees?|deposit|refund|tender|card|loyalty)\b|www\.|https?:|@/i;
const heading = /^(?:amt|amount|line\s+total|total\s+price|price|rate|mrp|qty|quantity)(?:\b|\s|[:(])/i;
/** Headerless, single-price receipts only. Geometry must prove repeated one-to-one rows.
 * Never zip OCR strings, borrow totals, infer currency or choose between numeric columns.
 * Decimal package sizes/unit-rate notes inside parentheses stay part of the product name.
 */
export function suggestUnlabelledReceiptPairs(value: unknown): LocalReceiptCandidate[] {
  const boxes = receiptTextBoxes(value);
  if (boxes.some(line => heading.test(line.text))) return [];
  const end = boxes.filter(line => footer.test(line.text)).sort((a, b) => a.box.y - b.box.y)[0];
  if (!end) return [];
  const parsed = parseReceiptCandidates(boxes.map(line => line.text));
  const byId = new Map(boxes.map(line => [line.id, line]));
  const cells = parsed.remaining.filter(line => byId.get(line.id)!.box.y + byId.get(line.id)!.box.height <= end.box.y);
  const amounts = cells.filter(line => line.kind === 'amount').map(line => byId.get(line.id)!);
  if (amounts.length < 3) return [];
  // Require a single right-aligned column. Multiple unit/total columns remain manual.
  const edge = Math.max(...amounts.map(right));
  if (amounts.some(line => Math.abs(right(line) - edge) > .025)) return [];
  const names = cells.filter(line => {
    if (line.kind === 'amount' || metadata.test(line.original) || isNonFoodReceiptName(line.original) ||
      line.original.length > 120 || (line.original.match(/\p{L}/gu)?.length ?? 0) < 3) return false;
    // Outside parenthesized size/rate annotations, a second amount is ambiguous.
    const plain = line.original.replace(/\([^()]*\)/g, '');
    return !/[\dOo][.,][\dOo]|[₹$€£]|\b(?:INR|USD|EUR|GBP|MYR|RM)\b/i.test(plain);
  }).map(line => byId.get(line.id)!);
  const aligned = (name: ReceiptTextBox, amount: ReceiptTextBox) => right(name) < amount.box.x &&
    Math.abs(cy(name) - cy(amount)) <= Math.min(name.box.height, amount.box.height) * .4;
  const eligible = names.flatMap(name => {
    const matches = amounts.filter(amount => aligned(name, amount));
    if (matches.length !== 1 || names.filter(other => aligned(other, matches[0]!)).length !== 1) return [];
    // Any other text on this baseline makes the row ambiguous, including unreadable prices.
    const amount = matches[0]!;
    const blockers = boxes.filter(other => other.id !== name.id && other.id !== amount.id &&
      Math.abs(cy(other) - cy(name)) <= Math.min(other.box.height, name.box.height) * .4);
    return blockers.length ? [] : [{ name, amount }];
  }).sort((a, b) => a.name.box.y - b.name.box.y);
  if (eligible.length < 3) return [];
  // Promote only proven name cells locally; the original parse/text is never changed.
  const nameIds = new Set(eligible.map(pair => pair.name.id));
  const available = parsed.remaining.map(line => nameIds.has(line.id) ? { ...line, kind: 'name' as const } : line);
  const rows = [...parsed.candidates], result: LocalReceiptCandidate[] = [];
  for (const { name, amount } of eligible) {
    if (rows.length >= RECEIPT_MAX_ITEMS) break;
    if (rows.some(row => row.sourceLineIds?.some(id => id === name.id || id === amount.id))) continue;
    const row = pairReceiptLines(available, name.id, amount.id, rows);
    rows.push(row); result.push(row);
  }
  return result;
}
