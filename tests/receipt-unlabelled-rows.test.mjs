import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestUnlabelledReceiptPairs } from '../lib/receiptUnlabelledRows.ts';
import { receiptProducts } from '../lib/receiptProducts.ts';
import { receiptColumnProposals } from '../lib/receiptColumnReview.ts';
const cell=(text,x,y,width=.15)=>({text,box:{x,y,width,height:.02}});
const indexed=rows=>rows.map((row,index)=>({...row,id:`line-${index}`}));
// Synthetic test data only; no public/private receipt transcript is committed.
const example=()=>indexed([cell('Grocery receipt',.1,.05),cell('3 Apples (2.25 per kg)',.1,.2,.4),cell('1 bag Pasta (15.5 oz)',.1,.3,.4),cell('1 can Ocean Tuna',.1,.4,.4),cell('2.10',.8,.2,.1),cell('3.20',.8,.3,.1),cell('4.30',.8,.4,.1),cell('Total',.1,.8),cell('9.60',.8,.8,.1)]);
const products=boxes=>receiptProducts(boxes.map(row=>row.text),boxes,'2026-10-22');
test('unlabelled columns recover decimal annotations and unfamiliar names with exact positional prices',()=>{
 const boxes=example(),before=structuredClone(boxes),rows=products(boxes);
 assert.equal(rows.length,3);assert.deepEqual(rows.map(row=>row.detectedPrice),['2.10','3.20','4.30']);assert.deepEqual(rows.map(row=>row.draft.price),['2.10','3.20','4.30']);
 assert.equal(rows[0].draft.name,'3 Apples (2.25 per kg)');assert.equal(rows[1].draft.name,'1 bag Pasta (15.5 oz)');assert.equal(rows[2].draft.name,'1 can Ocean Tuna');assert.equal(new Set(rows.flatMap(row=>row.sourceLineIds)).size,6);assert.deepEqual(boxes,before);
});
test('geometry uses physical rows rather than OCR order and never attaches the footer total',()=>{
 const boxes=example(),shuffled=indexed([...boxes].reverse());const pairs=suggestUnlabelledReceiptPairs(shuffled);
 assert.deepEqual(pairs.map(row=>row.detectedPrice),['2.10','3.20','4.30']);assert.ok(pairs.every(row=>!row.selected&&!row.reviewed));assert.ok(pairs.every(row=>row.sourceLineIds.length===2));
});
test('missing geometry, missing footer, a single row or a labelled table do not invoke headerless guesses',()=>{
 assert.equal(receiptProducts(example().map(row=>row.text),null,'2026-10-22').some(row=>row.detectedPrice!==null),false);
 assert.deepEqual(suggestUnlabelledReceiptPairs(indexed(example().slice(0,-2))),[]);
 assert.deepEqual(suggestUnlabelledReceiptPairs(indexed(example().filter(row=>![.3,.4].includes(row.box.y)))),[]);
 const header=example();header[0].text='Amount (INR)';assert.deepEqual(suggestUnlabelledReceiptPairs(header),[]);
});
test('competing unit/total columns, wrapped names and duplicate cells are not silently paired',()=>{
 const twoColumns=indexed([...example(),cell('1.00',.55,.2,.1)]);assert.deepEqual(suggestUnlabelledReceiptPairs(twoColumns),[]);
 for(const extra of [cell('extra description',.55,.2,.15),cell('2.10',.8,.2,.1)])assert.deepEqual(suggestUnlabelledReceiptPairs(indexed([...example(),extra])),[]);
 const shifted=example();shifted[4].box.y+=.03;assert.deepEqual(suggestUnlabelledReceiptPairs(shifted),[]);
});
test('foreign currency preserves detected numbers without importing them as rupees',()=>{
 const boxes=indexed([cell('Currency: USD',.1,.01),...example()]);const rows=products(boxes);
 assert.equal(rows.length,3);assert.ok(rows.every(row=>row.currency==='unsupported'&&row.draft.price===''));assert.deepEqual(rows.map(row=>row.detectedPrice),['2.10','3.20','4.30']);
});
test('pristine name-only upgrades do not duplicate or replace edited/excluded groceries',()=>{
 const boxes=example(),lines=boxes.map(row=>row.text);const proposals=receiptColumnProposals(lines,boxes,[],'same-row');
 assert.equal(proposals.length,3);const row={...proposals[0],selected:false,reviewed:true};assert.equal(receiptColumnProposals(lines,boxes,[row],'same-row').length,2);
 const mismatch=structuredClone(boxes);mismatch[1].text='Different product';assert.deepEqual(receiptColumnProposals(lines,mismatch,[],'same-row'),[]);
});
test('summaries, non-food products and unreadable cells remain excluded without stealing another price',()=>{
 for(const label of ['Fish toy','Delivery fee','Card payment']){
  const boxes=example();boxes[2].text=label;assert.deepEqual(suggestUnlabelledReceiptPairs(boxes),[]);
 }
 const boxes=example();boxes[5].text='3.2O';assert.deepEqual(suggestUnlabelledReceiptPairs(boxes),[]);
});
test('mixed same-line and split rows retain each source once and cap at fifty products',()=>{
 const boxes=indexed([...example(),cell('Milk 5.40',.1,.5,.8)]);const rows=products(boxes);assert.equal(rows.length,4);assert.equal(new Set(rows.flatMap(row=>row.sourceLineIds)).size,7);
 const many=indexed([...Array.from({length:55},(_,i)=>[cell('Unknown pantry food',.1,.01+i*.014,.4),{text:'10.00',box:{x:.8,y:.01+i*.014,width:.1,height:.008}}]).flat().map(row=>({...row,box:{...row.box,height:.008}})),cell('Total',.1,.95)]);
 const result=products(many);assert.equal(result.length,50);assert.equal(new Set(result.flatMap(row=>row.sourceLineIds)).size,100);
});
