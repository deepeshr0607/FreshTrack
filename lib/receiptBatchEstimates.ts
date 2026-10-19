import type { LocalReceiptCandidate } from './receiptCandidates';
import type { ExpirySelection } from '../types/api';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { receiptStorageRules, applyReceiptStorageRule } from './receiptShelfLife.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { RECEIPT_MAX_ITEMS } from './receiptLimits.ts';

export interface ReceiptEstimatePlan {
  purchaseDate: string;
  /** Local-only snapshot; never persisted or sent to the API. */
  expectedRows: string;
  estimates: { rowId: string; name: string; ruleId: string; days: number; expiresOn: string; expirySelection: ExpirySelection }[];
}

export function confirmReceiptPurchaseDate(value: string, today: string): string {
  resolveExpiry({ packageDate: value, userDate: null, preset: null });
  resolveExpiry({ packageDate: today, userDate: null, preset: null });
  if (value > today) throw Error('Purchase date cannot be in the future.');
  return value;
}

export function receiptEstimateOptions(row: LocalReceiptCandidate) {
  if (row.reviewed || row.draft.expiresOn || row.expirySelection) return [];
  return receiptStorageRules(row.draft.name);
}

/** Every choice represents an explicit per-item storage/type confirmation, never select-all. */
export function prepareReceiptEstimateBatch(rows: LocalReceiptCandidate[], date: string, today: string, choices: Record<string, string>): ReceiptEstimatePlan {
  confirmReceiptPurchaseDate(date, today);
  if (rows.length > RECEIPT_MAX_ITEMS || new Set(rows.map(row => row.id)).size !== rows.length) throw Error('Check the receipt review rows.');
  const selected = Object.entries(choices).filter(([, ruleId]) => !!ruleId);
  if (!selected.length) throw Error('Confirm at least one grocery storage condition.');
  const estimates = selected.map(([rowId, ruleId]) => {
    const row = rows.find(value => value.id === rowId);
    const rule = row && receiptEstimateOptions(row).find(value => value.id === ruleId);
    if (!row || !rule) throw Error('A grocery changed or already has an expiry. Review the condition choices again.');
    const fields = applyReceiptStorageRule(row.draft.name, rule.id, date, today, { packageDate: '', userDate: '', baseDate: '', days: '' });
    const preset = { baseDate: fields.baseDate, days: Number(fields.days) };
    const expirySelection: ExpirySelection = { packageDate: null, userDate: null, preset };
    return { rowId, name: row.draft.name, ruleId, days: preset.days, expiresOn: resolveExpiry(expirySelection).expiresOn, expirySelection };
  });
  return { purchaseDate: date, expectedRows: JSON.stringify(rows), estimates };
}

/** Atomic local prefill only: never marks reviewed/selected or overwrites an existing date. */
export function applyReceiptEstimateBatch(rows: LocalReceiptCandidate[], plan: ReceiptEstimatePlan, today: string): LocalReceiptCandidate[] {
  if (JSON.stringify(rows) !== plan.expectedRows) throw Error('Groceries changed after the preview. Review estimates again.');
  if (new Set(plan.estimates.map(value => value.rowId)).size !== plan.estimates.length) throw Error('Duplicate estimate choice.');
  const fresh = prepareReceiptEstimateBatch(rows, plan.purchaseDate, today, Object.fromEntries(plan.estimates.map(value => [value.rowId, value.ruleId])));
  if (JSON.stringify(fresh.estimates) !== JSON.stringify(plan.estimates)) throw Error('Estimate preview changed. Review estimates again.');
  const byId = new Map(fresh.estimates.map(value => [value.rowId, value]));
  return rows.map(row => {
    const estimate = byId.get(row.id);
    return estimate ? { ...row, draft: { ...row.draft, expiresOn: estimate.expiresOn }, expirySelection: estimate.expirySelection } : row;
  });
}
