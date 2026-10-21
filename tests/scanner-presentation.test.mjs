import test from 'node:test';
import assert from 'node:assert/strict';
import {scannerHarness} from './helpers/render-scanner.mjs';
const button=(v,label)=>v.controls.find(c=>c.accessibilityLabel===label);
test('Receipt-first Scanner entry has working routes and no invented recognition statistics or native requests',()=>{
 const v=scannerHarness();assert.match(v.markup,/Your whole grocery haul/);assert.doesNotMatch(v.markup,/98%|Test On-device|15,000|Sample results/);assert.deepEqual(v.calls,[]);
 button(v,'Scan receipt').onPress();button(v,'Enter Item Manually').onPress();button(v,'Scan barcode').onPress();button(v,'Scanner settings').onPress();assert.deepEqual(v.routes,['/scanner/receipt','/pantry/add','/scanner/barcode','/settings']);
 button(v,'How receipt scanning works').onPress();v.render();assert.match(v.markup,/Supported fresh foods/);assert.match(v.markup,/Nothing goes into Pantry until you confirm/);
});
test('Normal capture and upload use existing automatic-reading path, while text extraction stays automatic',()=>{
 const v=scannerHarness({page:'receipt'});assert.match(v.markup,/Let’s read your receipt/);assert.doesNotMatch(v.markup,/Read Text on Device|Development check|No text detected/);assert.equal(button(v,'Clear Photo & Text'),undefined);assert.doesNotMatch(v.markup,/\\n/);
 button(v,'Photograph Receipt').onPress();button(v,'Upload Receipt Photo').onPress();assert.deepEqual(v.calls,[['choose','camera',true],['choose','library',true]]);
 button(v,'Back to Scanner').onPress();assert.deepEqual(v.routes,['back']);
});
test('Busy/unavailable capture blocks photo actions but preserves manual fallback when idle',()=>{
 const busy=scannerHarness({page:'receipt',ocr:{busy:true}});assert.equal(button(busy,'Photograph Receipt').disabled,true);assert.equal(button(busy,'Upload Receipt Photo').disabled,true);assert.match(busy.markup,/Reading your receipt/);
 const unsupported=scannerHarness({page:'receipt',supported:false});assert.equal(button(unsupported,'Photograph Receipt').disabled,true);assert.match(unsupported.markup,/unavailable in this app build/);button(unsupported,'Enter Grocery Manually').onPress();assert.deepEqual(unsupported.routes,['/pantry/add']);
});
test('Permission/read failures retain targeted settings or retry without forcing another capture',()=>{
 const v=scannerHarness({page:'receipt',ocr:{image:'file:///synthetic-receipt.jpg',error:'Could not read image.',errorCode:'READ'}});button(v,'Retry Receipt Recognition').onPress();assert.deepEqual(v.calls,['read']);assert.equal(button(v,'Open Device Settings'),undefined);
 v.ocr.errorCode='PERMISSION';v.render();assert.equal(button(v,'Retry Receipt Recognition'),undefined);button(v,'Open Device Settings').onPress();assert.deepEqual(v.calls,['read','settings']);
});
test('Read results keep product review/raw-text disclosure/clear and import read-only guard wired',()=>{
 const v=scannerHarness({page:'receipt',readOnly:true,ocr:{image:'file:///synthetic-receipt.jpg',read:true,lines:['SYNTHETIC APPLES 20.00']}});assert.match(v.markup,/Product review: 1 lines/);assert.doesNotMatch(v.markup,/SYNTHETIC APPLES/);assert.equal(v.importProps.readOnly,true);
 button(v,'View Receipt Text').onPress();v.render();assert.match(v.markup,/SYNTHETIC APPLES/);button(v,'Clear Photo & Text').onPress();v.render();assert.equal(v.ocr.image,null);assert.doesNotMatch(v.markup,/Product review:/);
});
test('Demo entry stays a prototype and explicit diagnostics keep their previous entry points',()=>{
 const demo=scannerHarness({demo:true});button(demo,'Scan receipt').onPress();demo.render();assert.match(demo.markup,/Demo receipt review/);assert.deepEqual(demo.routes,[]);
 const diagnostics=scannerHarness({diagnostics:true});button(diagnostics,'Test On-device Receipt OCR').onPress();assert.deepEqual(diagnostics.routes,['/scanner/ocr-check']);
 const receipt=scannerHarness({page:'receipt',diagnostics:true});button(receipt,'Photograph Receipt').onPress();assert.deepEqual(receipt.calls,[['choose','camera',false]]);assert.match(receipt.markup,/Receipt OCR Check/);
});
