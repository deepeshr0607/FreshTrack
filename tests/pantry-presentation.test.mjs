import test from 'node:test';
import assert from 'node:assert/strict';
import { pantryHarness } from './helpers/render-pantry.mjs';
const button=(view,label)=>view.controls.find(c=>c.accessibilityLabel===label);
test('Pantry separates inventory-wide counts from loaded values and uses live routes without mock claims',()=>{
 const v=pantryHarness();assert.match(v.markup,/27/);assert.match(v.markup,/₹110.00/);assert.match(v.markup,/3 of 3 matching/);assert.doesNotMatch(v.markup,/Dual-Tier Freshness Engine|remain prototypes|Offline copy saved|maya|15,000/);
 button(v,'Add Item Manually').onPress();button(v,'Scan a receipt').onPress();button(v,'Pantry settings').onPress();button(v,'Whole Milk, 3 days left').onPress();
 assert.deepEqual(JSON.parse(JSON.stringify(v.routes)),['/pantry/add','/(tabs)/scanner','/settings',{pathname:'/pantry/[id]',params:{id:'sample-milk'}}]);
 assert.match(v.markup,/1 l/);assert.match(v.markup,/Estimated/);
});
test('Category/date disclosures preserve selection and changing filters clears batch selection',()=>{
 const v=pantryHarness();assert.equal(button(v,'Produce, 20 active items'),undefined);button(v,'Show category filters').onPress();v.render();button(v,'Produce, 20 active items').onPress();v.render();assert.equal(v.real.filters.category,'PRODUCE');
 button(v,'About expiry dates').onPress();v.render();assert.match(v.markup,/not freshness guarantees/);
 button(v,'Clear pantry filters').onPress();v.render();assert.equal(v.real.filters.category,undefined);
 button(v,'Batch Select').onPress();v.render();button(v,'Select Baby Spinach').onPress();v.render();assert.match(v.markup,/1 selected/);
 v.inputs[0].onChangeText('Whole Milk');v.render();assert.match(v.markup,/0 selected/);assert.equal(v.real.filters.q,'whole milk');
 button(v,'Toggle sort order').onPress();v.render();assert.equal(v.real.filters.sort,'name');
});
test('Used/Wasted buttons and swipe callbacks open cancellable confirmation before any mutation',async()=>{
 const v=pantryHarness();button(v,'Mark Whole Milk as consumed').onPress();v.render();assert.equal(v.confirmations[0].action,'CONSUMED');assert.equal(v.confirmations[0].item.id,'sample-milk');assert.ok(!v.calls.some(c=>Array.isArray(c)));
 v.confirmations[0].onCancel();v.render();assert.equal(v.confirmations[0].item,null);
 v.swipes[1].onSwipeableOpen('left');v.render();assert.equal(v.confirmations[0].action,'WASTED');v.confirmations[0].onCancel();v.render();assert.ok(!v.calls.some(c=>Array.isArray(c)));
});
test('Batch selection and Undo preserve confirmation payloads without auto-submitting',()=>{
 const v=pantryHarness();button(v,'Batch Select').onPress();v.render();button(v,'Select visible items').onPress();v.render();button(v,'Mark Selected Used').onPress();v.render();assert.equal(v.confirmations[1].items.length,3);v.confirmations[1].onCancel();v.render();assert.equal(v.confirmations.length,1);
 v.real.lastOutcome=[{...v.real.items[0],status:'CONSUMED'}];v.render();button(v,'Undo Last Outcome').onPress();v.render();assert.equal(v.confirmations.at(-1).undo,true);v.confirmations.at(-1).onCancel();v.render();assert.equal(v.calls.some(c=>Array.isArray(c)),false);
});
test('Cached/error/pending-action states retain recovery and blocked mutations',()=>{
 const v=pantryHarness({readOnly:true,cachedAt:1792598400000,error:'Refresh failed.',pendingNotificationIds:['sample-milk']});
 assert.match(v.markup,/Cached Pantry · read-only/);assert.match(v.markup,/subset may be incomplete/);assert.equal(button(v,'Add Item Manually').disabled,true);assert.equal(button(v,'Batch Select').disabled,true);assert.ok(v.swipes.every(s=>!s.enabled));assert.equal(button(v,'Mark Whole Milk as consumed'),undefined);
 button(v,'Refresh Pantry').onPress();assert.ok(v.calls.includes('reload'));v.refreshes[0].onRefresh();assert.equal(v.calls.filter(c=>c==='reload').length,3);
 const pending=pantryHarness({pendingNotificationIds:['sample-milk']});assert.equal(button(pending,'Mark Whole Milk as wasted'),undefined);assert.ok(button(pending,'Mark Baby Spinach as wasted'));
});
test('Compact reconciliation routes to existing review and does not resolve groceries',()=>{
 const v=pantryHarness();assert.equal(button(v,'Review Expired Items'),undefined);v.overdue.items=[v.real.items[0]];v.render();assert.match(v.markup,/1 overdue/);button(v,'Review Expired Items').onPress();assert.deepEqual(v.routes,['/pantry/reconcile']);
 v.real.readOnly=true;v.render();button(v,'Refresh Pantry Online').onPress();assert.ok(v.calls.includes('reload'));
});
