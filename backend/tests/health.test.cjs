const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');

test('GET /api/v1/health returns 200 with status ok', async () => {
  const res = await request(createApp()).get('/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'ok');
  assert.equal(res.body.data.service, 'freshtrack-api');
  assert.equal(typeof res.body.data.timestamp, 'string');
});
