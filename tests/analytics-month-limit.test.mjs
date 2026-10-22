import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsCurrentMonth, analyticsMonthAllowed } from '../lib/analyticsPresentation.ts';
import { createAnalyticsSession } from '../lib/analyticsSession.ts';
import { analyticsFixture } from './analytics-mobile-fixtures.mjs';
import { analyticsHarness } from './helpers/render-analytics.mjs';
const press=(h,label)=>{const c=h.controls.find(row=>row.accessibilityLabel===label);assert.ok(c,label);c.onPress();h.render();};
test('month cap follows Kolkata year/month boundaries rather than UTC and rejects invalid/future keys',()=>{
 assert.equal(analyticsCurrentMonth(new Date('2026-12-31T18:29:59Z')),'2026-12');assert.equal(analyticsCurrentMonth(new Date('2026-12-31T18:30:00Z')),'2027-01');
 assert.equal(analyticsMonthAllowed('2027-01','2026-12'),false);assert.equal(analyticsMonthAllowed('2026-11','2026-10'),false);assert.equal(analyticsMonthAllowed('2026-10','2026-10'),true);assert.equal(analyticsMonthAllowed('2025-12','2026-10'),true);assert.equal(analyticsMonthAllowed('2026-13','2026-10'),false);assert.equal(analyticsMonthAllowed('0000-01','2026-10'),false);
});
test('both Insights and Financial disable Next at the current month and block typed future years/months',()=>{
 for(const financial of [false,true]){
  const h=analyticsHarness({financial});assert.equal(h.controls.find(row=>row.accessibilityLabel==='Next analytics month').disabled,true);press(h,'Next analytics month');assert.deepEqual(h.calls,[]);press(h,'Choose analytics month');
  for(const value of ['2026-11','2027-01','2026-13']){h.inputs[0].onChangeText(value);h.render();press(h,'View Month');assert.match(h.markup,/Choose 2026-10 or an earlier month/);assert.deepEqual(h.calls,[]);assert.equal(h.state.data.month,'2026-10');}
  press(h,'Current Household Month');assert.deepEqual(h.calls,['current',['load',undefined]]);
 }
});
test('past months can move forward only as far as the current month and cross past year boundaries',()=>{
 const data=analyticsFixture();data.month='2026-09';const h=analyticsHarness({state:{data}});assert.equal(h.controls.find(row=>row.accessibilityLabel==='Next analytics month').disabled,false);press(h,'Next analytics month');assert.deepEqual(h.calls,[['load','2026-10']]);
 h.state.data.month='2026-01';h.render();press(h,'Previous analytics month');assert.deepEqual(h.calls.at(-1),['load','2025-12']);
});
test('session guard prevents future API calls, clears stale data and invalidates an older in-flight response',async()=>{
 const calls=[];let finish;const store=createAnalyticsSession({series:async month=>{calls.push(month);return new Promise(resolve=>{finish=resolve;});}},()=>true,()=>new Date('2026-10-22T00:00:00Z'));
 const older=store.load('2026-09');await store.load('2026-11');assert.deepEqual(calls,['2026-09']);assert.equal(store.getSnapshot().data,null);assert.match(store.getSnapshot().error,/earlier analytics month/);finish(analyticsFixture());await older;assert.equal(store.getSnapshot().data,null);assert.equal(store.getSnapshot().status,'error');
});
test('month rollover unlocks the new current month while default/current loading stays server-selected',async()=>{
 let now=new Date('2026-12-31T18:29:59Z');const calls=[];const store=createAnalyticsSession({series:async month=>{calls.push(month);return analyticsFixture();}},()=>true,()=>now);
 await store.load('2027-01');assert.deepEqual(calls,[]);now=new Date('2026-12-31T18:30:00Z');await store.load('2027-01');store.current();await store.load();assert.deepEqual(calls,['2027-01',undefined]);
});
