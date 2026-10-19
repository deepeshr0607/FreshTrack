// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';

/** Local review declaration only; saved API provenance is the existing expirySource. */
export type ReceiptPackageDateReview =
  | { kind: 'unchecked' | 'unavailable' | 'not-applicable' }
  | { kind: 'printed'; date: string; name: string };

export function confirmPrintedReceiptDate(name: string, date: string): ReceiptPackageDateReview {
  if (name.trim().length < 2 || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) throw Error('Enter the grocery name before checking its printed date.');
  resolveExpiry({ packageDate: date, userDate: null, preset: null });
  return { kind: 'printed', date, name };
}

export function validateReceiptPackageDateReview(name: string, expiry: { expiresOn: string; expirySource: string }, review: ReceiptPackageDateReview): void {
  if (!review || typeof review !== 'object' || Array.isArray(review)) throw Error('Choose a valid package-date review.');
  if (review.kind === 'printed') {
    if (Object.keys(review).some(key => !['kind', 'date', 'name'].includes(key)) || review.name !== name || review.date !== expiry.expiresOn || expiry.expirySource !== 'PACKAGE_DATE') {
      throw Error('The item or printed date changed. Check the printed date again.');
    }
    confirmPrintedReceiptDate(review.name, review.date);
  } else {
    if (!['unchecked', 'unavailable', 'not-applicable'].includes(review.kind) || Object.keys(review).some(key => key !== 'kind')) throw Error('Choose a valid package-date review.');
    if (expiry.expirySource === 'PACKAGE_DATE') throw Error('Confirm that you checked this printed date, or clear it and use a manual date or estimate.');
  }
}

export function receiptPackageDateLabel(review?: ReceiptPackageDateReview): string {
  switch (review?.kind) {
    case 'printed': return 'Printed date checked by you';
    case 'unavailable': return 'Printed date unreadable or unavailable';
    case 'not-applicable': return 'Loose/fresh item · no package date';
    default: return 'Printed date not checked';
  }
}
