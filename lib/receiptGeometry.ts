// @ts-expect-error Explicit extensions support Node strip-types evaluation and Metro.
import { parseReceiptCandidates, pairReceiptLines } from './receiptCandidates.ts';
import type { LocalReceiptCandidate } from './receiptCandidates';
// @ts-expect-error Explicit extensions support Node strip-types evaluation and Metro.
import { isNonFoodReceiptName } from './receiptItemNames.ts';
// @ts-expect-error Explicit extensions support Node strip-types evaluation and Metro.
import { RECEIPT_MAX_ITEMS } from './receiptLimits.ts';

/** Local-only OCR positions. Coordinates are normalized with a top-left origin. */
export interface ReceiptTextBox {
  id: string;
  text: string;
  box: { x: number; y: number; width: number; height: number };
}
export function receiptTextBoxes(value: unknown): ReceiptTextBox[] {
  if (!Array.isArray(value) || value.length > 500) throw Error('Invalid receipt layout.');
  let characters = 0;
  return Array.from(value, (line: unknown, index: number) => {
    if (!line || typeof line !== 'object') throw Error('Invalid receipt layout.');
    const { id, text, box } = line as ReceiptTextBox;
    if (id !== `line-${index}` || typeof text !== 'string' || !text.trim() || text !== text.trim() ||
      /[\r\n]/.test(text) || text.length > 10000 || (characters += text.length + 1) > 50001 || !box ||
      ![box.x, box.y, box.width, box.height].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1) ||
      box.width <= 0 || box.height <= 0 || box.x + box.width > 1.000001 || box.y + box.height > 1.000001) {
      throw Error('Invalid receipt layout.');
    }
    return { id, text, box: { ...box } };
  });
}
const centerY = (line: ReceiptTextBox) => line.box.y + line.box.height / 2;
const right = (line: ReceiptTextBox) => line.box.x + line.box.width;
const heading = /^(?:amt|amount|line\s+total|total\s+price)(?:\s*[:(]?\s*(?:INR|Rs\.?|₹|RM|MYR|USD|\$|EUR|€|GBP|£)\s*\)?)?$/i;
const footer = /^(?:sub\s*total|grand\s+total|total(?:\s+(?:due|amount|payable|sales|inclusive))?|cash|payment|balance|change|tax|gst|vat)(?:\b|\s|:)/i;
/** Evaluation proof only: propose direct, same-baseline cells in one labelled amount column.
 * No nearest-price/ordered-text joins, name reconstruction, inferred quantity or auto approval.
 * Repeated headings, missing table boundaries, wrapped/offset names and ambiguity abstain.
 * This is not connected to the string-only mobile OCR adapter.
 */
export function suggestReceiptGeometryPairs(value: unknown): LocalReceiptCandidate[] {
  const lines = receiptTextBoxes(value);
  const parsed = parseReceiptCandidates(lines.map(line => line.text));
  const headers = lines.filter(line => heading.test(line.text)).sort((a, b) => a.box.y - b.box.y);
  if (!headers.length) return [];
  const header = headers[0]!;
  const bottom = lines.filter(line => line.box.y > header.box.y + header.box.height && footer.test(line.text))
    .sort((a, b) => a.box.y - b.box.y)[0];
  if (!bottom) return [];
  // Later tax/payment tables must not supply a second price column to the grocery table.
  if (headers.filter(line => line.box.y < bottom.box.y).length !== 1) return [];
  const byId = new Map(lines.map(line => [line.id, line]));
  const table = parsed.remaining.filter(line => {
    const position = byId.get(line.id)!;
    return position.box.y >= header.box.y + header.box.height &&
      position.box.y + position.box.height <= bottom.box.y;
  });
  const amounts = table.filter(line => line.kind === 'amount').map(line => byId.get(line.id)!)
    .filter(line => Math.abs(right(line) - right(header)) <= Math.min(0.04, header.box.width / 2));
  const names = table.filter(line => line.kind === 'name' && !isNonFoodReceiptName(line.original) &&
    (line.original.match(/\p{L}/gu)?.length ?? 0) >= 3).map(line => byId.get(line.id)!);
  const aligned = (name: ReceiptTextBox, amount: ReceiptTextBox) =>
    right(name) < amount.box.x && Math.abs(centerY(name) - centerY(amount)) <= Math.min(name.box.height, amount.box.height) * 0.35;
  const proposals = amounts.flatMap(amount => {
    const matches = names.filter(name => aligned(name, amount));
    if (matches.length !== 1 || amounts.filter(other => aligned(matches[0]!, other)).length !== 1) return [];
    return [{ name: matches[0]!, amount }];
  });
  const rows: LocalReceiptCandidate[] = [...parsed.candidates];
  const result: LocalReceiptCandidate[] = [];
  for (const proposal of proposals) {
    if (rows.length >= RECEIPT_MAX_ITEMS) break;
    if (rows.some(row => row.sourceLineIds?.some(id => id === proposal.name.id || id === proposal.amount.id))) continue;
    const row = pairReceiptLines(parsed.remaining, proposal.name.id, proposal.amount.id, rows);
    rows.push(row); result.push(row);
  }
  return result;
}
