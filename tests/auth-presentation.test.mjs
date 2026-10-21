import test from 'node:test';
import assert from 'node:assert/strict';
import { authHarness } from './helpers/render-auth.mjs';
const button = (view, label) => view.controls.find(c => c.accessibilityLabel === label);
const field = (view, label, value) => view.inputs.find(c => c.accessibilityLabel === label).onChangeText(value);
test('Welcome previews switch content and real entry routes remain available without fictional social proof', () => {
  const view = authHarness(); assert.match(view.markup, /already organised/); assert.doesNotMatch(view.markup, /1.2M|15,000|SMART AI|Test Real Email|Demo Kitchen/);
  button(view, 'Preview cook').onPress(); view.render(); assert.match(view.markup, /with what you have/); assert.equal(button(view, 'Preview cook').accessibilityState.selected, true);
  button(view, 'Preview track').onPress(); view.render(); assert.match(view.markup, /A little reminder/);
  button(view, 'Get Started →').onPress(); button(view, 'Log In').onPress();
  assert.deepEqual(view.routes, ['/(auth)/sign-up', '/(auth)/sign-in']); assert.equal(view.calls.length, 0);
});
test('Welcome session error retains explicit recovery', async () => {
  const view = authHarness('index', { authState: { status: 'error', error: 'Check your connection.' } });
  assert.match(view.markup, /Check your connection/); button(view, 'Retry Session Check').onPress(); assert.deepEqual(view.calls, ['refresh']);
});
test('Log In validates before submitting, toggles password and remembers the selected device policy', async () => {
  const view = authHarness('sign-in'); button(view, 'Log In →').onPress(); view.render(); assert.match(view.markup, /Enter a valid email/); assert.equal(view.calls.length, 0);
  field(view, 'Email Address', ' Person@Example.com '); field(view, 'Password', 'Example-test-only-82');
  view.render(); button(view, 'Show password').onPress(); view.render(); assert.equal(view.inputs.find(c => c.accessibilityLabel === 'Password').secureTextEntry, false);
  view.controls.find(c => c.accessibilityRole === 'checkbox').onPress(); view.render();
  button(view, 'Log In →').onPress(); await view.flush();
  assert.deepEqual(view.calls, [['remember', false], ['signIn', 'person@example.com', 'Example-test-only-82', false], 'authenticated']);
  view.render(); assert.equal(view.inputs.find(c => c.accessibilityLabel === 'Password').value, '');
});
test('Sign Up preserves normalization and email-verification navigation, without claiming password strength', async () => {
  const view = authHarness('sign-up'); field(view, 'Full Name', ' Alex Green '); field(view, 'Email Address', ' Alex@Example.com '); field(view, 'Password', '123456'); view.render();
  assert.match(view.markup, /Use 8–128 characters/); button(view, 'Create Account →').onPress(); view.render(); assert.equal(view.calls.length, 0);
  field(view, 'Password', 'Example-test-only-82'); view.render(); assert.match(view.markup, /Length accepted/); assert.doesNotMatch(view.markup, /Strong|15,000|daily 5:00|Continue with Google/);
  button(view, 'Create Account →').onPress(); await view.flush();
  assert.deepEqual(view.calls, [['signUp', 'Alex Green', 'alex@example.com', 'Example-test-only-82']]);
  assert.deepEqual(JSON.parse(JSON.stringify(view.routes)), [{ pathname: '/(auth)/verify-otp', params: { mode: 'real', email: 'alex@example.com' } }]);
});
test('loading auth forms disable submit/fields and password visibility controls', () => {
  for (const page of ['sign-in', 'sign-up']) {
    const view = authHarness(page, { loading: true }); assert.ok(view.inputs.every(c => c.editable === false)); assert.equal(button(view, 'Show password').disabled, true);
    assert.equal(button(view, page === 'sign-in' ? 'Log In →' : 'Create Account →').disabled, true);
  }
});
test('secondary verification and tab/back navigation remain meaningful', async () => {
  const view = authHarness('sign-in'); field(view, 'Email Address', ' Alex@Example.com '); view.render();
  const verify = view.controls.find(c => c.disabled === false && !c.accessibilityLabel && c.accessibilityRole === 'button'); verify.onPress(); await view.flush();
  assert.deepEqual(view.calls, [['sendVerificationOtp', 'alex@example.com']]);
  assert.equal(view.routes[0].pathname, '/(auth)/verify-otp');
  view.controls.find(c => c.accessibilityRole === 'tab' && c.accessibilityState.selected === false).onPress();
  button(view, 'Back to welcome').onPress(); assert.equal(view.routes[1].pathname, '/(auth)/sign-up'); assert.equal(view.routes[2], '/(auth)');
});
