import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptReviewHarness} from './helpers/render-receipt-review.mjs';
const button=(v,label)=>v.controls.find(c=>c.accessibilityLabel===label);
const field=(v,placeholder,value)=>v.fields.find(c=>c.accessibilityLabel===placeholder||c.value===placeholder).onChangeText(value);
test('Receipt cards show fresh estimates without package scans and packaged actions stay independently available',()=>{
 const v=receiptReviewHarness();assert.match(v.markup,/Your grocery haul/);assert.match(v.markup,/Needs review/);assert.equal(button(v,'Scan expiry for Watermelon'),undefined);assert.ok(button(v,'Scan expiry for Biscuits'));
 assert.doesNotMatch(v.markup,/No price conversion/);button(v,'Review tips & estimate guidance').onPress();v.render();assert.match(v.markup,/No price conversion/);
 button(v,'Scan expiry for Biscuits').onPress();v.render();assert.equal(v.labelProps.name,'Biscuits');v.labelProps.onCancel();v.render();assert.ok(button(v,'Edit Watermelon'));assert.deepEqual(v.calls,[]);
});
test('Product editor Cancel preserves data and Save keeps quantity/value/manual-expiry fields in the reviewed payload',()=>{
 const v=receiptReviewHarness({lines:['Spinach Rs. 30.00']});button(v,'Edit Spinach').onPress();v.render();field(v,'Spinach','Changed name');button(v,'Cancel Edit').onPress();v.render();assert.match(v.markup,/Spinach/);assert.doesNotMatch(v.markup,/Changed name/);
 button(v,'Edit Spinach').onPress();v.render();field(v,'1','2');v.render();field(v,'30.00','0');v.render();v.fields.at(-1).onChangeText('2026-11-01');v.render();button(v,'Save Product').onPress();v.render();button(v,'Review & Add 1 Products to Pantry').onPress();
 assert.equal(v.calls[0][0],'prepare');const item=v.calls[0][1].items[0].item;assert.equal(item.quantity,'2');assert.equal(item.totalCostMinor,0);assert.equal(item.expiresOn,'2026-11-01');
});
test('Selection/removal and incomplete details still gate final review, without a silent import',()=>{
 const v=receiptReviewHarness();button(v,'Review & Add 3 Products to Pantry').onPress();v.render();assert.match(v.markup,/still need attention/);assert.deepEqual(v.calls,[]);
 button(v,'Include Biscuits').onPress();v.render();button(v,'Remove Watermelon').onPress();v.render();button(v,'Review & Add 1 Products to Pantry').onPress();assert.equal(v.calls[0][0],'prepare');assert.equal(v.calls[0][1].items.length,1);assert.equal(v.calls[0][1].items[0].item.name,'Spinach');
 const cached=receiptReviewHarness({readOnly:true});assert.equal(button(cached,'Review & Add 3 Products to Pantry').disabled,true);
});
test('Final review duplicate choices update exact counts/value and preserve Cancel/Confirm callbacks',()=>{
 const v=receiptReviewHarness({page:'import'});const row=v.input.items[0];v.state.duplicates=[{rowId:row.rowId,total:1,withinHaul:[],matches:[{id:'existing',name:'Spinach',quantity:'1',unit:'piece',totalCostMinor:3000,expiresOn:'2026-10-24'}]}];v.render();assert.match(v.markup,/₹80.00/);assert.match(v.markup,/Possible duplicate/);
 button(v,'Skip This Row: Spinach').onPress();v.render();assert.match(v.markup,/₹50.00/);assert.match(v.markup,/1 grocery to add/);button(v,'Add Separately: Spinach').onPress();v.render();assert.match(v.markup,/₹80.00/);
 button(v,'Cancel — Back to Review').onPress();button(v,'Confirm Add Haul to Pantry').onPress();assert.deepEqual(v.calls.map(c=>Array.isArray(c)?c[0]:c),['choose','choose','cancel','confirm']);
});
test('Final review preserves unknown/free values, busy/read-only guards and failed duplicate retry',()=>{
 const v=receiptReviewHarness({page:'import',readOnly:true});v.state.input.items[0].item.totalCostMinor=null;v.state.input.items[1].item.totalCostMinor=0;v.render();assert.match(v.markup,/Unknown value/);assert.match(v.markup,/1 of 2 products priced/);assert.equal(button(v,'Confirm Add Haul to Pantry').disabled,true);
 const retry=receiptReviewHarness({page:'import',state:{duplicates:null,error:'Check again.'}});button(retry,'Check Duplicates Again').onPress();assert.equal(retry.calls[0][0],'review');
 const busy=receiptReviewHarness({page:'import',state:{busy:true}});assert.equal(button(busy,'Confirm Add Haul to Pantry').disabled,true);assert.equal(button(busy,'Cancel — Back to Review').disabled,true);
});
test('Pending and success views retain unchanged retry flags and Pantry/new-receipt destinations',()=>{
 const v=receiptReviewHarness({page:'import'});v.state.stage='pending';v.state.pending={paused:true,input:v.input};v.render();assert.match(v.markup,/Editing and new imports are locked/);button(v,'Continue Saved Import').onPress();assert.deepEqual(v.calls,[['retry',true]]);
 v.state.stage='saved';v.state.result={items:v.input.items,replayed:true};v.render();assert.match(v.markup,/original save was recovered/);assert.match(v.markup,/does not restore it/);button(v,'View Pantry').onPress();button(v,'Scan Another Receipt').onPress();assert.deepEqual(v.calls.slice(1),[['route','/(tabs)/pantry'],'new']);
});
