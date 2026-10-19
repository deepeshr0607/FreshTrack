import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeonAuth, sessionCookie } from '../lib/neonAuth.ts';

const base = 'https://development.neonauth.neon.tech/neondb/auth';
const origin = 'http://192.168.1.21:8085';
const cookie = '__Secure-neon-auth.session_token=fixture-session%2Esignature';
const user = { id: 'fixture-user', email: 'fixture@example.test', name: 'Fixture' };
const providerUser = { ...user, emailVerified: true };
function setup(responses) {
  let token = null;
  const calls = [];
  const storage = { get: async () => token, set: async (value) => { token = value; }, clear: async () => { token = null; } };
  const fetcher = async (url, options) => {
    calls.push({ url, ...options });
    const result = responses.shift();
    if (result instanceof Error) throw result;
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result.body), { status: result.status || 200, headers: result.headers || {} });
  };
  return { auth: createNeonAuth(base, storage, fetcher, origin), storage, calls, getToken: () => token, fetcher };
}
test('OTP endpoints use the documented flow and session material stays out of identity results', async () => {
  const probe = setup([{ body: { success: true } }, { body: { token: 'fixture-session', user: providerUser }, headers: { 'set-cookie': `${cookie}; Path=/; HttpOnly; Secure` } }, { body: { session: {}, user: providerUser } }]);
  await probe.auth.sendOtp(user.email);
  assert.equal(probe.calls[0].url, `${base}/email-otp/send-verification-otp`);
  assert.deepEqual(JSON.parse(probe.calls[0].body), { email: user.email, type: 'sign-in' });
  assert.deepEqual(await probe.auth.verifyOtp(user.email, '654321', user.name), user);
  // Recreate the client to model a process restart; restore uses secure storage and server verification.
  const restarted = createNeonAuth(base, probe.storage, probe.fetcher, origin);
  assert.deepEqual(await restarted.getSession(), user);
  assert.equal(probe.calls[2].headers.Cookie, cookie);
  assert.equal(probe.calls[2].headers.Origin, origin);
  assert.equal(probe.calls[2].credentials, 'omit');
});
test('incorrect/rate-limited OTP never creates a local session or exposes provider error text', async () => {
  for (const status of [400, 429]) {
    const probe = setup([{ status, body: { code: 'INVALID_OTP', message: 'fixture-sensitive-provider-text' } }]);
    await assert.rejects(probe.auth.verifyOtp(user.email, '654321', user.name), (error) => !error.message.includes('fixture-sensitive'));
    assert.equal(probe.getToken(), null);
  }
});
test('null and unauthorized sessions clear stale secure material', async () => {
  for (const response of [{ body: null }, { status: 401, body: {} }]) {
    const probe = setup([response]);
    await probe.storage.set(cookie);
    assert.equal(await probe.auth.getSession(), null);
    assert.equal(probe.getToken(), null);
  }
});
test('temporary connectivity failures preserve secure material for retry', async () => {
  const probe = setup([new Error('fixture-network-error')]);
  await probe.storage.set(cookie);
  await assert.rejects(probe.auth.getSession(), { code: 'NETWORK' });
  assert.equal(probe.getToken(), cookie);
});
test('sign-out revokes the provider session before clearing storage, and failures permit retry', async () => {
  const probe = setup([new Error('offline'), { body: { success: true } }]);
  await probe.storage.set(cookie);
  await assert.rejects(probe.auth.signOut(), { code: 'NETWORK' });
  assert.equal(probe.getToken(), cookie);
  await probe.auth.signOut();
  assert.equal(probe.getToken(), null);
  assert.equal(probe.calls[1].url, `${base}/sign-out`);
});
test('storage failure attempts provider cleanup; malformed input never makes a request', async () => {
  const probe = setup([{ body: { token: 'fixture-session', user: providerUser }, headers: { 'set-cookie': `${cookie}; Path=/; HttpOnly; Secure` } }, { body: { success: true } }]);
  probe.storage.set = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(probe.auth.verifyOtp(user.email, '654321', user.name), { code: 'STORAGE' });
  assert.equal(probe.calls[1].url, `${base}/sign-out`);
  const invalid = setup([]);
  await assert.rejects(invalid.auth.sendOtp('invalid'), { code: 'EMAIL' });
  await assert.rejects(invalid.auth.verifyOtp(user.email, '12345', user.name), { code: 'OTP' });
  assert.equal(invalid.calls.length, 0);
  assert.throws(() => createNeonAuth('http://untrusted.example', invalid.storage), { code: 'CONFIG' });
});

test('provider signed cookies survive combined headers with Expires; unrelated/deleted cookies are ignored', () => {
  const headers = new Headers({ 'set-cookie': `unrelated=ignored; Expires=Wed, 01 Jan 2031 00:00:00 GMT, ${cookie}; Path=/; HttpOnly; Secure` });
  assert.equal(sessionCookie(headers), cookie);
  assert.equal(sessionCookie(new Headers({ 'set-cookie': `${cookie}; Max-Age=0` })), null);
  assert.equal(sessionCookie(new Headers({ 'set-cookie': `${cookie}; Expires=Wed, 01 Jan 2000 00:00:00 GMT` })), null);
  assert.equal(sessionCookie(new Headers({ 'set-cookie': 'unrelated=ignored' })), null);
});
test('OTP acceptance without exposed provider cookie cannot claim a persistent session', async () => {
  const probe = setup([{ body: { token: 'fixture-session', user: providerUser } }]);
  await assert.rejects(probe.auth.verifyOtp(user.email, '654321', user.name), { code: 'COOKIE' });
  assert.equal(probe.getToken(), null);
});

const verifiedUser = { ...user, emailVerified: true };
test('password sign-up requests only one verification email and never persists an unverified session', async () => {
  const probe = setup([{ body: { user: { ...user, emailVerified: false }, token: null } }]);
  await probe.auth.signUp(user.name, user.email, 'fixture-password');
  assert.equal(probe.calls.length, 1);
  assert.equal(probe.calls[0].url, `${base}/sign-up/email`);
  assert.deepEqual(JSON.parse(probe.calls[0].body), { name: user.name, email: user.email, password: 'fixture-password' });
  assert.equal(probe.getToken(), null);
});
test('verification resend uses email-verification rather than passwordless sign-in', async () => {
  const probe = setup([{ body: { success: true } }]);
  await probe.auth.sendVerificationOtp(user.email);
  assert.deepEqual(JSON.parse(probe.calls[0].body), { email: user.email, type: 'email-verification' });
});
test('email verification accepts provider cookie or finishes at login when auto-sign-in is disabled', async () => {
  for (const autoSignIn of [true, false]) {
    const probe = setup([{ body: { status: true, user: verifiedUser, token: autoSignIn ? 'fixture-token' : null }, headers: autoSignIn ? { 'set-cookie': cookie } : {} }]);
    assert.deepEqual(await probe.auth.verifyEmail(user.email, '654321'), autoSignIn ? user : null);
    assert.equal(probe.calls[0].url, `${base}/email-otp/verify-email`);
    assert.deepEqual(JSON.parse(probe.calls[0].body), { email: user.email, otp: '654321' });
    assert.equal(probe.getToken(), autoSignIn ? cookie : null);
  }
});
test('password login preserves remember choice and rejects unverified identity before storing a cookie', async () => {
  const probe = setup([{ body: { user: verifiedUser }, headers: { 'set-cookie': cookie } }]);
  let remembered;
  probe.storage.set = async (_cookie, persist) => { remembered = persist; };
  assert.deepEqual(await probe.auth.signIn(user.email, 'fixture-password', false), user);
  assert.equal(remembered, false);
  assert.deepEqual(JSON.parse(probe.calls[0].body), { email: user.email, password: 'fixture-password', rememberMe: false });
  const unverified = setup([{ body: { user: { ...user, emailVerified: false } }, headers: { 'set-cookie': cookie } }]);
  await assert.rejects(unverified.auth.signIn(user.email, 'fixture-password', true), { code: 'EMAIL_NOT_VERIFIED' });
  assert.equal(unverified.getToken(), null);
});
test('verification failures and malformed responses never create sessions', async () => {
  for (const response of [
    { status: 400, body: { code: 'INVALID_OTP' } },
    { body: { status: false, user: verifiedUser } },
    { body: { status: true, user: { ...user, emailVerified: false } } },
  ]) {
    const probe = setup([response]);
    await assert.rejects(probe.auth.verifyEmail(user.email, '654321'));
    assert.equal(probe.getToken(), null);
  }
});
test('password and email validation reject invalid input without contacting Neon', async () => {
  const probe = setup([]);
  await assert.rejects(probe.auth.signUp('', user.email, 'fixture-password'), { code: 'NAME' });
  await assert.rejects(probe.auth.signUp(user.name, user.email, 'short'), { code: 'PASSWORD' });
  await assert.rejects(probe.auth.signIn(user.email, 'x'.repeat(129), true), { code: 'PASSWORD' });
  await assert.rejects(probe.auth.verifyEmail('invalid', '654321'), { code: 'EMAIL' });
  assert.equal(probe.calls.length, 0);
});
test('unverified and incorrect password provider errors retain safe actionable codes without raw text', async () => {
  for (const code of ['EMAIL_NOT_VERIFIED', 'INVALID_EMAIL_OR_PASSWORD']) {
    const probe = setup([{ status: code === 'EMAIL_NOT_VERIFIED' ? 403 : 401, body: { code, message: 'fixture-sensitive-text' } }]);
    await assert.rejects(probe.auth.signIn(user.email, 'fixture-password', true), (error) => error.code === code && !error.message.includes('fixture-sensitive'));
  }
});

test('expired/reused/attempt-limited provider rejections never save a session; a fresh code can retry', async () => {
  for (const code of ['OTP_EXPIRED', 'INVALID_OTP', 'TOO_MANY_ATTEMPTS']) {
    const probe = setup([
      { status: 400, body: { code, message: 'sensitive-provider-content' }, headers: { 'set-cookie': cookie } },
      { body: { token: 'opaque', user: providerUser }, headers: { 'set-cookie': cookie } },
    ]);
    await assert.rejects(probe.auth.verifyOtp(user.email, '654321', user.name), (error) => error.code === code && !error.message.includes('sensitive'));
    assert.equal(probe.getToken(), null);
    assert.deepEqual(await probe.auth.verifyOtp(user.email, '123456', user.name), user);
  }
});
test('non-JSON 401 clears stale cookies; non-JSON rate limits retain a safe actionable label', async () => {
  const expired = setup([new Response('<html>private gateway</html>', { status: 401 })]);
  await expired.storage.set(cookie);
  assert.equal(await expired.auth.getSession(), null);
  assert.equal(expired.getToken(), null);
  const limited = setup([new Response('private gateway', { status: 429 })]);
  await assert.rejects(limited.auth.sendOtp(user.email), (error) => error.code === 'TOO_MANY_ATTEMPTS' && !error.message.includes('private'));
  assert.equal(limited.getToken(), null);
});
test('offline resend, malformed responses and provider outages preserve cookies and can recover', async () => {
  const probe = setup([new Error('private transport'), new Response('gateway', { status: 503 }), new Response('invalid', { status: 200 }),
    { body: { session: {}, user: providerUser } }]);
  await probe.storage.set(cookie);
  await assert.rejects(probe.auth.sendVerificationOtp(user.email), { code: 'NETWORK' });
  assert.equal(probe.getToken(), cookie);
  await assert.rejects(probe.auth.getSession(), { code: 'HTTP_503' });
  assert.equal(probe.getToken(), cookie);
  await assert.rejects(probe.auth.getSession(), { code: 'INVALID_RESPONSE' });
  assert.equal(probe.getToken(), cookie);
  assert.deepEqual(await probe.auth.getSession(), user);
});
test('unverified or banned provider identities cannot sign in or restore private access', async () => {
  for (const invalid of [{ ...providerUser, emailVerified: false }, { ...providerUser, banned: true }]) {
    const probe = setup([{ body: { user: invalid }, headers: { 'set-cookie': cookie } }, { body: { session: {}, user: invalid } }]);
    await assert.rejects(probe.auth.verifyOtp(user.email, '654321', user.name));
    assert.equal(probe.getToken(), null);
    await probe.storage.set(cookie);
    assert.equal(await probe.auth.getSession(), null);
    assert.equal(probe.getToken(), null);
  }
});
test('only allowlisted provider codes reach the user; prototype/object keys cannot become messages', async () => {
  for (const code of ['secret-like-provider-code', 'constructor', 'toString']) {
    const probe = setup([{ status: 400, body: { code, message: 'private' } }]);
    await assert.rejects(probe.auth.verifyOtp(user.email, '654321', user.name), (error) => error.code === 'HTTP_400' && !error.message.includes('private'));
  }
});

test('account deletion verifies password and requires explicit User deleted acknowledgement before clearing a cookie', async () => {
  const probe = setup([{ body: { status: true } }, { body: { success: true, message: 'Verification email sent' } },
    { body: { success: true, message: 'User deleted' } }]);
  await probe.storage.set(cookie);
  await probe.auth.verifyPassword('fixture-password');
  assert.equal(probe.calls[0].url, `${base}/verify-password`);
  await assert.rejects(probe.auth.deleteUser('fixture-password'), { code: 'DELETION_PENDING' });
  assert.equal(probe.getToken(), cookie);
  await probe.auth.deleteUser('fixture-password');
  assert.equal(probe.getToken(), null);
  assert.equal(probe.calls[2].url, `${base}/delete-user`);
});
test('failed password verification and deletion never clear provider material or report success', async () => {
  const probe = setup([{ body: { status: false } }, { status: 403, body: { code: 'USER_DELETION_DISABLED', message: 'private-provider-message' } }]);
  await probe.storage.set(cookie);
  await assert.rejects(probe.auth.verifyPassword('fixture-password'), { code: 'INVALID_PASSWORD' });
  await assert.rejects(probe.auth.deleteUser('fixture-password'), error => error.code === 'USER_DELETION_DISABLED' && !error.message.includes('private-provider'));
  assert.equal(probe.getToken(), cookie);
});
