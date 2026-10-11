const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
const { fixtures, seedDevelopment } = require('../prisma/seed.cjs');

requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_SEED !== 'true') throw new Error('DEVELOPMENT_SEED_OPT_IN_REQUIRED');

test('development seed replay preserves its two synthetic households and adds no duplicate history', async () => {
  const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
  const householdIds = fixtures().map(fixture => fixture.household.id);
  const subjects = fixtures().map(fixture => fixture.member.authSubject);
  async function snapshot() {
    return {
      households: await db.household.findMany({ where: { id: { in: householdIds } }, orderBy: { id: 'asc' } }),
      members: await db.householdMember.findMany({ where: { authSubject: { in: subjects } }, orderBy: { id: 'asc' } }),
      preferences: await db.userPreference.findMany({ where: { authSubject: { in: subjects } }, orderBy: { id: 'asc' } }),
      items: await db.pantryItem.findMany({ where: { householdId: { in: householdIds } }, orderBy: { id: 'asc' } }),
      events: await db.pantryItemEvent.findMany({ where: { householdId: { in: householdIds } }, orderBy: { id: 'asc' } }),
    };
  }
  try {
    await seedDevelopment(db);
    const first = await snapshot();
    await seedDevelopment(db);
    assert.deepEqual(await snapshot(), first);
    for (const rows of Object.values(first)) assert.equal(rows.length, 2);
    assert.equal(first.events[0].eventType, 'CREATED');
    assert.equal(first.events[0].totalCostMinor, 6050);
    assert.equal(await db.householdMember.count({ where: { authSubject: { startsWith: 'freshtrack-dev-test:' } } }), 0,
      'Rollback-only integration fixtures must not remain');
  } catch (error) {
    if (error?.name === 'AssertionError') throw error;
    throw new Error('DEVELOPMENT_SEED_INTEGRATION_FAILED');
  } finally { await db.$disconnect(); }
});
