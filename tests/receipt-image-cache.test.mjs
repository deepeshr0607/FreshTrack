import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createReceiptOcrProbe } from '../lib/receiptOcrProbe.ts';
import { createReceiptImportStorage, createReceiptImportController } from '../lib/receiptImport.ts';
import { createReceiptImageCache, receiptCacheSource, ReceiptImageCacheError, receiptImageDirectory, bindConfirmedReceiptImageCleanup } from '../lib/receiptImageCache.ts';
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'freshtrack-receipt-retention-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const base = pathToFileURL(path.join(directory, 'cache')).href;
  const root = `${base}/${receiptImageDirectory}/`;
  fs.mkdirSync(fileURLToPath(root), { recursive: true });
  let counter = 0;
  const io = {
    list: () => fs.readdirSync(fileURLToPath(root), { withFileTypes: true }).filter(row => row.isFile()).map(row => root + row.name),
    exists: uri => fs.existsSync(fileURLToPath(uri)), remove: uri => fs.rmSync(fileURLToPath(uri), { force: true }),
    transfer: async (source, target, move) => { fs.copyFileSync(fileURLToPath(source), fileURLToPath(target), fs.constants.COPYFILE_EXCL); if (move) fs.unlinkSync(fileURLToPath(source)); },
    name: () => `fixture-${++counter}`,
  };
  const write = (name, content = 'synthetic image bytes') => {
    const filename = path.join(directory, name); fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, content); return pathToFileURL(filename).href;
  };
  return { directory, base, root, io, write, cache: createReceiptImageCache(base, io) };
}
test('cold restart removes only abandoned owned photos, preserving original, SDK/unrelated caches and retry sentinels', async t => {
  const h = fixture(t), original = h.write('Photos/original.jpg'), sdkOther = h.write('cache/ImagePicker/unrelated.jpg'), retry = h.write('secure-store/confirmed-retry.json');
  const owned = await h.cache.adopt(original, 'ready');
  assert.equal(h.io.exists(original), true); assert.equal(h.io.exists(owned), true);
  const unknown = h.write(`cache/${receiptImageDirectory}/unrecognized.txt`);
  const restarted = createReceiptImageCache(h.base, h.io);
  assert.deepEqual(restarted.recover(), { files: 0, inUse: 0, failed: false });
  assert.equal(h.io.exists(owned), false);
  for (const uri of [original, sdkOther, retry, unknown]) assert.equal(h.io.exists(uri), true);
});
test('returned cache copy moves into owned folder; outside-cache original is copied and never deleted', async t => {
  const h = fixture(t), temp = h.write('cache/ImagePicker/returned.png'), original = h.write('Photos/original.heic');
  const raw = await h.cache.adopt(temp, 'input'), ready = await h.cache.adopt(original, 'ready');
  assert.equal(h.io.exists(temp), false); assert.ok(raw.endsWith('.png'));
  assert.equal(h.io.exists(original), true);
  h.cache.release(raw); h.cache.release(ready); h.cache.release(original);
  assert.equal(h.io.exists(original), true); assert.deepEqual(h.cache.status(), { files: 0, inUse: 0, failed: false });
});
test('resume/manual recovery preserves preview and running OCR; final release deletes the photo', async t => {
  const h = fixture(t), uri = await h.cache.adopt(h.write('cache/prepared.jpg'), 'ready');
  h.cache.retain(uri); // Native OCR also uses the file.
  h.cache.release(uri); // Clear/navigation releases the UI preview.
  assert.deepEqual(h.cache.recover(), { files: 1, inUse: 1, failed: false });
  assert.equal(h.io.exists(uri), true);
  h.cache.release(uri); assert.equal(h.io.exists(uri), false);
  h.cache.release(uri); assert.equal(h.cache.status().files, 0);
});
test('in-progress async transfer is protected against a resume sweep', async t => {
  const h = fixture(t); const transfer = h.io.transfer; let finish, created;
  h.io.transfer = async (...args) => { await transfer(...args); created = args[1]; await new Promise(resolve => { finish = resolve; }); };
  const adoption = h.cache.adopt(h.write('cache/prepared.jpg'), 'ready');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.cache.recover().inUse, 1); assert.equal(h.io.exists(created), true);
  finish(); const uri = await adoption; h.cache.release(uri); assert.equal(h.cache.status().files, 0);
});
test('failed deletion remains visible and blocks capture until successful recovery', async t => {
  const h = fixture(t), uri = await h.cache.adopt(h.write('cache/prepared.jpg'), 'ready'), remove = h.io.remove;
  h.io.remove = () => { throw Error('private receipt path'); };
  h.cache.release(uri); assert.deepEqual(h.cache.recover(), { files: 1, inUse: 0, failed: true });
  assert.throws(h.cache.prepare, e => e instanceof ReceiptImageCacheError && !e.message.includes('private receipt'));
  h.io.remove = remove; assert.deepEqual(h.cache.recover(), { files: 0, inUse: 0, failed: false });
});
test('partial transfer failure discards destination without deleting an outside-cache original', async t => {
  const h = fixture(t), original = h.write('Photos/original.jpg'), transfer = h.io.transfer;
  h.io.transfer = async (...args) => { await transfer(...args); throw Error('private SDK details'); };
  await assert.rejects(h.cache.adopt(original, 'ready'), e => e instanceof ReceiptImageCacheError && !e.message.includes('SDK'));
  assert.equal(h.io.exists(original), true); assert.equal(h.cache.status().files, 0);
});
test('listing failure cannot be reported as zero photos or a successful cleanup', t => {
  const h = fixture(t); h.io.list = () => { throw Error('private cache path'); };
  assert.deepEqual(h.cache.recover(), { files: null, inUse: 0, failed: true });
  assert.throws(h.cache.prepare, ReceiptImageCacheError);
});
test('traversal, encoded separators, remote hosts, query/hash and sibling prefixes cannot be deleted as owned files', t => {
  const h = fixture(t), removed = [];
  const invalid = [h.root + '../outside.jpg', h.root + '%2e%2e/outside.jpg', h.root + 'receipt-ready-a.jpg?x=1',
    h.root + 'receipt-ready-a.jpg#x', h.root + 'receipt-ready-a%2f.jpg', h.root + 'nested/receipt-ready-a.jpg',
    h.root + 'receipt-ready-a.jpg/child', h.root.replace('v1/', 'v1-other/') + 'receipt-ready-a.jpg', 'file://remote/receipt-ready-a.jpg'];
  h.io.list = () => invalid; h.io.remove = uri => removed.push(uri);
  assert.equal(h.cache.recover().files, 0); assert.deepEqual(removed, []);
  for (const uri of invalid) { h.cache.release(uri); assert.throws(() => h.cache.retain(uri), ReceiptImageCacheError); }
  assert.deepEqual(removed, []);
});
test('cache source policy rejects escaped paths, Documents/originals, root-as-cache and malformed file URLs', () => {
  const base = 'file:///private/cache/';
  assert.equal(receiptCacheSource(base, base + 'ImagePicker/copy.jpg'), true);
  for (const uri of ['file:///private/cache-other/image.jpg', 'file:///private/Photos/original.jpg', base + '../Photos/original.jpg',
    base + '%2e%2e/Photos/original.jpg', base + 'a%2f..%2fPhotos/image.jpg', base + 'a%00.jpg', base + 'a.jpg?x=1', 'https://example.test/a.jpg', 'file://remote/private/cache/a.jpg']) {
    assert.equal(receiptCacheSource(base, uri), false, uri);
  }
  assert.equal(receiptCacheSource('file:///', 'file:///Photos/original.jpg'), false);
});
test('colliding or already-owned source filenames cannot overwrite or move an active preview', async t => {
  const h = fixture(t); h.io.name = () => 'same';
  const a = h.write('Photos/a.jpg', 'first'), b = h.write('Photos/b.jpg', 'second');
  const uri = await h.cache.adopt(a, 'ready');
  await assert.rejects(h.cache.adopt(b, 'ready'), ReceiptImageCacheError);
  await assert.rejects(h.cache.adopt(uri, 'input'), ReceiptImageCacheError);
  assert.equal(fs.readFileSync(fileURLToPath(uri), 'utf8'), 'first');
  assert.equal(h.cache.status().inUse, 1); h.cache.release(uri);
});
test('confirmation clears actual photo/OCR state while reviewed retry fields survive controller restart', async t => {
  const h = fixture(t), photo = await h.cache.adopt(h.write('cache/prepared.jpg'), 'ready');
  const ocr = createReceiptOcrProbe({ choose: async () => photo, recognize: async () => ['SYNTHETIC RAW RECEIPT'], dispose: uri => h.cache.release(uri) }, () => true);
  await ocr.choose('library'); await ocr.read();
  const values = new Map();
  const storage = createReceiptImportStorage({ get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } }, 'fixture-account');
  const io = { storage, active: () => true, review: async input => ({ rows: input.items.map(row => ({ rowId: row.rowId, matches: [], total: 0, withinHaul: [] })) }), send: async () => assert.fail('Paused local intent must not send') };
  const controller = createReceiptImportController(io, () => 'receipt-fixture-key-12345');
  const stop = bindConfirmedReceiptImageCleanup(controller, ocr.clear);
  const input = { items: [{ rowId: 'milk', item: { name: 'Synthetic Milk', category: 'DAIRY', quantity: '1', unit: 'l', expiresOn: '2026-11-01', totalCostMinor: null } }] };
  await controller.restore(); await controller.review(input); controller.cancel();
  assert.equal(h.io.exists(photo), true); assert.deepEqual(ocr.getSnapshot().lines, ['SYNTHETIC RAW RECEIPT']);
  await controller.review(input); await controller.confirm(true);
  assert.equal(h.io.exists(photo), false); assert.equal(ocr.getSnapshot().image, null); assert.deepEqual(ocr.getSnapshot().lines, []);
  const restarted = createReceiptImportController(io); await restarted.restore();
  assert.equal(restarted.getSnapshot().stage, 'pending');
  assert.equal(restarted.getSnapshot().pending.input.items[0].item.name, 'Synthetic Milk');
  assert.equal(restarted.getSnapshot().pending.key, 'receipt-fixture-key-12345');
  assert.doesNotMatch([...values.values()].join(''), /SYNTHETIC RAW RECEIPT|file:\/\//);
  stop();
});
