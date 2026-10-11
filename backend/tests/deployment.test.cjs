const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, cpSync, symlinkSync, rmSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const request = require('supertest');
const { requirePreviewEnvironment } = require('../scripts/deployment.cjs');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
const target = require('../prisma/development-target.json');
const env = {
  NODE_ENV: 'production', VERCEL_ENV: 'preview', APP_ENV: 'preview', ALLOWED_ORIGINS: 'none',
  DATABASE_URL: `postgresql://fixture:fixture@${target.hostname.replace('.', '-pooler.')}/${target.database}?sslmode=require&pgbouncer=true&connection_limit=1&pool_timeout=10`,
  DIRECT_URL: `postgresql://fixture:fixture@${target.hostname}/${target.database}?sslmode=require`,
  NEON_AUTH_URL: `https://${target.hostname.replace('.', '.neonauth.')}/${target.database}/auth`,
};

test('preview configuration uses pinned development, matching auth, bounded pooled connections and explicit origins', () => {
  assert.equal(requirePreviewEnvironment(env).branchId, target.branchId);
  assert.equal(requirePreviewEnvironment({ ...env, ALLOWED_ORIGINS: 'https://freshtrack.example.test' }).branchId, target.branchId);
  assert.throws(() => requireDevelopmentDatabase(env), /DEVELOPMENT_DATABASE_REQUIRED/);
  for (const changes of [{ VERCEL_ENV: 'production' }, { VERCEL_ENV: undefined }, { APP_ENV: 'production' },
    { NODE_ENV: 'development' }, { DATABASE_URL: env.DATABASE_URL.replace('-pooler', '') },
    { DATABASE_URL: env.DATABASE_URL.replace('connection_limit=1', 'connection_limit=20') },
    { DATABASE_URL: env.DATABASE_URL.replace('&pool_timeout=10', '') },
    { DIRECT_URL: env.DIRECT_URL.replace('ep-dry-paper', 'ep-other-paper') },
    { NEON_AUTH_URL: 'https://other.neon.tech/auth' }, { ALLOWED_ORIGINS: '' }, { ALLOWED_ORIGINS: '*' },
    { ALLOWED_ORIGINS: 'http://localhost:8081' }, { ALLOWED_ORIGINS: 'https://app.example.test/path' },
    { ALLOWED_ORIGINS: 'https://fixture.invalid' }, { ALLOWED_ORIGINS: 'https://app.example.test, https://other.example.test' }]) {
    assert.throws(() => requirePreviewEnvironment({ ...env, ...changes }), /PREVIEW_CONFIGURATION_REQUIRED/);
  }
});

test('backend TypeScript compiles in an isolated backend-only project, without the mobile parent types', () => {
  const stage = mkdtempSync(join(tmpdir(), 'freshtrack-backend-build-'));
  try {
    cpSync(join(__dirname, '../src'), join(stage, 'src'), { recursive: true });
    cpSync(join(__dirname, '../tsconfig.json'), join(stage, 'tsconfig.json'));
    symlinkSync(join(__dirname, '../node_modules'), join(stage, 'node_modules'), 'dir');
    execFileSync(process.execPath, [join(__dirname, '../node_modules/typescript/bin/tsc'), '--noEmit'], { cwd: stage, stdio: 'pipe' });
  } finally { rmSync(stage, { recursive: true, force: true }); }
});

test('hosted entry exports an app without listening; health is public, auth is enforced and browser origins are denied', async () => {
  const before = {};
  for (const [key, value] of Object.entries(env)) { before[key] = process.env[key]; process.env[key] = value; }
  const logger = console.error;
  try {
    console.error = () => {};
    const app = require('../index.cjs');
    assert.equal(typeof app, 'function');
    const health = await request(app).get('/api/v1/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.data.environment, 'preview');
    for (const path of ['/api/v1/auth/me', '/api/v1/households/current']) {
      const response = await request(app).get(path);
      assert.equal(response.status, 401);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
      assert.equal(response.body.error.requestId, response.headers['x-request-id']);
    }
    const browser = await request(app).get('/api/v1/health').set('Origin', 'https://other.example.test');
    assert.equal(browser.status, 403);
    assert.equal(browser.body.error.code, 'CORS_REJECTED');
  } finally {
    console.error = logger;
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('deployment build generates Prisma but never migrates/seeds; credential files are excluded', () => {
  const pkg = require('../package.json'), config = require('../vercel.json');
  assert.equal(config.framework, 'express');
  assert.equal(config.installCommand, 'npm ci --include=dev');
  assert.equal(config.buildCommand, 'npm run build:vercel');
  assert.match(pkg.scripts['build:vercel'], /prisma generate/);
  assert.doesNotMatch(pkg.scripts['build:vercel'], /migrate|seed|db push/);
  const exclusions = readFileSync(join(__dirname, '../.vercelignore'), 'utf8').split('\n');
  for (const path of ['.env', '.env.*', '.vercel', 'dist', 'node_modules']) assert.ok(exclusions.includes(path));
});
