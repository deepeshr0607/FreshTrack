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
/** The first bounded item table only; later tax/payment tables cannot supply prices. */
function receiptGeometryTable(value: unknown) {
  const lines = receiptTextBoxes(value);
  const parsed = parseReceiptCandidates(lines.map(line => line.text));
  const headers = lines.filter(line => heading.test(line.text)).sort((a, b) => a.box.y - b.box.y);
  if (!headers.length) return null;
  const header = headers[0]!;
  const bottom = lines.filter(line => line.box.y > header.box.y + header.box.height && footer.test(line.text))
    .sort((a, b) => a.box.y - b.box.y)[0];
  if (!bottom) return null;
  // Later tax/payment tables must not supply a second price column to the grocery table.
  if (headers.filter(line => line.box.y < bottom.box.y).length !== 1) return null;
  const byId = new Map(lines.map(line => [line.id, line]));
  const table = parsed.remaining.filter(line => {
    const position = byId.get(line.id)!;
    return position.box.y >= header.box.y + header.box.height &&
      position.box.y + position.box.height <= bottom.box.y;
  });
  return { lines, parsed, header, bottom, byId, table };
}
/** Evaluation proof only: propose direct, same-baseline cells in one labelled amount column.
 * No nearest-price/ordered-text joins, name reconstruction, inferred quantity or auto approval.
 * Repeated headings, missing table boundaries, wrapped/offset names and ambiguity abstain.
 * This is not connected to the string-only mobile OCR adapter.
 */
export function suggestReceiptGeometryPairs(value: unknown): LocalReceiptCandidate[] {
  const geometry = receiptGeometryTable(value);
  if (!geometry) return [];
  const { parsed, header, byId, table } = geometry;
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

/** Evaluation-only second layout: code/quantity/amount row followed by one description.
 * Long digit strings are local structural anchors, never catalog lookups or purchase quantities.
 * Every price-row observation (including unreadable prices) bounds its preceding description.
 * Fragmented names, uncertain amounts and incomplete rows remain available for manual review.
 */
export function suggestReceiptBlockPairs(value: unknown): LocalReceiptCandidate[] {
  const geometry = receiptGeometryTable(value);
  if (!geometry) return [];
  const { lines, parsed, header, bottom, table } = geometry;
  const itemHeaders = lines.filter(line => /^(?:item|description|particulars)$/i.test(line.text) &&
    Math.abs(centerY(line) - centerY(header)) <= Math.max(line.box.height, header.box.height) && right(line) < header.box.x);
  if (itemHeaders.length !== 1) return [];
  const itemHeader = itemHeaders[0]!;
  // Include existing same-line candidates as blockers too; never pair around hidden descriptions.
  const positions = lines.filter(line => line.box.y >= header.box.y + header.box.height && line.box.y < bottom.box.y);
  const codes = positions.filter(line => /^\d{8,16}[\p{P}\p{S}]{0,2}(?:\s+\d{1,3})?$/u.test(line.text) &&
    Math.abs(line.box.x - itemHeader.box.x) <= .06 && right(line) < header.box.x)
    .sort((a, b) => a.box.y - b.box.y);
  if (codes.length < 2) return [];
  // Do not strip an uncertain suffix or silently skip an unreadable purchase row.
  const priceCells = positions.filter(line => line.box.x >= header.box.x - .02 && line.box.x < right(header));
  const rows: LocalReceiptCandidate[] = [...parsed.candidates], result: LocalReceiptCandidate[] = [];
  for (const code of codes) {
    if (rows.length >= RECEIPT_MAX_ITEMS) break;
    const nearCode = (line: ReceiptTextBox) => Math.abs(centerY(line) - centerY(code)) <= Math.max(line.box.height, code.box.height) * .8;
    const rowCodes = codes.filter(nearCode);
    const prices = priceCells.filter(nearCode);
    if (rowCodes.length !== 1 || prices.length !== 1) continue;
    const price = prices[0]!;
    if (table.find(line => line.id === price.id)?.kind !== 'amount' || Math.abs(right(price) - right(header)) > .04) continue;
    const next = [...codes, ...priceCells].filter(line => line.box.y > code.box.y + code.box.height * 1.25)
      .sort((a, b) => a.box.y - b.box.y)[0];
    const end = Math.min(bottom.box.y, next?.box.y ?? bottom.box.y);
    if (end - code.box.y > code.box.height * 6) continue;
    // Include even short/non-food fragments in the ambiguity check; never drop them to make a match.
    const descriptions = positions.filter(line => line.id !== code.id && line.id !== price.id &&
      line.box.x < header.box.x && /\p{L}/u.test(line.text) &&
      line.box.y < end && line.box.y + line.box.height > code.box.y + code.box.height);
    if (descriptions.length !== 1) continue;
    const name = descriptions[0]!;
    if (name.box.y < code.box.y + code.box.height || name.box.y + name.box.height > end ||
      right(name) >= price.box.x || isNonFoodReceiptName(name.text) ||
      (name.text.match(/\p{L}/gu)?.length ?? 0) < 3 || table.find(line => line.id === name.id)?.kind !== 'name') continue;
    const sources = [code.id, name.id, price.id];
    if (rows.some(row => row.sourceLineIds?.some(id => sources.includes(id)))) continue;
    const pair = pairReceiptLines(parsed.remaining, name.id, price.id, rows);
    const row = { ...pair, id: `block-${code.id}-${name.id}-${price.id}`,
      original: `${code.text}\n${name.text}\n${price.text}`, sourceLineIds: sources };
    rows.push(row); result.push(row);
  }
  return result;
}
