import type { LocalReceiptCandidate } from './receiptCandidates';
import type { ReceiptTextBox } from './receiptTextBoxes';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, saveReceiptCandidate } from './receiptCandidates.ts';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { receiptColumnProposals } from './receiptColumnReview.ts';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { receiptNameSuggestion } from './receiptNameAliases.ts';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { receiptQuantityHint } from './receiptQuantity.ts';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { recognizeReceiptFood } from './receiptFoodRecognition.ts';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { receiptStorageRules } from './receiptShelfLife.ts';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';
// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { RECEIPT_MAX_ITEMS } from './receiptLimits.ts';

/** A tracking assumption, never a claim about production date, cold chain or food safety. */
export function automaticFreshRule(name: string) {
  const food = recognizeReceiptFood(name), rules = receiptStorageRules(name);
  // Dairy, rice and processed/packaged food go through label review instead.
  return (food.category === 'Produce' || food.category === 'Meat' || food.foodId === 'egg') && rules.length === 1
    ? rules[0]! : null;
}

export function prepareReceiptProduct(row: LocalReceiptCandidate, purchaseDate: string): LocalReceiptCandidate {
  const quantity = receiptQuantityHint(row.draft.name);
  const name = receiptNameSuggestion(quantity?.itemText ?? row.draft.name)?.name ?? quantity?.itemText ?? row.draft.name;
  const food = recognizeReceiptFood(name), rule = automaticFreshRule(name);
  const next: LocalReceiptCandidate = { ...row, selected: true, reviewed: false,
    draft: { ...row.draft, name, category: food.category, quantity: quantity?.quantity ?? '1', unit: quantity?.unit ?? 'piece' } };
  if (!rule) return next;
  try {
    return saveReceiptCandidate({ ...next, packageDateReview: { kind: 'not-applicable' } },
      { packageDate: '', userDate: '', baseDate: purchaseDate, days: String(rule.rangeDays[0]) });
  } catch { return next; } // Invalid OCR fields remain editable instead of crashing the entire haul.
}

/** Apply bounded, unambiguous geometry proposals; retain uncertain text for manual recovery. */
export function receiptProducts(lines: string[], layout: ReceiptTextBox[] | null, purchaseDate: string): LocalReceiptCandidate[] {
  const parsed = parseReceiptCandidates(lines);
  let rows = suggestReceiptNameOnlyItems(parsed);
  if (layout) {
    for (const mode of ['same-row', 'below-code'] as const) {
      for (const proposal of receiptColumnProposals(lines, layout, rows, mode)) {
        const overlaps = new Set(proposal.sourceLineIds);
        if (rows.length >= RECEIPT_MAX_ITEMS && !rows.some(row => row.sourceLineIds?.some(id => overlaps.has(id)))) continue;
        rows = rows.filter(row => !row.sourceLineIds?.some(id => overlaps.has(id)));
        rows.push(proposal);
      }
    }
  }
  return rows.map(row => prepareReceiptProduct(row, purchaseDate));
}

/** Only explicit full calendar dates. No manufacture-date arithmetic or month-only guesses. */
export function packageExpiryDates(lines: string[]): string[] {
  const result = new Set<string>();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const expiry = /\b(?:EXP(?:IRY|IRES|IRATION)?|USE\s*BY|BEST\s*(?:BEFORE|BY)|BBE)\b/i;
  const manufacture = /\b(?:MFG|MFD|MANUFACTURED|MANUFACTURING|PACKED|PKD|PROD(?:UCTION)?)\b/i;
  for (let i = 0; i < Math.min(lines.length, 500); i++) {
    const line = lines[i]!.slice(0, 10000);
    const label = expiry.exec(line);
    if (!label) continue;
    // Never borrow the next line when it is a manufacturing label.
    const next = lines[i + 1] ?? '';
    const text = (line.slice(label.index + label[0].length) + (!manufacture.test(next) ? ` ${next}` : '')).split(manufacture)[0]!;
    const tokens = text.match(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}[-/.]\d{1,2}[-/.](?:\d{4}|\d{2})\b|\b\d{1,2}[\s/-]+[A-Za-z]{3,9}[\s,/-]+(?:\d{4}|\d{2})\b/gi) ?? [];
    for (const token of tokens) {
      let year: string, month: string, day: string;
      const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(token);
      const numeric = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/.exec(token);
      const named = /^(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s,/-]+(\d{4}|\d{2})$/.exec(token);
      if (iso) { year = iso[1]!; month = iso[2]!; day = iso[3]!; }
      else if (numeric) { day = numeric[1]!; month = numeric[2]!; year = numeric[3]!; }
      else if (named) {
        day = named[1]!; year = named[3]!;
        const index = months.indexOf(named[2]!.slice(0, 3).toUpperCase());
        if (index < 0) continue;
        month = String(index + 1);
      } else continue;
      if (year.length === 2) year = `20${year}`;
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      try { resolveExpiry({ packageDate: date, userDate: null, preset: null }); result.add(date); } catch { /* Invalid OCR date: manual correction remains available. */ }
    }
  }
  return [...result].sort();
}
