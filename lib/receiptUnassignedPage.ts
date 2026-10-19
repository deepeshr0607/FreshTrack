import type { LocalReceiptCandidate, ReceiptParseResult } from './receiptCandidates';
// @ts-expect-error Explicit extension supports Node strip-types tests and Metro.
import { usedReceiptLineIds } from './receiptCandidates.ts';
/** Keep original IDs/global matching choices while mounting only ten unassigned cards. */
export function receiptUnassignedPage(parsed: ReceiptParseResult, rows: LocalReceiptCandidate[], requestedPage: number) {
  const used = usedReceiptLineIds(rows);
  const remaining = parsed.remaining.filter(line => !used.has(line.id));
  const pages = Math.max(1, Math.ceil(remaining.length / 10));
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(Math.floor(requestedPage), pages - 1)) : 0;
  const start = remaining.length ? page * 10 + 1 : 0;
  const end = Math.min((page + 1) * 10, remaining.length);
  return { remaining, visible: remaining.slice(page * 10, end), page, pages, start, end };
}
