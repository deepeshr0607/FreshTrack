import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_AUTH, applyOtpInput, otpResult, validateCredentials, validateProfile } from '../lib/auth.ts';

test('profile and credentials reject blank names, malformed emails and short passwords', () => {
  assert.ok(validateProfile({ name: '  ', email: 'maya@example.test' }));
  for (const email of ['maya@', 'maya@@example.test', 'maya example@test.io', 'maya']) {
    assert.ok(validateCredentials(email, 'sample-only'));
  }
  assert.ok(validateCredentials('maya@example.test', '12345'));
  assert.equal(validateProfile({ name: ' Maya ', email: ' maya@example.test ' }), '');
  assert.equal(validateCredentials(' maya@example.test ', 'sample-only'), '');
});
test('OTP checks exact six digits and expiry boundary rather than accepting any code', () => {
  const issued = 1000;
  assert.equal(otpResult('12345', issued, issued), 'incomplete');
  assert.equal(otpResult('12345a', issued, issued), 'incomplete');
  assert.equal(otpResult('654321', issued, issued), 'invalid');
  assert.equal(otpResult(DEMO_AUTH.code, issued, issued + DEMO_AUTH.lifetimeMs - 1), 'success');
  assert.equal(otpResult(DEMO_AUTH.code, issued, issued + DEMO_AUTH.lifetimeMs), 'expired');
  assert.equal(otpResult(DEMO_AUTH.code, issued + DEMO_AUTH.lifetimeMs, issued + DEMO_AUTH.lifetimeMs), 'success');
});
test('OTP paste/autofill replaces full row; partial edits respect position and never overflow', () => {
  const blank = Array(6).fill('');
  assert.deepEqual(applyOtpInput(blank, '123 456', 3), ['1', '2', '3', '4', '5', '6']);
  assert.deepEqual(applyOtpInput(blank, 'abc12', 4), ['', '', '', '', '1', '2']);
  assert.deepEqual(applyOtpInput(blank, '12', 5), ['', '', '', '', '', '1']);
  assert.deepEqual(applyOtpInput(['1', '2', '3', '4', '5', '6'], '', 2), ['1', '2', '', '4', '5', '6']);
});
