const { PrismaClient } = require('@prisma/client');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');

function fixtures(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const datePart = type => parts.find(part => part.type === type).value;
  const today = new Date(`${datePart('year')}-${datePart('month')}-${datePart('day')}T00:00:00Z`);
  const expiry = new Date(today);
  expiry.setUTCDate(expiry.getUTCDate() + 5);
  return ['a', 'b'].map((suffix, index) => {
    const prefix = index === 0 ? '10000000' : '20000000';
    const id = n => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;
    return {
      household: { id: id(1), name: `FreshTrack development fixture ${suffix}`, currencyCode: 'INR', timezone: 'Asia/Kolkata' },
      member: { id: id(2), householdId: id(1), authSubject: `freshtrack-dev-seed:manager-${suffix}`, role: 'MANAGER' },
      preference: { id: id(3), authSubject: `freshtrack-dev-seed:manager-${suffix}`, notificationEnabled: false },
      item: { id: id(4), householdId: id(1), name: 'Development sample milk', normalizedName: 'development sample milk',
        category: 'DAIRY', quantity: '0.5', unit: 'l', purchaseDate: today, expiresOn: expiry,
        expirySource: 'USER_ENTERED', totalCostMinor: 6050, costSource: 'PURCHASE', currencyCode: 'INR', source: 'MANUAL', status: 'ACTIVE' },
      eventId: id(5),
    };
  });
}

async function seedDevelopment(client) {
  requireDevelopmentDatabase();
  if (process.env.ALLOW_DEVELOPMENT_SEED !== 'true') throw new Error('DEVELOPMENT_SEED_OPT_IN_REQUIRED');
  // Deterministic reserved identities; replay adds nothing and never overwrites real/edited data.
  await client.$transaction(async tx => {
    for (const fixture of fixtures()) {
      const household = await tx.household.upsert({ where: { id: fixture.household.id }, create: fixture.household, update: {} });
      if (household.name !== fixture.household.name || household.currencyCode !== 'INR' || household.timezone !== 'Asia/Kolkata') throw new Error('SEED_IDENTITY_CONFLICT');
      const member = await tx.householdMember.upsert({ where: { authSubject: fixture.member.authSubject }, create: fixture.member, update: {} });
      if (member.householdId !== fixture.household.id || member.id !== fixture.member.id) throw new Error('SEED_IDENTITY_CONFLICT');
      await tx.userPreference.upsert({ where: { authSubject: fixture.member.authSubject }, create: fixture.preference, update: {} });
      const item = await tx.pantryItem.upsert({ where: { id: fixture.item.id }, create: fixture.item, update: {} });
      if (item.householdId !== fixture.household.id) throw new Error('SEED_IDENTITY_CONFLICT');
      await tx.pantryItemEvent.upsert({ where: { id: fixture.eventId }, update: {}, create: {
        id: fixture.eventId, householdId: item.householdId, pantryItemId: item.id, eventType: 'CREATED',
        previousStatus: null, newStatus: item.status, quantity: item.quantity, totalCostMinor: item.totalCostMinor,
        costSource: item.costSource, currencyCode: item.currencyCode, category: item.category, expiresOn: item.expiresOn,
        timezone: fixture.household.timezone, source: 'APP', idempotencyKey: `seed:v1:manager-${fixture.member.authSubject.slice(-1)}`,
      } });
    }
  }, { maxWait: 10000, timeout: 30000 });
}

if (require.main === module) {
  let client;
  (async () => {
    requireDevelopmentDatabase();
    if (process.env.ALLOW_DEVELOPMENT_SEED !== 'true') throw new Error('DEVELOPMENT_SEED_OPT_IN_REQUIRED');
    client = new PrismaClient({ log: [], errorFormat: 'minimal' });
    await seedDevelopment(client);
    console.info(JSON.stringify({ event: 'development_seed_complete', households: 2 }));
  })().catch(() => {
    console.error(JSON.stringify({ event: 'development_seed_failed', code: 'CHECK_DEVELOPMENT_TARGET_AND_MIGRATIONS' }));
    process.exitCode = 1;
  }).finally(async () => {
    if (client) {
      try { await client.$disconnect(); }
      catch {
        console.error(JSON.stringify({ event: 'development_seed_disconnect_failed' }));
        process.exitCode = 1;
      }
    }
  });
}

module.exports = { fixtures, seedDevelopment };
