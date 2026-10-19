// Local PUBLIC-image layout proof only; no app, database, HTTP or import-controller access.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { receiptTextBoxes, suggestReceiptGeometryPairs } from '../lib/receiptGeometry.ts';
const directory = process.argv[2];
if (!directory) throw Error('Usage: node --experimental-strip-types scripts/evaluate-receipt-geometry.mjs DIRECTORY');
const samples = [
  ['014', 9, '827805942696b0ef9fb3e008ec6b4fb507558e33e6c054c00ffbce8795733fb9'],
  ['031', 1, 'eb4a6da13a0bf32a6a2a8d4ac2c270c0935b9fac85124fd71e894bb3eb9d3f0b'],
  ['000', 0, '59c03f2b401116a0cd18d30c8c73924331283f77063c2ce0b377dacfb2f8b571'],
];
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const results = samples.map(([id, groceryRows, expectedStringsHash]) => {
  const lines = JSON.parse(readFileSync(join(directory, `${id}-vision-current.json`), 'utf8'));
  assert.equal(sha(lines), expectedStringsHash, 'Recognition changed; reassess the pinned public sample.');
  const boxes = receiptTextBoxes(JSON.parse(readFileSync(join(directory, `${id}-layout.json`), 'utf8')));
  assert.equal(JSON.stringify(boxes.map(line => line.text)) === JSON.stringify(lines), true,
    'Geometry must match the exact string projection.');
  const pairs = suggestReceiptGeometryPairs(boxes);
  assert.ok(pairs.every(row => !row.reviewed && !row.selected && !row.draft.expiresOn && !row.draft.quantity));
  const sources = pairs.flatMap(row => row.sourceLineIds);
  assert.equal(new Set(sources).size, sources.length, 'A source was paired more than once.');
  return { sample: id, groceryRows, observations: boxes.length, sameBaselinePairs: pairs.length,
    layoutSha256: sha(boxes), sourceStringsUnchanged: true };
});
process.stdout.write(JSON.stringify({ method: 'Local macOS geometry proof; not connected to the phone scanner', results }, null, 2) + '\n');
