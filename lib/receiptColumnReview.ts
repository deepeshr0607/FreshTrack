// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { receiptTextBoxes, suggestReceiptGeometryPairs, suggestReceiptBlockPairs } from './receiptGeometry.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { RECEIPT_MAX_ITEMS } from './receiptLimits.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { suggestUnlabelledReceiptPairs } from './receiptUnlabelledRows.ts';
import type { LocalReceiptCandidate } from './receiptCandidates';
export type ReceiptColumnMode = 'same-row' | 'below-code';
/** Proposals only: never modify, select or replace a grocery until its editor is explicitly saved. */
export function receiptColumnProposals(lines: string[], value: unknown, rows: LocalReceiptCandidate[], mode: ReceiptColumnMode): LocalReceiptCandidate[] {
  if (mode !== 'same-row' && mode !== 'below-code') return [];
  try {
    const boxes = receiptTextBoxes(value);
    if (boxes.length !== lines.length || boxes.some((box, i) => box.text !== lines[i])) return [];
    const proposals = mode === 'same-row' ? [...suggestReceiptGeometryPairs(boxes), ...suggestUnlabelledReceiptPairs(boxes)] : suggestReceiptBlockPairs(boxes);
    return proposals.flatMap(proposal => {
      const conflicts = rows.filter(row => row.sourceLineIds?.some(id => proposal.sourceLineIds?.includes(id)));
      if (!conflicts.length) return rows.length < RECEIPT_MAX_ITEMS ? [proposal] : [];
      if (conflicts.length !== 1) return [];
      const current = conflicts[0]!;
      // Only a pristine name-only suggestion can be upgraded. Preserve reviewed, excluded,
      // estimated or otherwise edited rows, even when they overlap a better-looking match.
      if (current.sourceLineIds?.length !== 1 || !proposal.sourceLineIds?.includes(current.sourceLineIds[0]!) ||
        current.reviewed || current.selected || current.detectedPrice !== null || current.expirySelection || current.packageDateReview ||
        current.draft.name !== proposal.draft.name || current.draft.category !== 'Other' ||
        current.draft.quantity || current.draft.unit || current.draft.price || current.draft.expiresOn) return [];
      return [{ ...proposal, id: current.id }];
    });
  } catch { return []; } // Bad/mismatched geometry falls back to existing manual matching.
}
