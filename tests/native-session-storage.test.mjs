import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeSessionStorage } from '../lib/nativeSessionStorage.ts';

test('unremembered sessions clear older disk cookies and rotations remain memory-only across restart', async () => {
  let disk = 'fixture-old';
  const secure = { get: async () => disk, set: async (value) => { disk = value; }, clear: async () => { disk = null; } };
  const session = createNativeSessionStorage(secure);
  await session.set('fixture-new', false);
  assert.equal(disk, null);
  assert.equal(await session.get(), 'fixture-new');
  await session.set('fixture-rotated');
  assert.equal(disk, null);
  assert.equal(await session.get(), 'fixture-rotated');
  assert.equal(await createNativeSessionStorage(secure).get(), null);
});
test('remembered cookies survive restart and sign-out clears both memory and secure storage', async () => {
  let disk = null;
  const secure = { get: async () => disk, set: async (value) => { disk = value; }, clear: async () => { disk = null; } };
  const session = createNativeSessionStorage(secure);
  await session.set('fixture-cookie', true);
  assert.equal(await createNativeSessionStorage(secure).get(), 'fixture-cookie');
  await session.clear();
  assert.equal(disk, null);
  assert.equal(await session.get(), null);
});
