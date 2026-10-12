import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expiryPreset, expirySelection, resolveExpiry, expiryDraft, kolkataToday } from '../lib/pantryExpiry.ts';
test('normalized whole-word presets and category fallbacks are deterministic; unknown categories have no assumption', () => {
  assert.deepEqual(expiryPreset('  WHOLE Milk (1L)', 'OTHER'), { label: 'milk', days: 7 });
  assert.equal(expiryPreset('Fresh SPINACH', 'PRODUCE').days, 5);
  assert.equal(expiryPreset('Brown bread', 'BAKERY').days, 5);
  assert.equal(expiryPreset('milkshake', 'OTHER'), null);
  assert.equal(expiryPreset('Yogurt', 'DAIRY').label, 'dairy default');
  assert.equal(expiryPreset('Mystery item', 'OTHER'), null);
});
test('calendar addition handles leap years, year boundaries and Kolkata midnight independently of elapsed hours', () => {
  const estimate = (baseDate, days) => resolveExpiry({ packageDate: null, userDate: null, preset: { baseDate, days } });
  assert.equal(estimate('2028-02-28', 2).expiresOn, '2028-03-01');
  assert.equal(estimate('2026-12-30', 5).expiresOn, '2027-01-04');
  assert.equal(estimate('2026-10-12', 7).expiresOn, '2026-10-19');
  assert.equal(kolkataToday(new Date('2026-10-12T18:29:59Z')), '2026-10-12');
  assert.equal(kolkataToday(new Date('2026-10-12T18:30:00Z')), '2026-10-13');
});
test('package overrides manual and estimate, manual overrides estimate; clearing higher choices exposes the estimate', () => {
  const selection = { packageDate: '2026-10-25', userDate: '2026-10-20', preset: { baseDate: '2026-10-12', days: 7 } };
  assert.equal(resolveExpiry(selection).expirySource, 'PACKAGE_DATE');
  assert.equal(resolveExpiry(selection).expiresOn, '2026-10-25');
  const manual = resolveExpiry({ ...selection, packageDate: null });
  assert.equal(manual.expirySource, 'USER_ENTERED'); assert.equal(manual.freshnessPresetDays, null);
  const estimated = resolveExpiry({ ...selection, packageDate: null, userDate: null });
  assert.equal(estimated.expirySource, 'PRESET_ESTIMATE'); assert.equal(estimated.purchaseDate, '2026-10-12');
  assert.equal(estimated.freshnessPresetDays, 7);
});
test('invalid lower-priority dates, injected fields and invalid estimate durations are rejected', () => {
  const valid = { packageDate: '2026-10-25', userDate: null, preset: null };
  for (const fields of [{ userDate: '2026-02-30' }, { userDate: '0000-01-01' }, { ownerId: 'foreign' }, { packageDate: null },
    ...[0, -1, 366, 1.5, '7'].map(days => ({ preset: { baseDate: '2026-10-12', days } })),
    { preset: { baseDate: '9999-12-31', days: 1 } }, { preset: { baseDate: '2026-10-12', days: 7, source: 'verified' } }]) {
    assert.throws(() => resolveExpiry({ ...valid, ...fields }));
  }
  assert.throws(() => expirySelection({ packageDate: '', userDate: '', baseDate: '2026-10-12', days: '1e2' }));
});
test('editor rehydrates chosen provenance and ignores historic estimate base date after manual override', () => {
  const item = { expiresOn: '2026-10-19', purchaseDate: '2026-10-12', freshnessPresetDays: 7, expirySource: 'PRESET_ESTIMATE' };
  assert.equal(resolveExpiry(expirySelection(expiryDraft(item))).expirySource, 'PRESET_ESTIMATE');
  const manual = expiryDraft({ ...item, expirySource: 'USER_ENTERED', freshnessPresetDays: null });
  assert.equal(manual.baseDate, ''); assert.equal(resolveExpiry(expirySelection(manual)).expirySource, 'USER_ENTERED');
  const printed = expiryDraft({ ...item, expirySource: 'PACKAGE_DATE', freshnessPresetDays: null });
  assert.equal(printed.packageDate, item.expiresOn); assert.equal(printed.userDate, '');
});
