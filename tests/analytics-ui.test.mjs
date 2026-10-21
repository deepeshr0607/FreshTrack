import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsHarness } from './helpers/render-analytics.mjs';
import { analyticsFixture } from './analytics-mobile-fixtures.mjs';
import { analyticsReport } from '../lib/analyticsPresentation.ts';
const press=(h,label)=>{const control=h.controls.find(row=>row.accessibilityLabel===label);assert.ok(control,label);control.onPress();h.render();};
test('overview shows exact recorded values and guarded navigation without changing outcomes',()=>{
 const h=analyticsHarness();assert.match(h.markup,/₹72.00/);assert.match(h.markup,/₹60.50/);assert.match(h.markup,/not money saved/);
 press(h,'Explore financial analytics');press(h,'Plan Rescue Meals');assert.deepEqual(h.routes,['/analytics/financial','/(tabs)/recipes']);assert.deepEqual(h.calls,[]);
 press(h,'How your totals work');assert.match(h.markup,/Carbon, food mass and achievement scores are not calculated/);
});
test('compact month picker preserves previous next manual and current requests',()=>{
 const h=analyticsHarness();assert.equal(h.inputs.length,0);press(h,'Previous analytics month');press(h,'Next analytics month');press(h,'Choose analytics month');
 h.inputs[0].onChangeText('2026-08');h.render();const view=h.controls.find(row=>JSON.stringify(row.children).includes('View Month'));view.onPress();
 const current=h.controls.find(row=>row.accessibilityLabel==='Current Household Month');assert.ok(current);current.onPress();
 assert.deepEqual(h.calls,[['load','2026-09'],['load','2026-11'],['load','2026-08'],'current',['load',undefined]]);
});
test('chart exposes exact values and marks selected month',()=>{
 const h=analyticsHarness();const label='2026-10: consumed ₹72.00, wasted ₹60.50';press(h,label);assert.equal(h.controls.find(row=>row.accessibilityLabel===label).accessibilityState.selected,true);assert.match(h.markup,/2026-10: consumed ₹72.00, wasted ₹60.50/);
});
test('financial view keeps recorded coverage unknown prices and reviewable history',()=>{
 const h=analyticsHarness({financial:true});assert.match(h.markup,/1 unknown price/);assert.match(h.markup,/Fixture Milk/);assert.match(h.markup,/Month-to-date versus the previous full/);
 press(h,'Review Pantry entry Fixture Milk');assert.equal(h.routes[0].params.id,'22222222-2222-4222-8222-222222222222');press(h,'Back to Insights');assert.equal(h.routes[1],'/(tabs)/insights');
});
test('report preview retains the complete canonical report',()=>{
 const h=analyticsHarness();press(h,'Preview household analytics report');assert.ok(h.markup.includes(analyticsReport(h.state.data).split('\n')[0]));assert.match(h.markup,/Close Report/);
});
test('loading and error never expose stale zero totals or enabled report',()=>{
 for(const status of ['loading','error']){const h=analyticsHarness({state:{data:null,status,error:'Unable to load analytics (NETWORK)'}});assert.equal(h.controls.find(row=>row.accessibilityLabel==='Preview household analytics report').disabled,true);assert.doesNotMatch(h.markup,/₹0.00/);if(status==='error')assert.match(h.markup,/NETWORK/);}
});
test('exact values beyond safe integer precision survive redesigned hero and chart',()=>{
 const data=analyticsFixture();data.months.at(-1).consumedBeforeOrOnExpiry.purchaseCostMinor='9007199254740993';const h=analyticsHarness({state:{data}});assert.match(h.markup,/₹90,071,992,547,409.93/);
});
