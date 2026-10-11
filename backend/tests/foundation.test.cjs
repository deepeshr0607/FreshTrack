const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, paginationOffset, pageInfo, InvalidApiInput, success } = require('../dist/lib/api');
const { rupeesToPaise, paiseToRupees, minorAmount, serializeCost, quantityString } = require('../dist/lib/serialization');
const { calendarDate, utcTimestamp, serializeCalendarDate, householdDate, expiryState, planStatusTransition } = require('../dist/lib/inventoryRules');
const { Prisma } = require('@prisma/client');

test('pagination defaults, bounds, offset and empty/out-of-range page metadata', () => {
  assert.deepEqual(parsePagination(new URLSearchParams()), { page: 1, pageSize: 20 });
  const pagination = parsePagination(new URLSearchParams('page=2&pageSize=3'));
  assert.equal(paginationOffset(pagination), 3);
  assert.deepEqual(success({ items: [], pagination: pageInfo(pagination, 7) }), {
    data: { items: [], pagination: { page: 2, pageSize: 3, total: 7, totalPages: 3, hasNextPage: true } },
  });
  assert.equal(pageInfo({ page: 1, pageSize: 20 }, 0).totalPages, 0);
  assert.equal(pageInfo({ page: 5, pageSize: 20 }, 1).hasNextPage, false);
  assert.equal(paginationOffset({ page: 100000, pageSize: 100 }), 9999900);
});

test('pagination rejects ambiguous/unbounded and unrecognized client inputs', () => {
  for (const query of ['page=0', 'page=-1', 'page=01', 'page=1.5', 'page=1e2', 'page=', 'page=100001',
    'pageSize=101', 'pageSize=0', 'page=1&page=2', 'page[]=1', 'userId=other', '__proto__[page]=1', 'page=%20', 'pageSize=Infinity']) {
    assert.throws(() => parsePagination(new URLSearchParams(query)), InvalidApiInput, query);
  }
  for (const pagination of [{ page: 0, pageSize: 20 }, { page: NaN, pageSize: 20 }, { page: 1, pageSize: 101 }, { page: '2', pageSize: 20 }]) {
    assert.throws(() => paginationOffset(pagination), InvalidApiInput);
  }
  for (const total of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => pageInfo({ page: 1, pageSize: 20 }, total), InvalidApiInput);
});

test('rupees round-trip as exact integer paise, including zero and the PostgreSQL Int limit', () => {
  for (const [rupees, paise] of [['0', 0], ['0.01', 1], ['125.50', 12550], ['1.1', 110], ['21474836.47', 2147483647]]) {
    assert.equal(rupeesToPaise(rupees), paise);
    assert.equal(rupeesToPaise(paiseToRupees(paise)), paise);
  }
  for (const amount of ['21474836.48', '1.005', '-1', '01', '₹1', '1,000', '1e2', '', ' 1', '1.', '.5']) {
    assert.throws(() => rupeesToPaise(amount), InvalidApiInput, amount);
  }
  for (const amount of [undefined, '100', 0.1, NaN, Infinity, -1, 2147483648]) assert.throws(() => minorAmount(amount), InvalidApiInput);
  assert.throws(() => paiseToRupees(null), InvalidApiInput);
});

test('unknown, free and estimated cost remain distinct; total is never recomputed from unit cost', () => {
  const unknown = { currencyCode: 'INR', unitCostMinor: null, totalCostMinor: null, costSource: 'UNKNOWN' };
  assert.deepEqual(serializeCost(unknown), unknown);
  const free = { ...unknown, totalCostMinor: 0, costSource: 'PURCHASE' };
  assert.deepEqual(serializeCost(free), free);
  const estimate = { ...unknown, unitCostMinor: 100, totalCostMinor: 75, costSource: 'ESTIMATE' };
  assert.deepEqual(serializeCost(estimate), estimate);
  for (const invalid of [{ ...unknown, totalCostMinor: 0 }, { ...free, totalCostMinor: null },
    { ...unknown, unitCostMinor: 10 }, { ...estimate, currencyCode: 'USD' }, { ...estimate, costSource: 'invented' }]) {
    assert.throws(() => serializeCost(invalid), InvalidApiInput);
  }
});

test('quantities serialize Prisma Decimal exactly without floating-point math or silent rounding', () => {
  for (const [value, expected] of [['0.001', '0.001'], ['1.000', '1'], ['0.500', '0.5'], ['999999999.999', '999999999.999']]) {
    assert.equal(quantityString(new Prisma.Decimal(value).toString()), expected);
  }
  for (const value of ['0', '0.000', '-1', '1.0001', '1000000000', '1e2', '01', '.5', 'NaN', '', ' 1']) {
    assert.throws(() => quantityString(value), InvalidApiInput, value);
  }
});

test('calendar dates reject rollover and serialize without device timezone shifts', () => {
  for (const date of ['2024-02-29', '2026-10-11', '0001-01-01', '9999-12-31']) {
    assert.equal(calendarDate(date), date);
    assert.equal(serializeCalendarDate(new Date(`${date}T00:00:00.000Z`)), date);
  }
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-10-00', '0000-01-01', '2026-1-01', '2026-10-11T00:00:00Z']) {
    assert.throws(() => calendarDate(date), InvalidApiInput, date);
  }
  assert.throws(() => serializeCalendarDate(new Date('2026-10-11T00:00:00+05:30')), InvalidApiInput);
  for (const value of ['invalid', '0000-01-01T00:00:00Z', '+010000-01-01T00:00:00Z']) {
    assert.throws(() => utcTimestamp(new Date(value)), InvalidApiInput);
  }
  assert.equal(utcTimestamp(new Date('2026-10-11T18:30:00+05:30')), '2026-10-11T13:00:00.000Z');
});

test('expiry remains valid through the household day and changes at Kolkata midnight', () => {
  const before = new Date('2026-10-11T18:29:59.999Z'), after = new Date('2026-10-11T18:30:00Z');
  assert.equal(householdDate(before, 'Asia/Kolkata'), '2026-10-11');
  assert.equal(householdDate(after, 'Asia/Kolkata'), '2026-10-12');
  assert.deepEqual(expiryState('2026-10-11', 'Asia/Kolkata', before), { daysLeft: 0, freshness: 'critical', overdue: false });
  assert.deepEqual(expiryState('2026-10-11', 'Asia/Kolkata', after), { daysLeft: -1, freshness: 'expired', overdue: true });
  for (const [days, date, freshness] of [[1, '2026-10-12', 'critical'], [2, '2026-10-13', 'caution'], [6, '2026-10-17', 'caution'], [7, '2026-10-18', 'fresh']]) {
    assert.deepEqual(expiryState(date, 'Asia/Kolkata', before), { daysLeft: days, freshness, overdue: false });
  }
  for (const timezone of ['', 'Invalid/Zone', '+05:30', ' Asia/Kolkata ']) assert.throws(() => householdDate(before, timezone), InvalidApiInput);
});

test('expiry uses calendar days through leap day and DST rather than 24-hour durations', () => {
  assert.equal(expiryState('2024-03-01', 'UTC', new Date('2024-02-28T23:59:00Z')).daysLeft, 2);
  for (const instant of ['2026-03-08T06:59:00Z', '2026-03-08T07:01:00Z', '2026-11-01T05:59:00Z', '2026-11-01T06:01:00Z']) {
    const now = new Date(instant), today = householdDate(now, 'America/New_York');
    assert.equal(expiryState(today, 'America/New_York', now).daysLeft, 0);
  }
  assert.equal(expiryState('2026-03-09', 'America/New_York', new Date('2026-03-08T06:59:00Z')).daysLeft, 1);
});

test('all status actions enforce confirmation, reconciliation, explicit restoration and repeat no-ops', () => {
  const statuses = ['ACTIVE', 'CONSUMED', 'WASTED', 'ASSUMED_CONSUMED'];
  const targets = { consume: 'CONSUMED', waste: 'WASTED', assume: 'ASSUMED_CONSUMED', restore: 'ACTIVE' };
  const allowed = {
    ACTIVE: ['consume', 'waste', 'assume', 'restore'],
    CONSUMED: ['consume', 'restore'], WASTED: ['waste', 'restore'],
    ASSUMED_CONSUMED: ['consume', 'waste', 'assume', 'restore'],
  };
  for (const current of statuses) for (const [action, next] of Object.entries(targets)) {
    if (!allowed[current].includes(action)) assert.throws(() => planStatusTransition(current, action), InvalidApiInput);
    else assert.deepEqual(planStatusTransition(current, action), { previousStatus: current, newStatus: next, changed: current !== next });
  }
  for (const [current, action] of [['invented', 'consume'], ['ACTIVE', '__proto__'], ['ACTIVE', 'delete']]) {
    assert.throws(() => planStatusTransition(current, action), InvalidApiInput);
  }
  // Expiry assessment alone never chooses or mutates an inventory outcome.
  assert.equal('status' in expiryState('2000-01-01', 'UTC', new Date('2026-10-11T00:00:00Z')), false);
});


test('validation failures use a safe shared HTTP envelope and server-owned request ID', async () => {
  const request = require('supertest');
  const { createApp } = require('../dist/app');
  const originalLogger = console.error, logs = [];
  try {
    console.error = value => logs.push(JSON.parse(value));
    const app = createApp({ verifyIdentity: async () => ({ id: 'fixture', email: 'fixture@example.test', name: 'Fixture' }),
      householdService: { bootstrap: async () => { throw new InvalidApiInput('fixture-sensitive-diagnostic'); },
        findForIdentity: async () => null } });
    const response = await request(app).post('/api/v1/households/current').set('Authorization', 'Bearer a.b.c')
      .set('x-request-id', 'fixture-sensitive-id').send({});
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_REQUEST');
    assert.equal(response.body.error.requestId, response.headers['x-request-id']);
    assert.match(response.body.error.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(JSON.stringify(response.body).includes('fixture-sensitive'), false);
    assert.equal(JSON.stringify(logs).includes('fixture-sensitive'), false);
    assert.equal(response.headers['cache-control'], 'no-store');
  } finally { console.error = originalLogger; }
});
