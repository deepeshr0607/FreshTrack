const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
const { fixtures, seedDevelopment } = require('../prisma/seed.cjs');
const target = require('../prisma/development-target.json');

const direct = `postgresql://fixture:dummy@${target.hostname}/${target.database}?sslmode=require`;
const environment = () => ({ NODE_ENV: 'development', APP_ENV: 'development', DIRECT_URL: direct,
  DATABASE_URL: direct.replace(target.hostname, target.hostname.replace('.', '-pooler.')),
  NEON_AUTH_URL: `https://${target.endpointId}.neonauth.c-4.ap-southeast-1.aws.neon.tech/${target.database}/auth` });

test('development tools require the reviewed branch, pooler/direct pair and matching role', () => {
  assert.equal(requireDevelopmentDatabase(environment()).branchId, target.branchId);
  for (const change of [
    { NODE_ENV: 'production' }, { APP_ENV: 'production' }, { VERCEL_ENV: 'preview' },
    { DIRECT_URL: direct.replace(target.endpointId, 'ep-production') },
    { DATABASE_URL: direct }, { DIRECT_URL: direct.replace('neondb', 'otherdb') },
    { DATABASE_URL: environment().DATABASE_URL.replace('fixture:', 'other:') },
    { NEON_AUTH_URL: environment().NEON_AUTH_URL.replace(target.endpointId, 'ep-production') },
    { NEON_AUTH_URL: `https://${target.endpointId}.neonauth.example.com/neondb/auth` },
  ]) assert.throws(() => requireDevelopmentDatabase({ ...environment(), ...change }), /DEVELOPMENT_DATABASE_REQUIRED/);
});

test('development tools reject missing TLS, malformed URLs and schema/certificate overrides', () => {
  for (const value of ['', 'bad', direct.replace('require', 'disable'), `${direct}&schema=neon_auth`,
    `${direct}&options=-csearch_path=neon_auth`, `${direct}&sslcert=ignored`, `${direct}&pgbouncer=false`, `${direct}&sslmode=disable`]) {
    assert.throws(() => requireDevelopmentDatabase({ ...environment(), DIRECT_URL: value }), /DEVELOPMENT_DATABASE_REQUIRED/);
  }
});

test('seed fixtures use synthetic identities, INR paise, exact quantities and Kolkata calendar dates', () => {
  const records = fixtures(new Date('2026-10-11T20:00:00Z'));
  assert.equal(records.length, 2);
  assert.notEqual(records[0].household.id, records[1].household.id);
  for (const record of records) {
    assert.match(record.member.authSubject, /^freshtrack-dev-seed:/);
    assert.equal(record.household.currencyCode, 'INR');
    assert.equal(record.household.timezone, 'Asia/Kolkata');
    assert.equal(record.item.totalCostMinor, 6050);
    assert.equal(record.item.quantity, '0.5');
    assert.equal(record.item.purchaseDate.toISOString(), '2026-10-12T00:00:00.000Z');
    assert.equal(record.item.expiresOn.toISOString(), '2026-10-17T00:00:00.000Z');
    assert.equal(record.preference.notificationEnabled, false);
  }
});

test('seed refuses production and missing opt-in before any database operation', async () => {
  const fakeClient = { $transaction() { assert.fail('Guard must refuse before connecting'); } };
  const keys = [...Object.keys(environment()), 'VERCEL_ENV', 'ALLOW_DEVELOPMENT_SEED'];
  const restore = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, environment());
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEVELOPMENT_SEED = 'true';
    await assert.rejects(seedDevelopment(fakeClient), /DEVELOPMENT_DATABASE_REQUIRED/);
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_DEVELOPMENT_SEED;
    await assert.rejects(seedDevelopment(fakeClient), /DEVELOPMENT_SEED_OPT_IN_REQUIRED/);
  } finally {
    for (const [key, value] of Object.entries(restore)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
