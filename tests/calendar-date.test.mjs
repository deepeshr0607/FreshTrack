import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,calendarMonth,isCalendarDate,calendarDateLabel} from '../lib/calendarDate.ts';
import {expiryDateValue,chooseExpiryDate} from '../lib/pantryExpiry.ts';
import {receiptReviewHarness} from './helpers/render-receipt-review.mjs';
const press=(h,label)=>{const c=h.controls.find(row=>row.accessibilityLabel===label);assert.ok(c,label);c.onPress();h.render();};
test('calendar validates real days, leap years and year/month boundaries without local-time shifts',()=>{
 assert.ok(isCalendarDate('2028-02-29'));assert.equal(isCalendarDate('2026-02-29'),false);assert.equal(isCalendarDate('2026-04-31'),false);assert.equal(calendarDays('2028-02').filter(Boolean).length,29);assert.equal(calendarDays('2026-02').filter(Boolean).length,28);assert.equal(calendarMonth('2026-12',1),'2027-01');assert.equal(calendarMonth('2026-01',-1),'2025-12');assert.equal(calendarMonth('0001-01',-1),'0001-01');assert.equal(calendarMonth('9999-12',1),'9999-12');assert.equal(calendarDateLabel('2026-10-22'),'22 Oct 2026');
});
test('unified expiry displays estimate or printed date and preserves source until replaced',()=>{
 const estimated={packageDate:'',userDate:'',baseDate:'2026-10-22',days:'2'};assert.equal(expiryDateValue(estimated),'2026-10-24');assert.equal(chooseExpiryDate(estimated,'2026-10-24'),estimated);assert.deepEqual(chooseExpiryDate(estimated,'2026-10-25'),{packageDate:'',userDate:'2026-10-25',baseDate:'',days:''});
 const printed={packageDate:'2026-11-01',userDate:'',baseDate:'',days:''};assert.equal(chooseExpiryDate(printed,'2026-11-01'),printed);assert.deepEqual(chooseExpiryDate(printed,''),{packageDate:'',userDate:'',baseDate:'',days:''});assert.equal(expiryDateValue({packageDate:'',userDate:'',baseDate:'',days:''}),'');
});
test('calendar opens on the saved date, Cancel has no callback, and Use Date commits exactly one date',()=>{
 const h=receiptReviewHarness({page:'calendar',value:'2026-10-22'});assert.equal(h.fields.length,0);press(h,'Choose expiry date');press(h,'Select 2026-10-23');assert.deepEqual(h.calls,[]);press(h,'Cancel Date Selection');assert.deepEqual(h.calls,[]);
 press(h,'Choose expiry date');press(h,'Next month');press(h,'Select 2026-11-02');press(h,'Use Date');assert.deepEqual(h.calls,[['date','2026-11-02']]);
});
test('same date keeps provenance; blank field is not implicitly today; Clear is explicit',()=>{
 const h=receiptReviewHarness({page:'calendar',value:'2026-10-22'});press(h,'Choose expiry date');press(h,'Use Date');assert.deepEqual(h.calls,[]);press(h,'Choose expiry date');press(h,'Clear expiry date');assert.deepEqual(h.calls,[['date','']]);
 const blank=receiptReviewHarness({page:'calendar'});press(blank,'Choose expiry date');assert.equal(blank.controls.find(row=>row.accessibilityLabel==='Use Date').disabled,true);assert.deepEqual(blank.calls,[]);press(blank,'Select today');press(blank,'Use Date');assert.equal(blank.calls.length,1);assert.ok(isCalendarDate(blank.calls[0][1]));
});
test('month/year shortcuts select a valid leap day and disabled fields cannot open',()=>{
 const h=receiptReviewHarness({page:'calendar',value:'2026-10-22'});press(h,'Choose expiry date');press(h,'Choose year');press(h,'Year 2028');press(h,'Month February');press(h,'Select 2028-02-29');press(h,'Use Date');assert.deepEqual(h.calls,[['date','2028-02-29']]);
 const locked=receiptReviewHarness({page:'calendar',readOnly:true});assert.equal(locked.controls.find(row=>row.accessibilityLabel==='Choose expiry date').disabled,true);press(locked,'Choose expiry date');assert.equal(locked.controls.some(row=>row.accessibilityLabel==='Use Date'),false);
});
test('receipt editor shows the existing estimate in Expiry date and clearing it does not reapply it on Save',()=>{
 const h=receiptReviewHarness({lines:['Spinach Rs. 30.00']});press(h,'Edit Spinach');assert.doesNotMatch(h.markup,/Manual expiry/);assert.equal(h.fields.some(row=>/expiry/i.test(row.accessibilityLabel??'')),false);press(h,'Choose expiry date');press(h,'Clear expiry date');press(h,'Save Product');assert.match(h.markup,/Add an expiry date or check details/);press(h,'Review & Add 1 Products to Pantry');assert.equal(h.prepared.length,0);
});

test('shared Pantry expiry form displays the calculated date in one picker and preserves or replaces its source',()=>{
 const original={packageDate:'',userDate:'',baseDate:'2026-10-22',days:'2'};const h=receiptReviewHarness({page:'expiry',expiry:original});assert.match(h.markup,/24 Oct 2026/);assert.doesNotMatch(h.markup,/Manual expiry|Package date/);assert.equal(h.fields.some(row=>/date/i.test(row.accessibilityLabel??'')),false);
 press(h,'Choose expiry date');press(h,'Use Date');assert.deepEqual(h.calls,[]);press(h,'Choose expiry date');press(h,'Select 2026-10-25');press(h,'Use Date');assert.deepEqual(h.calls,[['expiry',{packageDate:'',userDate:'2026-10-25',baseDate:'',days:''}]]);assert.match(h.markup,/25 Oct 2026/);
});
