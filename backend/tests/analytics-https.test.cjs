const { test } = require('node:test');
const assert = require('node:assert/strict');
const target = require('../prisma/development-target.json');
const { createAnalyticsHttpsQuery } = require('./analytics-https.cjs');
test('optional synthetic HTTPS test transport pins the development host and redacts credentials/errors', async () => {
  const keys = ['NODE_ENV', 'APP_ENV', 'VERCEL_ENV', 'DATABASE_URL', 'DIRECT_URL', 'NEON_AUTH_URL', 'ALLOW_DEVELOPMENT_DATABASE_TESTS'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, { NODE_ENV: 'development', APP_ENV: 'development', ALLOW_DEVELOPMENT_DATABASE_TESTS: 'true',
      DIRECT_URL: `postgresql://fixture:dummy@${target.hostname}/${target.database}?sslmode=require`,
      DATABASE_URL: `postgresql://fixture:dummy@${target.hostname.replace('.', '-pooler.')}/${target.database}?sslmode=require`,
      NEON_AUTH_URL: `https://${target.hostname.replace('.', '.neonauth.')}/${target.database}/auth` });
    delete process.env.VERCEL_ENV;
    let calls = 0;
    const sql = { text: 'WITH "HouseholdMember" AS (SELECT $1), "PantryItemEvent" (id, x) AS (VALUES ($2, $3)) SELECT 1', values: ['fixture', 'one', 12] };
    const query = createAnalyticsHttpsQuery(async (url, options) => {
      calls++; assert.equal(url, `https://${target.hostname.replace('.', '-pooler.')}/sql`);
      assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
      assert.equal(options.headers['Neon-Connection-String'], process.env.DATABASE_URL);
      assert.deepEqual(JSON.parse(options.body), { query: sql.text, params: sql.values });
      return Response.json({ fields: [{ name: 'count' }], rows: [['1']] });
    });
    assert.deepEqual(await query(sql), [{ count: '1' }]);
    await assert.rejects(query({ text: 'SELECT * FROM "PantryItemEvent"', values: [] }), /SYNTHETIC_ANALYTICS_QUERY_REQUIRED/); assert.equal(calls, 1);
    const failed = createAnalyticsHttpsQuery(async () => { throw Error(process.env.DATABASE_URL); });
    await assert.rejects(failed(sql), error => error.message === 'ANALYTICS_HTTPS_SQL_UNAVAILABLE');
    process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS = 'false'; assert.throws(() => createAnalyticsHttpsQuery(), /OPT_IN_REQUIRED/);
    process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS = 'true'; process.env.APP_ENV = 'production'; assert.throws(() => createAnalyticsHttpsQuery(), /DEVELOPMENT_DATABASE_REQUIRED/);
  } finally { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
});
