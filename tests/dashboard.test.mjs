import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../constants/Theme.ts';
import { createDashboardSession, dashboardSummary, dashboardExpiry, dashboardInitials } from '../lib/dashboard.ts';
import { renderDashboard, dashboardFixture } from './helpers/render-dashboard.mjs';

test('Dashboard summarizes the complete active snapshot in exact paise, with unknown/free prices distinct', () => {
  const items = dashboardFixture().state.items;
  const summary = dashboardSummary([...items, { ...items[0], id: 'free', totalCostMinor: 0 }, { ...items[0], status: 'WASTED', totalCostMinor: 999999 }]);
  assert.equal(summary.total, 4); assert.equal(summary.valueMinor, '11000'); assert.equal(summary.priced, 3);
  assert.equal(summary.fresh, 1); assert.equal(summary.priority.length, 3);
  assert.deepEqual(items.map(item => item.id), ['sample-spinach', 'sample-milk', 'sample-watermelon']);
  assert.equal(dashboardSummary(items.map(row => ({ ...row, totalCostMinor: null }))).priced, 0);
});
test('expiry and recent sorting are independent and overdue groceries remain active awaiting review', () => {
  const items = dashboardFixture().state.items;
  const overdue = { ...items[2], id: 'overdue', expiresOn: '2026-10-20', daysLeft: -1, createdAt: '2026-10-21T10:00:00Z' };
  const value = dashboardSummary([...items, overdue]);
  assert.equal(value.active[0].id, 'overdue'); assert.equal(value.recent[0].id, 'overdue');
  assert.equal(value.overdue.length, 1); assert.equal(overdue.status, 'ACTIVE');
  assert.deepEqual([-2, 0, 1, 3].map(dashboardExpiry), ['2d overdue', 'Today', 'Tomorrow', 'In 3 days']);
  assert.equal(dashboardInitials(' Alex Green '), 'AG'); assert.equal(dashboardInitials(''), 'FT');
});
test('focus/account invalidation discards late reads; concurrent refreshes coalesce and errors are redacted', async () => {
  let finish, calls = 0, active = true;
  const store = createDashboardSession(() => { calls++; return new Promise(resolve => { finish = resolve; }); }, () => active);
  const one = store.load(), duplicate = store.load(); assert.equal(one, duplicate);
  await Promise.resolve(); assert.equal(calls, 1);
  active = false; store.invalidate(); finish(dashboardFixture().state.items); await one;
  assert.equal(store.getSnapshot().items, null); assert.equal(store.getSnapshot().status, 'idle');
  const failed = createDashboardSession(async () => { throw Error('private credentials and provider response'); }, () => true);
  await failed.load(); assert.equal(failed.getSnapshot().status, 'error'); assert.doesNotMatch(failed.getSnapshot().error, /private|credentials|provider/);
  let shouldFail = true;
  const retry = createDashboardSession(async () => { if (shouldFail) throw Error('offline'); return []; }, () => true);
  await retry.load(); shouldFail = false; await retry.load(); assert.equal(retry.getSnapshot().status, 'ready');
});
test('blur before dispatch prevents a read and old request completion cannot unlock a newer refresh', async () => {
  let calls = 0;
  const cancelled = createDashboardSession(async () => { calls++; return []; }, () => true);
  const queued = cancelled.load(); cancelled.invalidate(); await queued; assert.equal(calls, 0);
  const finish = [];
  const store = createDashboardSession(() => new Promise(resolve => finish.push(resolve)), () => true);
  const first = store.load(); await Promise.resolve(); store.invalidate();
  const next = store.load(); await Promise.resolve(); finish[0]([]); await first;
  assert.equal(store.getSnapshot().status, 'loading'); assert.equal(store.load(), next);
  finish[1](dashboardFixture().state.items); await next; assert.equal(store.getSnapshot().items.length, 3);
});
test('real Dashboard renders INR/actual counts and all quick actions lead to their intended destinations', () => {
  const actions = [], ids = [], filters = [], modes = [];
  const view = renderDashboard(dashboardFixture({ onAction: action => actions.push(action), onOpenItem: id => ids.push(id), onFilter: value => filters.push(value), onMode: value => modes.push(value) }));
  assert.match(view.markup, /₹110.00/); assert.match(view.markup, /2 of 3 items priced/);
  assert.doesNotMatch(view.markup, /\$42|3 items need attention today|Spoonacular AI|Scanned.*h ago/);
  for (const label of ['Scan receipt', 'Add item', 'Shopping list', 'Open your Insights', 'Open Settings']) view.controls.find(control => control.accessibilityLabel === label).onPress();
  assert.deepEqual(actions, ['scan', 'add', 'shopping', 'insights', 'settings']);
  view.controls.find(control => control.accessibilityLabel === 'Open Baby Spinach, Tomorrow').onPress(); assert.deepEqual(ids, ['sample-spinach']);
  view.controls.filter(control => control.accessibilityRole === 'tab')[1].onPress(); assert.deepEqual(modes, ['shopping']);
});
test('empty/loading/error states do not masquerade as zero inventory and expose a real recovery action', () => {
  const empty = renderDashboard(dashboardFixture({ state: { status: 'ready', items: [], error: '' } }));
  assert.match(empty.markup, /A fresh start/); assert.match(empty.markup, /Add prices to track value/);
  for (const status of ['loading', 'error']) {
    let retried = false;
    const view = renderDashboard(dashboardFixture({ state: { status, items: null, error: 'Connection unavailable.' }, onRefresh: () => { retried = true; } }));
    assert.doesNotMatch(view.markup, /0 items|₹0.00|A fresh start/);
    if (status === 'error') { view.controls.find(control => control.accessibilityLabel === 'Retry Dashboard').onPress(); assert.equal(retried, true); }
  }
});
test('shopping mode uses the shared checkable list and narrow/large-text layouts keep the main controls', () => {
  const checked = [];
  const view = renderDashboard(dashboardFixture({ mode: 'shopping', shopping: [{ name: 'ricotta', checked: false }, { name: 'pasta', checked: true }], onShoppingToggle: name => checked.push(name) }), { width: 320, fontScale: 1.5 });
  assert.match(view.markup, /1 still to pick up/); assert.doesNotMatch(view.markup, /Use these first/);
  assert.match(view.markup, /SHOP SMARTER/); assert.match(view.markup, /Pantry first/);
  view.controls.find(control => control.accessibilityRole === 'checkbox' && control.accessibilityLabel === 'ricotta').onPress(); assert.deepEqual(checked, ['ricotta']);
  assert.ok(view.controls.some(control => control.accessibilityLabel === 'Scan receipt'));
});

test('the actual Home route chooses the real Dashboard without reading demo inventory for a real account', () => {
  const require = createRequire(import.meta.url), web = require('react-native-web');
  const source = ts.transpileModule(readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const modules = {
    'react-native': web, 'expo-router': { router: {} }, '@/constants/Theme': theme, '@/lib/mock': {},
    '@/context/AuthContext': { useAuth: () => ({ state: { demo: false, user: { id: 'actual-account' } } }) },
    '@/context/MockPantryContext': { useMockPantry: () => { throw Error('Real Home must never read demo inventory'); } },
    '@/features/dashboard/LiveDashboardScreen': () => React.createElement('div', null, 'Live household dashboard'),
    '@/components/ScreenHeader': () => null, '@/components/ExpiryBadge': () => null,
    '@/components/RecentPantryItemCard': () => null, '@/components/PantryConfirmation': () => null,
  };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: name => name in modules ? modules[name] : require(name) });
  assert.equal(renderToStaticMarkup(React.createElement(module.exports.default)), '<div>Live household dashboard</div>');
});
