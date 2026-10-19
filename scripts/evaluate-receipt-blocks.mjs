// Local evaluation of pinned PUBLIC OCR positions. No account, HTTP, database or import calls.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { receiptTextBoxes, suggestReceiptBlockPairs } from '../lib/receiptGeometry.ts';
const directory = process.argv[2];
if (!directory) throw Error('Usage: node --experimental-strip-types scripts/evaluate-receipt-blocks.mjs DIRECTORY');
const pinned = JSON.parse(readFileSync(new URL('../docs/Phase_6_Receipt_Geometry_Results.json', import.meta.url), 'utf8')).results;
const annotationHashes = {
  '014': 'cd5bb19370a9af9e95259111356b580386bd01806eb8150b51295c83ae96608e',
  '031': 'c45e4b992ba2981bafdba1508419114a53ea1842ff7bfe8aebdd51acf0aa3eee',
  '000': '6d467981bddd86522fb1dcda7c6127975fe2cec2c2d4fa87ca2d7765d4cb461a',
};
// Human-inspected source/annotation associations, evaluation only; never given to the matcher.
const associations = {
  '014': [
    { sources: ['line-17', 'line-23', 'line-56'], name: 29, amount: 27 },
    { sources: ['line-38', 'line-41', 'line-63'], name: 57, amount: 55 },
    { sources: ['line-42', 'line-45', 'line-65'], name: 64, amount: 62 },
    { sources: ['line-71', 'line-73', 'line-77'], name: 85, amount: 82 },
  ], '031': [], '000': [],
};
const sha = value => createHash('sha256').update(value).digest('hex');
const normalize = text => text.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');
const results = pinned.map(sample => {
  const boxes = receiptTextBoxes(JSON.parse(readFileSync(join(directory, `${sample.sample}-layout.json`), 'utf8')));
  const snapshot = JSON.stringify(boxes);
  assert.equal(sha(snapshot), sample.layoutSha256, 'Geometry changed; reassess public source/annotation associations.');
  const annotationBytes = readFileSync(join(directory, `${sample.sample}.csv`));
  assert.equal(sha(annotationBytes), annotationHashes[sample.sample], 'Public annotations changed.');
  const reference = annotationBytes.toString('utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(line => line.split(',').slice(8).join(','));
  const rows = suggestReceiptBlockPairs(boxes);
  assert.equal(JSON.stringify(boxes) === snapshot, true, 'Original observations changed.');
  let verifiedAssociations = 0, exactNames = 0, exactAmounts = 0, exactNameAndAmount = 0;
  const usedReferences = new Set(), usedSources = new Set();
  for (const row of rows) {
    assert.ok(!row.reviewed && !row.selected && !row.draft.quantity && !row.draft.unit && !row.draft.expiresOn);
    const sources = row.sourceLineIds;
    assert.ok(sources.every(id => !usedSources.has(id)), 'A source was paired twice.');
    sources.forEach(id => usedSources.add(id));
    assert.equal(row.original === sources.map(id => boxes.find(box => box.id === id).text).join('\n'), true, 'Missing original source.');
    const association = associations[sample.sample].find(item => JSON.stringify(item.sources) === JSON.stringify(sources));
    assert.ok(association, 'Unassessed proposal; inspect its public source before scoring.');
    assert.ok(!usedReferences.has(association.name), 'Repeated purchase scored against the same reference row.');
    usedReferences.add(association.name); verifiedAssociations++;
    const exactName = normalize(row.draft.name) === normalize(reference[association.name]);
    const exactAmount = row.detectedPrice === reference[association.amount].trim();
    exactNames += Number(exactName); exactAmounts += Number(exactAmount); exactNameAndAmount += Number(exactName && exactAmount);
    // These public proposals are foreign-currency purchases; never present them as INR.
    assert.equal(row.currency, 'unsupported'); assert.equal(row.draft.price, '');
  }
  return { sample: sample.sample, groceryRows: sample.groceryRows, observations: boxes.length,
    proposedBlockPairs: rows.length, verifiedPurchaseAssociations: verifiedAssociations,
    exactNamesOneToOne: exactNames, exactLineAmounts: exactAmounts, exactNameAndAmount,
    requiresNameCorrection: rows.length - exactNames, falsePurchaseAssociations: rows.length - verifiedAssociations,
    allObservationsUnchanged: true, unknownInrValues: rows.length };
});
process.stdout.write(JSON.stringify({ method: 'Replay of pinned public macOS geometry; below-code layout; phone integration pending', results }, null, 2) + '\n');
