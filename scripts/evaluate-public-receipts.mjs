// Local evaluation of three pinned PUBLIC receipts only. Prints counts, never receipt text.
// Inputs stay outside the repository; no database, HTTP, account or import-controller calls.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, manualReceiptCandidate, saveReceiptCandidate, pairReceiptLines } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';

const directory = process.argv[2];
if (!directory) throw Error('Usage: node --experimental-strip-types scripts/evaluate-public-receipts.mjs DIRECTORY');
const samples = [
  { id: '014', purchaseRows: 9, referenceNames: [29, 36, 13, 50, 57, 64, 71, 78, 85], quantities: ['17', ...Array(8).fill('1')],
    visionHash: '827805942696b0ef9fb3e008ec6b4fb507558e33e6c054c00ffbce8795733fb9',
    // Candidate-name origins verified visually against this exact public image/output.
    verifiedCandidateSources: ['line-23', 'line-32'],
    imageHash: '096a23d4824ba6f370defe01768be25a28a39d6fd273391b9e045191443e2956',
    annotationHash: 'cd5bb19370a9af9e95259111356b580386bd01806eb8150b51295c83ae96608e' },
  { id: '031', purchaseRows: 1, referenceNames: [10], quantities: ['1'], verifiedCandidateSources: [],
    visionHash: 'eb4a6da13a0bf32a6a2a8d4ac2c270c0935b9fac85124fd71e894bb3eb9d3f0b',
    imageHash: 'e921f4bca358d8085f5177b5e32ea3bd12b01b1f38a2cbd640f7850ed2abb879',
    annotationHash: 'c45e4b992ba2981bafdba1508419114a53ea1842ff7bfe8aebdd51acf0aa3eee' },
  { id: '000', purchaseRows: 0, referenceNames: [], quantities: [], verifiedCandidateSources: [],
    visionHash: '59c03f2b401116a0cd18d30c8c73924331283f77063c2ce0b377dacfb2f8b571',
    imageHash: '8b85d2c325c68579b53446177602709a8f8faeeec710912f62b6ad369234887c',
    annotationHash: '6d467981bddd86522fb1dcda7c6127975fe2cec2c2d4fa87ca2d7765d4cb461a' },
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = text => text.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');
const results = [];
for (const sample of samples) {
  assert.equal(sha(readFileSync(join(directory, `${sample.id}.jpg`))), sample.imageHash, 'Unexpected image; use the pinned public source.');
  const annotations = readFileSync(join(directory, `${sample.id}.csv`));
  assert.equal(sha(annotations), sample.annotationHash, 'Unexpected public annotations.');
  const reference = annotations.toString('utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(line => line.split(',').slice(8).join(','));
  const lines = JSON.parse(readFileSync(join(directory, `${sample.id}-vision-current.json`), 'utf8'));
  assert.equal(sha(JSON.stringify(lines)), sample.visionHash, 'Vision output changed; manually reassess product-source mappings before scoring.');
  const parsed = parseReceiptCandidates(lines), rows = suggestReceiptNameOnlyItems(parsed);
  const preserved = [...parsed.candidates.map(row => ({ id: row.id, original: row.original })), ...parsed.remaining]
    .sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
  assert.equal(JSON.stringify(preserved.map(row => row.original)) === JSON.stringify(lines), true, 'Recognized strings were not preserved.');
  assert.ok(rows.every(row => !row.reviewed && !row.selected));
  // Strict name-only coverage. One recognized occurrence cannot satisfy two repeated purchases.
  const available = lines.map(normalize);
  let exactNames = 0;
  for (const index of sample.referenceNames) {
    const found = available.indexOf(normalize(reference[index]));
    if (found >= 0) { exactNames++; available.splice(found, 1); }
  }
  // Reproduce explicit manual recovery only; reference names never enter the parser.
  const recovered = sample.referenceNames.map((index, item) => saveReceiptCandidate({
    ...manualReceiptCandidate(`public-${sample.id}-${item}`),
    draft: { name: reference[index], category: 'Other', quantity: sample.quantities[item], unit: 'pack', price: '', expiresOn: '' },
    packageDateReview: { kind: 'unchecked' },
  }, { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' }));
  if (recovered.length) {
    const body = reviewedReceiptInput(recovered);
    assert.equal(body.items.length, sample.purchaseRows);
    assert.ok(body.items.every(row => row.item.totalCostMinor === null && row.item.expirySelection.packageDate === null));
    assert.equal(/original|sourceLineIds|packageDateReview/.test(JSON.stringify(body)), false, 'Local provenance leaked into reviewed fields.');
  }
  if (sample.id === '014') {
    const amount = parsed.remaining.find(row => row.kind === 'amount' && row.original.trim() === '15.25');
    assert.ok(amount);
    const pair = pairReceiptLines(parsed.remaining, 'line-23', amount.id, []);
    assert.equal(pair.currency, 'unsupported'); assert.equal(pair.draft.price, '');
  }
  // Baseline files were written before this change. Their comparison is optional for reruns.
  let before;
  try {
    const baseline = JSON.parse(readFileSync(join(directory, `${sample.id}-baseline-current.json`), 'utf8'));
    assert.equal(baseline.parsed.candidates.length + baseline.parsed.remaining.length, lines.length);
    before = { sameLine: baseline.parsed.candidates.length, suggestions: baseline.rows.length,
      falseSuggestions: baseline.rows.filter(row => !sample.verifiedCandidateSources.includes(row.id)).length };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  results.push({ sample: sample.id, groceryPurchaseRows: sample.purchaseRows, visionStrings: lines.length,
    exactNamesOneToOne: exactNames, sameLineCandidates: parsed.candidates.length,
    nameOnlySuggestions: rows.length - parsed.candidates.length,
    falseSuggestions: rows.filter(row => !sample.verifiedCandidateSources.includes(row.id)).length,
    allStringsPreserved: preserved.length === lines.length,
    foreignStandaloneAmounts: parsed.remaining.filter(row => row.kind === 'amount' && row.currency === 'unsupported').length,
    explicitManualRecoveryRows: recovered.length, before });
}
process.stdout.write(JSON.stringify({ method: 'macOS Vision strings; fixed public samples; not iPhone or broad OCR acceptance', results }, null, 2) + '\n');
