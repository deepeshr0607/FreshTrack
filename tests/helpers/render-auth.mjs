import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../../constants/Theme.ts';
import * as validation from '../../lib/auth.ts';
const require = createRequire(import.meta.url), web = require('react-native-web');
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
/** Render actual auth routes. Provider/request/native hosts are injected; no real account or network. */
export function authHarness(page = 'index', options = {}) {
  let cursor = 0, controls = [], inputs = [], pending = [], state = [];
  const calls = [], routes = [], modules = {}, cache = {};
  const mockReact = { ...React, useState: initial => {
    const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  } };
  const session = { authenticate: async fn => { await fn(); calls.push('authenticated'); }, refresh: async () => calls.push('refresh'), enterDemo: () => true };
  const preferences = { rememberDevice: true, digest: false, profile: {}, setRememberDevice: v => calls.push(['remember', v]), setDigest() {}, setProfile() {} };
  const auth = { signIn: async (...args) => calls.push(['signIn', ...args]), signUp: async (...args) => calls.push(['signUp', ...args]), sendVerificationOtp: async email => calls.push(['sendVerificationOtp', email]) };
  Object.assign(modules, {
    react: mockReact,
    'react-native': { ...web, Platform: { OS: 'ios' },
      Image: ({ source, style }) => React.createElement(web.View, { style }, React.createElement('img', { src: source.uri, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } })),
      Pressable: props => { controls.push(props); return React.createElement(web.Pressable, props); },
      TextInput: props => { inputs.push(props); return React.createElement(web.TextInput, props); },
    },
    'react-native-safe-area-context': { SafeAreaView: props => React.createElement(web.View, props) },
    '@expo/vector-icons': { MaterialCommunityIcons: ({ name, color, size }) => React.createElement('span', { 'aria-hidden': true, style: { fontFamily: 'MaterialCommunityIcons', color, fontSize: size } }, String.fromCodePoint(glyphs[name] ?? glyphs.leaf)) },
    'expo-router': { router: { push: v => routes.push(v), replace: v => routes.push(v), back: () => routes.push('back'), canGoBack: () => false }, useLocalSearchParams: () => options.params ?? {} },
    '@/constants/Theme': theme, '../constants/Theme': theme, '@/lib/auth': validation,
    '@/lib/designAssets': { brandImage: { uri: '/brand.png' }, recipeImages: { rigatoni: { uri: '/meal.png' } } },
    '@/lib/runtimeFeatures': { DIAGNOSTICS_ENABLED: false },
    '@/context/AuthContext': { useAuth: () => ({ session, state: options.authState ?? { status: 'signed-out' }, allowDemo: false }) },
    '@/context/MockPreferencesContext': { useMockPreferences: () => preferences },
    '@/features/auth/nativeProbe': { nativeAuthProbe: auth },
    '@/lib/neonAuth': { NeonAuthError: Error },
    '@/features/auth/useDemoRequest': { __esModule: true, default: () => ({ loading: false, run: fn => fn() }) },
    '@/features/auth/useAuthRequest': { __esModule: true, default: setNotice => ({ loading: options.loading ?? false, run: task => {
      const result = Promise.resolve().then(() => task(() => true)).catch(() => setNotice('Unable to sign in. Try again.')); pending.push(result); return result;
    } }) },
  });
  function load(name, path) {
    if (cache[name]) return cache[name].exports;
    const module = { exports: {} }; cache[name] = module;
    const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(source, { module, exports: module.exports, require: id => modules[id] ?? (id === '@/features/auth/AuthPresentation' ? load(id, '../../features/auth/AuthPresentation.tsx') : id === '@/components/PrimaryButton' ? load(id, '../../components/PrimaryButton.tsx') : require(id)) });
    return module.exports;
  }
  const Screen = load('route', `../../app/(auth)/${page}.tsx`).default;
  const result = { calls, routes, async flush() { await Promise.all(pending); pending = []; }, render() {
    cursor = 0; controls = []; inputs = [];
    const markup = renderToStaticMarkup(React.createElement(Screen));
    Object.assign(result, { markup, controls, inputs, css: web.StyleSheet.getSheet().textContent }); return result;
  } };
  return result.render();
}
