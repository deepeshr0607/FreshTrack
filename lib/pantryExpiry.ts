// @ts-expect-error Explicit extension supports Node strip-types tests and Metro.
export { expiryPreset, resolveExpiry } from '../backend/src/contracts/expiry.ts';
// @ts-expect-error Explicit extension supports Node strip-types tests and Metro.
import { resolveExpiry } from '../backend/src/contracts/expiry.ts';
import type { ExpirySelection, PantryItemDto } from '../types/api';
export interface ExpiryDraft { packageDate: string; userDate: string; baseDate: string; days: string }
export function expiryDraft(item?: PantryItemDto): ExpiryDraft {
  return { packageDate: item?.expirySource === 'PACKAGE_DATE' ? item.expiresOn : '',
    userDate: item && item.expirySource !== 'PACKAGE_DATE' && (item.expirySource !== 'PRESET_ESTIMATE' || !item.purchaseDate || !item.freshnessPresetDays) ? item.expiresOn : '',
    baseDate: item?.expirySource === 'PRESET_ESTIMATE' && item.freshnessPresetDays ? item.purchaseDate ?? '' : '',
    days: item?.expirySource === 'PRESET_ESTIMATE' && item.purchaseDate ? item.freshnessPresetDays?.toString() ?? '' : '' };
}
export function expirySelection(draft: ExpiryDraft): ExpirySelection {
  if (draft.days && !/^\d{1,3}$/.test(draft.days)) throw Error('Shelf life must be 1–365 whole days.');
  return { packageDate: draft.packageDate || null, userDate: draft.userDate || null,
    preset: draft.days || draft.baseDate ? { baseDate: draft.baseDate, days: Number(draft.days) } : null };
}
export function kolkataToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** One visible date, retaining the source selection until the user changes it. */
export function expiryDateValue(draft: ExpiryDraft): string {
  try { return resolveExpiry(expirySelection(draft)).expiresOn; } catch { return ''; }
}
export function chooseExpiryDate(draft: ExpiryDraft, date: string): ExpiryDraft {
  return date && date === expiryDateValue(draft) ? draft : { packageDate: '', userDate: date, baseDate: '', days: '' };
}
