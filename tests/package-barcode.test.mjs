import test from 'node:test';
import assert from 'node:assert/strict';
import { packageBarcode, createBarcodeLatch } from '../lib/packageBarcode.ts';

test('retail codes preserve leading zeroes and validate all supported GTIN lengths', () => {
  for (const code of ['96385074', '036000291452', '3017620422003', '10012345000017']) {
    assert.equal(packageBarcode(` ${code} `), code);
    assert.equal(packageBarcode(`${code.slice(0, -1)}${(Number(code.at(-1)) + 1) % 10}`), null);
  }
});
test('QR URLs, malformed codes, unsupported lengths and embedded spaces are rejected', () => {
  for (const code of ['https://example.com', '', '12345', '3017620422x03', '301 7620422003']) {
    assert.equal(packageBarcode(code), null);
  }
});
test('a burst accepts exactly one retail code until explicitly rearmed', () => {
  const latch = createBarcodeLatch();
  assert.equal(latch.accept('3017620422003'), null);
  latch.arm();
  assert.equal(latch.accept('https://example.com'), null);
  assert.equal(latch.accept('3017620422003'), '3017620422003');
  assert.equal(latch.accept('036000291452'), null);
  latch.arm();
  assert.equal(latch.accept('036000291452'), '036000291452');
  latch.arm(); latch.stop();
  assert.equal(latch.accept('3017620422003'), null);
});
