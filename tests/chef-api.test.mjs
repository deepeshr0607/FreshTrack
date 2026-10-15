import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChefApi, recipeExternalUrl } from '../lib/chefApi.ts';
import { ingredientWindow, suggestions, detail } from './chef-fixtures.mjs';
test('Chef client uses only backend bearer requests with empty suggestion body and no cookies/provider key', async () => {
  const calls = [];
  const api = createChefApi('https://backend.example.test', async () => 'transient-jwt', false, async (url, options) => {
    calls.push(url); assert.equal(options.headers.Authorization, 'Bearer transient-jwt'); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    assert.equal('x-api-key' in options.headers, false); assert.ok(options.signal instanceof AbortSignal);
    if (url.endsWith('/suggestions')) { assert.equal(options.method, 'POST'); assert.equal(options.body, '{}'); return Response.json({ data: suggestions }); }
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
    return Response.json({ data: url.endsWith('/123') ? { recipe: detail } : ingredientWindow });
  });
  assert.equal((await api.ingredients()).ingredients.length, 1); assert.equal((await api.suggest()).recipes.length, 1);
  assert.equal((await api.detail('123')).id, 123);
  assert.deepEqual(calls, ['https://backend.example.test/api/v1/chef/expiring', 'https://backend.example.test/api/v1/chef/suggestions', 'https://backend.example.test/api/v1/chef/recipes/123']);
});
test('Chef client blocks unsafe API origins and noncanonical or injected recipe IDs before transport', async () => {
  let calls = 0; const fetcher = async () => { calls++; return Response.json({ data: ingredientWindow }); };
  await assert.rejects(createChefApi('http://public.example.test', async () => 'jwt', false, fetcher).ingredients(), { code: 'API_CONFIG' });
  const api = createChefApi('https://backend.example.test', async () => 'jwt', false, fetcher);
  for (const id of ['', '0', '-1', '00123', '1.5', '../123', '123?apiKey=x', '2147483648']) await assert.rejects(api.detail(id), { code: 'RECIPE_NOT_AVAILABLE' });
  assert.equal(calls, 0);
});
test('Chef client shows only fixed safe quota/rate/household/session messages and never server secrets', async () => {
  for (const [code, status] of [['RECIPE_QUOTA_EXHAUSTED', 503], ['RECIPE_RATE_LIMITED', 429], ['HOUSEHOLD_REQUIRED', 409], ['RECIPE_NOT_AVAILABLE', 404], ['UNAUTHORIZED', 401]]) {
    const api = createChefApi('https://backend.example.test', async () => 'jwt', false, async () => Response.json({ error: { code, message: 'private-secret-token-material' } }, { status }));
    await assert.rejects(api.suggest(), error => !error.message.includes('private') && (code === 'UNAUTHORIZED' ? error.code === 'CHEF_HTTP_401' : error.code === code));
  }
});
test('Chef client rejects malformed matches, unrelated recipe IDs and missing provider fields', async () => {
  for (const data of [{}, { ...suggestions, recipes: [{ ...suggestions.recipes[0], match: null }] }, { ...suggestions, recipes: [{ ...suggestions.recipes[0], title: undefined }] }]) {
    await assert.rejects(createChefApi('https://backend.example.test', async () => 'jwt', false, async () => Response.json({ data })).suggest(), { code: 'CHEF_RESPONSE' });
  }
  await assert.rejects(createChefApi('https://backend.example.test', async () => 'jwt', false, async () => Response.json({ data: { recipe: { ...detail, id: 456 } } })).detail('123'), { code: 'CHEF_RESPONSE' });
});
test('Chef transport failures are redacted and provider external links accept only HTTP(S)', async () => {
  const api = createChefApi('https://backend.example.test', async () => 'jwt', false, async () => { throw Error('private-token'); });
  await assert.rejects(api.ingredients(), error => error.code === 'CHEF_NETWORK' && !error.message.includes('private'));
  for (const url of ['javascript:alert(1)', 'file:///private/secret', 'https://user:pass@example.test']) assert.equal(recipeExternalUrl(url), null);
  assert.equal(recipeExternalUrl('https://example.test/recipe'), 'https://example.test/recipe');
});
