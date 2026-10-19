const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');
const { AuthFailure } = require('../dist/services/auth.js');
const { createOpenFoodFactsProvider, parseBarcodeProduct, BarcodeProviderFailure } = require('../dist/integrations/openFoodFacts.js');
const { packageBarcode } = require('../dist/contracts/barcode.js');
const barcode = '3017620422003', other = '036000291452';
const identity = { id: 'barcode-fixture-account' };
const verifyIdentity = async value => { if (value !== 'a.b.c') throw new AuthFailure(); return identity; };
const agent = 'FreshTrack/1.0 (catalog-tests@freshtrack.invalid)';
const product = (code = barcode) => ({ status: 'success', product: { code, product_name: ' Fixture   Food ', brands: 'Fixture Brand', quantity: '200 g', categories: 'Test category', expiration_date: '2026-10-30', price: 42 } });
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
const provider = options => createOpenFoodFactsProvider({ userAgent: () => agent, environment: () => 'staging', ...options });
const result = () => parseBarcodeProduct(product(), barcode, 'staging');
const appFor = lookup => createApp({ verifyIdentity, barcodeProvider: { lookup } });
const endpoint = `/api/v1/scanner/barcodes/${barcode}`;

test('shared GTIN validation covers supported lengths, leading zeroes and invalid check digits', () => {
  for (const code of ['96385074', other, barcode, '10012345000017']) assert.equal(packageBarcode(code), code);
  for (const code of ['', 'https://example.com', '3017620422004', '301 7620422003', '12345']) assert.equal(packageBarcode(code), null);
});
test('lookup returns minimal labeled community data, never provider expiry or price', async () => {
  const p = provider({ fetch: async (url, options) => {
    assert.equal(url.origin, 'https://world.openfoodfacts.net'); assert.equal(url.pathname, `/api/v3/product/${barcode}`);
    assert.deepEqual(Object.fromEntries(url.searchParams), { fields: 'code,product_name,brands,quantity,categories', product_type: 'food', lc: 'en' });
    assert.deepEqual(options.headers, { Accept: 'application/json', 'User-Agent': agent, Authorization: 'Basic b2ZmOm9mZg==' });
    assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal);
    return json(product());
  } });
  const data = await p.lookup(barcode);
  assert.deepEqual(data.product, { catalogBarcode: barcode, name: 'Fixture Food', brand: 'Fixture Brand', packageSize: '200 g', categoryLabel: 'Test category' });
  assert.equal(data.status, 'FOUND'); assert.equal(data.source.confidence, 'COMMUNITY_UNVERIFIED');
  assert.equal(data.source.license, 'ODbL-1.0'); assert.equal(data.source.environment, 'staging');
  assert.equal(JSON.stringify(data).includes('2026-10-30'), false); assert.equal('price' in data.product, false);
});
test('production uses only fixed production host, with no staging authentication', async () => {
  const p = provider({ environment: () => 'production', fetch: async (url, options) => {
    assert.equal(url.origin, 'https://world.openfoodfacts.org'); assert.equal(options.headers.Authorization, undefined);
    return json(product());
  } });
  const row = await p.lookup(barcode); assert.equal(row.source.url, `https://world.openfoodfacts.org/product/${barcode}`);
});
test('missing/placeholder configuration and invalid input never call upstream', async () => {
  let calls = 0; const fetch = async () => { calls++; throw Error('must not call'); };
  for (const userAgent of ['', 'FreshTrack/1.0 (developer@example.com)', 'FreshTrack/1.0 (bad\n@host.org)', 'other app']) {
    await assert.rejects(provider({ userAgent: () => userAgent, fetch }).lookup(barcode), { code: 'BARCODE_NOT_CONFIGURED' });
  }
  await assert.rejects(provider({ environment: () => 'https://evil.invalid', fetch }).lookup(barcode), { code: 'BARCODE_NOT_CONFIGURED' });
  for (const code of [' 3017620422003', '3017620422004', 'https://evil.invalid', 123, null]) {
    await assert.rejects(provider({ fetch }).lookup(code), { name: 'InvalidApiInput' });
  }
  assert.equal(calls, 0);
});
test('matching zero-padded UPC is accepted; wrong identity, unsafe text and malformed envelopes fail closed', () => {
  assert.equal(parseBarcodeProduct(product('0036000291452'), other, 'staging').product.catalogBarcode, '0036000291452');
  const bad = [null, [], {}, { status: 'failure', product: product().product }, product(other), { ...product(), status: 'success_with_errors' },
    { status: 'success', product: { code: barcode, product_name: '<script>unsafe</script>' } },
    { status: 'success', product: { code: barcode, product_name: 'a'.repeat(161) } },
    { status: 'success', product: { code: barcode, product_name: 'Food', brands: { unsafe: true } } }];
  for (const row of bad) assert.throws(() => parseBarcodeProduct(row, barcode, 'staging'), { code: 'BARCODE_UNAVAILABLE' });
});
test('absent optional fields stay unknown; absent name gives explicit incomplete/manual result', () => {
  const base = { status: 'success', product: { code: barcode, product_name: 'Food' } };
  assert.deepEqual(parseBarcodeProduct(base, barcode, 'staging').product, { catalogBarcode: barcode, name: 'Food', brand: null, packageSize: null, categoryLabel: null });
  delete base.product.product_name;
  const incomplete = parseBarcodeProduct(base, barcode, 'staging');
  assert.equal(incomplete.status, 'INCOMPLETE'); assert.equal(incomplete.product, null);
});
test('404 is unknown only for an explicit product-not-found envelope; outages are errors', async () => {
  const p = provider({ fetch: async () => json({ status: 'failure', result: { id: 'product_not_found' } }, 404) });
  assert.equal((await p.lookup(barcode)).status, 'NOT_FOUND'); assert.equal((await p.lookup(barcode)).product, null);
  for (const response of [json({ error: 'missing route' }, 404), json({ status: 'failure' }, 200), json({}, 500), new Response('redirect', { status: 302 })]) {
    await assert.rejects(provider({ fetch: async () => response }).lookup(barcode), { code: 'BARCODE_UNAVAILABLE' });
  }
});
test('found cache clones data and expires after five minutes; unknown cache expires after one minute', async () => {
  let clock = 1000, calls = 0;
  const p = provider({ now: () => clock, fetch: async () => { calls++; return json(product()); } });
  (await p.lookup(barcode)).product.name = 'mutated';
  assert.equal((await p.lookup(barcode)).product.name, 'Fixture Food'); assert.equal(calls, 1);
  clock += 300001; await p.lookup(barcode); assert.equal(calls, 2);
  calls = 0;
  const missing = provider({ now: () => clock, fetch: async () => { calls++; return json({ status: 'failure', result: { id: 'product_not_found' } }, 404); } });
  await missing.lookup(barcode); clock += 59999; await missing.lookup(barcode); assert.equal(calls, 1);
  clock += 2; await missing.lookup(barcode); assert.equal(calls, 2);
});
test('simultaneous scans coalesce; different requests face process-wide backpressure', async () => {
  let release, calls = 0;
  const p = provider({ fetch: async () => { calls++; await new Promise(resolve => { release = resolve; }); return json(product()); } });
  const first = p.lookup(barcode), second = p.lookup(barcode);
  await assert.rejects(p.lookup(other), { code: 'BARCODE_RATE_LIMITED' });
  release(); const rows = await Promise.all([first, second]); assert.equal(calls, 1);
  rows[0].product.name = 'mutated'; assert.equal(rows[1].product.name, 'Fixture Food');
});
test('429 applies Retry-After cooldown, while errors are not cached', async () => {
  let clock = 1000, calls = 0;
  const p = provider({ now: () => clock, fetch: async () => { calls++; return calls === 1 ? json({}, 429, { 'retry-after': '120' }) : json(product()); } });
  await assert.rejects(p.lookup(barcode), { code: 'BARCODE_RATE_LIMITED' });
  clock += 119999; await assert.rejects(p.lookup(barcode), { code: 'BARCODE_RATE_LIMITED' }); assert.equal(calls, 1);
  clock++; assert.equal((await p.lookup(barcode)).status, 'FOUND'); assert.equal(calls, 2);
});
test('configuration change invalidates cached and in-flight catalog data', async () => {
  let selected = 'staging', release, calls = 0, clock = 1000;
  const p = provider({ now: () => clock, environment: () => selected, fetch: async () => {
    calls++; if (calls === 1) await new Promise(resolve => { release = resolve; }); return json(product());
  } });
  const old = p.lookup(barcode); selected = 'production'; clock += 5001;
  assert.equal((await p.lookup(barcode)).source.environment, 'production');
  release(); await old;
  assert.equal((await p.lookup(barcode)).source.environment, 'production'); assert.equal(calls, 2);
});
test('HTTP-date Retry-After also blocks transport until cooldown ends', async () => {
  let clock = Date.parse('2026-10-19T06:00:00Z'), calls = 0;
  const until = clock + 180000;
  const p = provider({ now: () => clock, fetch: async () => { calls++; return calls === 1 ? json({}, 429, { 'retry-after': new Date(until).toUTCString() }) : json(product()); } });
  await assert.rejects(p.lookup(barcode), { code: 'BARCODE_RATE_LIMITED' });
  clock = until - 1; await assert.rejects(p.lookup(barcode), { code: 'BARCODE_RATE_LIMITED' }); assert.equal(calls, 1);
  clock = until; await p.lookup(barcode); assert.equal(calls, 2);
});
test('oversized declared and streamed bodies, invalid JSON and non-JSON fail safely', async () => {
  for (const response of [json(product(), 200, { 'content-length': '64001' }), new Response('x'.repeat(64001), { headers: { 'content-type': 'application/json' } }),
    new Response('{bad', { headers: { 'content-type': 'application/json' } }), new Response('html')]) {
    await assert.rejects(provider({ fetch: async () => response }).lookup(barcode), { code: 'BARCODE_UNAVAILABLE' });
  }
});
test('timeout aborts upstream; network errors remain generic without raw details', async () => {
  await assert.rejects(provider({ timeoutMs: 5, fetch: async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Error('private upstream details')));
  }) }).lookup(barcode), { code: 'BARCODE_TIMEOUT' });
  await assert.rejects(provider({ fetch: async () => { throw Error('private upstream details'); } }).lookup(barcode), { message: 'BARCODE_UNAVAILABLE' });
});
test('endpoint rejects unsigned callers and invalid selectors before provider work; success is no-store', async () => {
  let calls = 0; const app = appFor(async code => { calls++; assert.equal(code, barcode); return result(); });
  await request(app).get(endpoint).expect(401);
  await request(app).get(endpoint).set('Authorization', 'Bearer bad.token.here').expect(401);
  for (const path of [endpoint + '?userId=other', endpoint + '?barcode=' + barcode, '/api/v1/scanner/barcodes/3017620422004', '/api/v1/scanner/barcodes/%203017620422003']) {
    await request(app).get(path).set('Authorization', 'Bearer a.b.c').expect(400);
  }
  await request(app).get(endpoint).set('Authorization', 'Bearer a.b.c').send({ userId: 'other' }).expect(400);
  assert.equal(calls, 0);
  const res = await request(app).get(endpoint).set('Authorization', 'Bearer a.b.c').expect(200);
  assert.deepEqual(res.body.data, result()); assert.equal(res.headers['cache-control'], 'no-store');
});
test('provider failure codes/messages are safe and lookup rate is bounded per verified account', async () => {
  for (const code of ['BARCODE_NOT_CONFIGURED', 'BARCODE_RATE_LIMITED', 'BARCODE_TIMEOUT', 'BARCODE_UNAVAILABLE']) {
    const app = appFor(async () => { throw new BarcodeProviderFailure(code); });
    const res = await request(app).get(endpoint).set('Authorization', 'Bearer a.b.c').expect(code === 'BARCODE_RATE_LIMITED' ? 429 : 503);
    assert.equal(res.body.error.code, code); assert.ok(res.body.error.requestId); assert.equal('data' in res.body, false);
  }
  let calls = 0; const app = appFor(async () => { calls++; return result(); });
  for (let i = 0; i < 12; i++) await request(app).get(endpoint).set('Authorization', 'Bearer a.b.c').expect(200);
  await request(app).get(endpoint).set('Authorization', 'Bearer a.b.c').expect(429); assert.equal(calls, 12);
});
