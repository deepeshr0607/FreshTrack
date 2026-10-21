import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as pantry from '../lib/pantry.ts';
import * as expiry from '../lib/pantryExpiry.ts';
import * as candidates from '../lib/receiptCandidates.ts';
import * as products from '../lib/receiptProducts.ts';
import * as importer from '../lib/receiptImport.ts';
import * as packageDates from '../lib/receiptPackageDates.ts';
import * as limits from '../lib/receiptLimits.ts';
import * as theme from '../constants/Theme.ts';

/** Render the actual TSX with React; native host primitives alone are substituted.
 * This catches conditional controls/disabled props, not physical-device behavior.
 */
function screen(lines, readOnly = false) {
  const controls = [], prepared = [];
  const source = readFileSync(new URL('../features/scanner/ReceiptProductReview.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const host = tag => ({ children }) => React.createElement(tag, null, children);
  const button = props => {
    controls.push(props);
    return React.createElement('button', { disabled: props.disabled, 'aria-label': props.accessibilityLabel ?? props.label }, props.label);
  };
  const require = createRequire(import.meta.url);
  const modules = {
    'react-native': { Text: host('span'), View: host('div'), Pressable: host('button'), Linking: { openURL: async () => {} } },
    '@/components/PrimaryButton': button, '@/components/FormInput': () => null,
    '@/components/PrototypeScreen': { ui: {} }, '@/constants/Theme': theme,
    '@/lib/pantry': pantry, '@/lib/pantryExpiry': expiry, '@/lib/receiptCandidates': candidates,
    '@/lib/receiptProducts': products, '@/lib/receiptImport': importer, '@/lib/receiptPackageDates': packageDates,
    '@/lib/receiptLimits': limits, './PackageExpiryCapture': () => null,
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => name in modules ? modules[name] : require(name) });
  const markup = renderToStaticMarkup(React.createElement(module.exports.default, { lines, layout: null, readOnly, onPrepare: value => prepared.push(value) }));
  return { controls, markup, prepared, add: controls.find(control => control.label.startsWith('Review & Add')) };
}

test('fresh-only receipt hides all package scan controls and Add prepares the valid haul', () => {
  const { controls, markup, add, prepared } = screen(['Watermelon Rs. 70.00', 'Spinach Rs. 30.00']);
  assert.equal(controls.filter(control => /scan.*expiry/i.test(control.label)).length, 0);
  assert.doesNotMatch(markup, /Check packaged expiry dates/);
  assert.match(markup, /Fresh \/ loose · no package scan needed/);
  assert.equal(add.disabled, false);
  add.onPress(); assert.equal(prepared.length, 1);
  assert.deepEqual(prepared[0].items.map(row => row.item.name), ['Watermelon', 'Spinach']);
  assert.ok(prepared[0].items.every(row => row.item.expirySelection.preset));
});

test('mixed receipt offers each packaged product directly and Add guides incomplete review without sending', () => {
  const { controls, markup, add, prepared } = screen(['Watermelon Rs. 70.00', 'Biscuits Rs. 20.00', 'Milk Rs. 60.00']);
  const labels = controls.map(control => control.label);
  assert.ok(labels.includes('Scan Expiry · Biscuits')); assert.ok(labels.includes('Scan Expiry · Milk'));
  assert.ok(!labels.some(label => /scan.*watermelon/i.test(label)));
  assert.match(markup, /do not have to scan them in order/);
  assert.equal(add.disabled, false); // Unresolved dates must produce guidance, not a dead grey button.
  add.onPress(); assert.equal(prepared.length, 0); // Still no invalid server import.
});

test('unsupported fresh food is explained as a manual tracking date, not a packaged scan', () => {
  const { controls, markup, add, prepared } = screen(['Mango Rs. 40.00']);
  assert.equal(controls.filter(control => /scan.*expiry/i.test(control.label)).length, 0);
  assert.match(markup, /Fresh items needing a tracking date or correction/);
  assert.match(markup, /no package scan is required/);
  assert.equal(add.disabled, false); add.onPress(); assert.equal(prepared.length, 0);
});

test('read-only and empty receipts keep actual import guards and a clear explanation', () => {
  const cached = screen(['Watermelon Rs. 70.00'], true);
  assert.equal(cached.add.disabled, true); assert.match(cached.markup, /Pantry is read-only/);
  const empty = screen(['TOTAL 70.00']);
  assert.equal(empty.add.disabled, true); assert.match(empty.markup, /No products recognized/);
});
