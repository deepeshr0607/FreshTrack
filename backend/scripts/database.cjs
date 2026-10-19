const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { requireDevelopmentDatabase } = require('./development-database.cjs');

async function authStructure(client) {
  // Schema-only fingerprint: no provider account/session rows or secrets are read.
  const columns = await client.$queryRaw`SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema = 'neon_auth' ORDER BY table_name, ordinal_position`;
  const indexes = await client.$queryRaw`SELECT tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'neon_auth' ORDER BY tablename, indexname`;
  const constraints = await client.$queryRaw`SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'neon_auth' ORDER BY c.conname, definition`;
  return createHash('sha256').update(JSON.stringify({ columns, indexes, constraints })).digest('hex');
}

async function main() {
  const target = requireDevelopmentDatabase();
  const action = process.argv[2];
  if (!['preflight', 'check', 'migrate', 'status'].includes(action)) throw new Error('INVALID_DATABASE_COMMAND');
  if (action === 'migrate' && process.env.ALLOW_DEVELOPMENT_MIGRATIONS !== 'true') throw new Error('MIGRATION_OPT_IN_REQUIRED');
  const direct = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } }, log: [], errorFormat: 'minimal' });
  try {
    const result = await direct.$queryRaw`SELECT current_database() AS database`;
    if (result[0].database !== target.database) throw new Error('WRONG_DATABASE');
    const before = await authStructure(direct);
    if (action === 'preflight') {
      const tables = await direct.$queryRaw`SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
      console.info(JSON.stringify({ event: 'development_database_preflight', applicationTableCount: tables.length }));
    } else if (action === 'check') {
      const { prisma } = require('../dist/lib/prisma.js');
      const { checkDatabaseReadiness } = require('../dist/lib/database.js');
      try {
        if (!(await checkDatabaseReadiness())) throw new Error('DATABASE_NOT_READY');
      } finally { await prisma.$disconnect(); }
    } else {
      if (action === 'migrate') {
        const tables = await direct.$queryRaw`SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
        const allowed = new Set(['_prisma_migrations', 'Household', 'HouseholdMember', 'PantryItem', 'PantryItemEvent', 'ReceiptScan', 'UserPreference', 'AccountDeletion']);
        if (tables.some(table => !allowed.has(table.table_name))) throw new Error('UNEXPECTED_APPLICATION_TABLES');
      }
      const run = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', action === 'migrate' ? 'deploy' : 'status'],
        { env: process.env, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024 });
      // Prisma CLI output/driver errors may include connection details: never relay them.
      if (run.status !== 0) throw new Error('PRISMA_COMMAND_FAILED');
    }
    if (await authStructure(direct) !== before) throw new Error('AUTH_SCHEMA_CHANGED');
    console.info(JSON.stringify({ event: `development_database_${action}_passed`, branch: target.branchName, authSchemaUnchanged: true }));
  } finally { await direct.$disconnect(); }
}

main().catch(error => {
  const code = /^P\d{4}$/.test(error?.code || '') ? error.code
    : ['DEVELOPMENT_DATABASE_REQUIRED', 'DATABASE_NOT_READY', 'WRONG_DATABASE', 'AUTH_SCHEMA_CHANGED',
      'MIGRATION_OPT_IN_REQUIRED', 'UNEXPECTED_APPLICATION_TABLES', 'PRISMA_COMMAND_FAILED'].includes(error?.message)
      ? error.message : 'CHECK_TARGET_CONNECTION_AND_MIGRATIONS';
  console.error(JSON.stringify({ event: 'development_database_check_failed', code }));
  process.exitCode = 1;
});
