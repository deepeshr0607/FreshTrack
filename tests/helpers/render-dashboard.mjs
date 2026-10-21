import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as dashboard from '../../lib/dashboard.ts';
import * as money from '../../lib/analyticsPresentation.ts';
import * as pantry from '../../lib/pantryApi.ts';
import * as theme from '../../constants/Theme.ts';
const require = createRequire(import.meta.url), web = require('react-native-web');
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');

/** Actual Dashboard TSX + RN Web styles; native safe-area/icon hosts are substituted.
 * Used for deterministic visual previews and control tests, never shipped as an app route.
 */
export function renderDashboard(props, { width = 390, fontScale = 1 } = {}) {
  const controls = [];
  const compiled = ts.transpileModule(readFileSync(new URL('../../features/dashboard/DashboardView.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const modules = {
    'react-native': { ...web, Image: ({ source, style, accessibilityLabel, resizeMode: _resize, accessibilityIgnoresInvertColors: _invert }) => React.createElement(web.View, { style }, React.createElement('img', { src: source.uri, alt: accessibilityLabel ?? '', style: { width: '100%', height: '100%', objectFit: 'cover' } })), useWindowDimensions: () => ({ width, height: 844, scale: 1, fontScale }),
      Pressable: props => { controls.push(props); return React.createElement(web.Pressable, props); } },
    'react-native-safe-area-context': { SafeAreaView: ({ edges: _edges, ...props }) => React.createElement(web.View, props) },
    '@expo/vector-icons': { MaterialCommunityIcons: ({ name, color, size }) => React.createElement('span', { 'aria-hidden': true, style: { fontFamily: 'MaterialCommunityIcons', color, fontSize: size, lineHeight: '1', display: 'inline-block' } }, String.fromCodePoint(glyphs[name] ?? glyphs.leaf)) },
    '@/constants/Theme': theme, '@/lib/designAssets': { brandImage: { uri: '/brand.png' }, recipeImages: { rigatoni: { uri: '/meal.png' } } },
    '@/lib/dashboard': dashboard, '@/lib/analyticsPresentation': money, '@/lib/pantryApi': pantry,
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => name in modules ? modules[name] : require(name) });
  const markup = renderToStaticMarkup(React.createElement(module.exports.default, props));
  return { markup, controls, css: web.StyleSheet.getSheet().textContent };
}

export function dashboardFixture(overrides = {}) {
  const items = [
    { id: 'sample-spinach', name: 'Baby Spinach', category: 'PRODUCE', quantity: '1', unit: 'bunch', totalCostMinor: 4500, daysLeft: 1, expiresOn: '2026-10-22', createdAt: '2026-10-21T09:00:00Z' },
    { id: 'sample-milk', name: 'Whole Milk', category: 'DAIRY', quantity: '1', unit: 'l', totalCostMinor: 6500, daysLeft: 3, expiresOn: '2026-10-24', createdAt: '2026-10-20T09:00:00Z' },
    { id: 'sample-watermelon', name: 'Watermelon', category: 'PRODUCE', quantity: '1', unit: 'piece', totalCostMinor: null, daysLeft: 14, expiresOn: '2026-11-04', createdAt: '2026-10-19T09:00:00Z' },
  ].map(row => ({ status: 'ACTIVE', source: 'RECEIPT', expirySource: 'PRESET_ESTIMATE', currencyCode: 'INR', updatedAt: '2026-10-21T09:00:00Z', ...row }));
  return { name: 'Alex Green', state: { status: 'ready', items, error: '' }, mode: 'home', filter: 'priority', shopping: [],
    onMode() {}, onFilter() {}, onRefresh() {}, onAction() {}, onOpenItem() {}, onShoppingToggle() {}, ...overrides };
}
