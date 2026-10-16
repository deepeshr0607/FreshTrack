import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { applyReleaseConfig } = require('../scripts/release-config.cjs');
const config = require('../app.json').expo;
const env = {
  APP_VARIANT: 'production', APP_NATIVE_IDENTIFIER: 'com.fixture.freshtrack',
  APP_EAS_PROJECT_ID: '11111111-1111-4111-8111-111111111111',
  EXPO_PUBLIC_NEON_AUTH_URL: 'https://fixture.neonauth.neon.tech/neondb/auth',
  EXPO_PUBLIC_NEON_AUTH_ORIGIN: 'https://auth.fixture.test', EXPO_PUBLIC_API_URL: 'https://api.fixture.test',
};
test('Expo Go configuration stays unchanged without release variables', () => {
  assert.equal(applyReleaseConfig(config, {}), config);
});
test('local native identity needs no EAS account and does not bypass release guards', () => {
  const local = applyReleaseConfig(config, { APP_LOCAL_NATIVE_IDENTIFIER: 'com.fixture.freshtrack.dev' });
  assert.equal(local.name, 'FreshTrack Dev');
  assert.equal(local.scheme, 'freshtrack-dev');
  assert.equal(local.ios.bundleIdentifier, 'com.fixture.freshtrack.dev');
  assert.equal(local.android.package, local.ios.bundleIdentifier);
  assert.deepEqual(local.plugins.slice(0, -1), config.plugins);
  assert.equal(local.plugins.at(-1), './plugins/withLocalDevelopmentBuild.cjs');
  for (const id of ['bad', 'com.example.app', 'com.fixture.bad-id']) {
    assert.throws(() => applyReleaseConfig(config, { APP_LOCAL_NATIVE_IDENTIFIER: id }));
  }
  assert.throws(() => applyReleaseConfig(config, { APP_VARIANT: 'production', APP_LOCAL_NATIVE_IDENTIFIER: 'com.fixture.freshtrack.dev' }));
});
test('local signing removes APNs after notification mods without dropping unrelated entitlements', async () => {
  const { withEntitlementsPlist } = require('expo/config-plugins');
  const withLocalNotificationsOnly = require('../plugins/withLocalDevelopmentBuild.cjs');
  const notificationConfig = withEntitlementsPlist({ name: 'Fixture', slug: 'fixture' }, mod => {
    mod.modResults['aps-environment'] = 'development';
    mod.modResults['keychain-access-groups'] = ['fixture.group'];
    return mod;
  });
  const local = withLocalNotificationsOnly(notificationConfig);
  const result = await local.mods.ios.entitlements({ modResults: {}, modRequest: {} });
  assert.equal(Object.hasOwn(result.modResults, 'aps-environment'), false);
  assert.deepEqual(result.modResults['keychain-access-groups'], ['fixture.group']);
});
test('local bundle command executes the resolved script when its path contains spaces', () => {
  const { quoteBundleScript } = require('../plugins/withLocalDevelopmentBuild.cjs');
  const dir = mkdtempSync(join(tmpdir(), 'freshtrack bundle '));
  try {
    const marker = join(dir, 'executed');
    writeFileSync(join(dir, 'react-native-xcode.sh'), '#!/bin/bash\ntouch "$FIXTURE_MARKER"\n', { mode: 0o700 });
    const original = '`"$NODE_BINARY" --print "process.env.FIXTURE_DIR + \'/react-native-xcode.sh\'"`';
    const fixed = quoteBundleScript(original);
    assert.notEqual(fixed, original);
    assert.equal(quoteBundleScript(fixed), fixed);
    const result = spawnSync('/bin/bash', ['-c', fixed], {
      env: { ...process.env, NODE_BINARY: process.execPath, FIXTURE_DIR: dir, FIXTURE_MARKER: marker }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(marker), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('production preserves SDK/plugins/assets and adds matching native identity and EAS project', () => {
  const release = applyReleaseConfig(config, env);
  assert.equal(release.ios.bundleIdentifier, env.APP_NATIVE_IDENTIFIER);
  assert.equal(release.android.package, env.APP_NATIVE_IDENTIFIER);
  assert.equal(release.extra.eas.projectId, env.APP_EAS_PROJECT_ID);
  assert.deepEqual(release.plugins, config.plugins);
  assert.equal(release.scheme, config.scheme);
  assert.equal(release.android.versionCode, 1);
  assert.equal(release.ios.buildNumber, '1');
});
test('preview has distinct identity/name/scheme and cannot replace a production install', () => {
  const preview = applyReleaseConfig(config, { ...env, APP_VARIANT: 'preview' });
  assert.equal(preview.ios.bundleIdentifier, `${env.APP_NATIVE_IDENTIFIER}.preview`);
  assert.equal(preview.android.package, preview.ios.bundleIdentifier);
  assert.equal(preview.scheme, 'freshtrack-preview');
  assert.equal(preview.name, 'FreshTrack Preview');
});
test('missing, placeholder and invalid release inputs fail before any build', () => {
  for (const key of Object.keys(env).filter((key) => key !== 'APP_VARIANT')) {
    assert.throws(() => applyReleaseConfig(config, { ...env, [key]: '' }));
  }
  for (const invalid of [{ APP_VARIANT: 'unknown' }, { APP_NATIVE_IDENTIFIER: 'com.yourcompany.freshtrack' },
    { APP_EAS_PROJECT_ID: 'not-linked' }, { EXPO_PUBLIC_NEON_AUTH_URL: 'https://other-provider.test/auth' },
    { EXPO_PUBLIC_NEON_AUTH_URL: 'https://YOUR_BRANCH.neonauth.neon.tech/neondb/auth' }]) {
    assert.throws(() => applyReleaseConfig(config, { ...env, ...invalid }));
  }
});
test('release rejects development transport, embedded credentials and API/origin paths', () => {
  for (const key of ['EXPO_PUBLIC_NEON_AUTH_URL', 'EXPO_PUBLIC_NEON_AUTH_ORIGIN', 'EXPO_PUBLIC_API_URL']) {
    for (const url of ['http://192.168.1.21:3001', 'https://127.0.0.1', 'https://api.example.com', 'https://name:secret@api.fixture.test']) {
      assert.throws(() => applyReleaseConfig(config, { ...env, [key]: url }));
    }
  }
  assert.throws(() => applyReleaseConfig(config, { ...env, EXPO_PUBLIC_API_URL: 'https://api.fixture.test/path' }));
});
