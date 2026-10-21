import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsHarness } from './helpers/render-settings.mjs';
const control=(h,label)=>{const found=h.controls.find(row=>row.accessibilityLabel===label);assert.ok(found,label);return found;};
const press=(h,label)=>{control(h,label).onPress();h.render();};
test('real Settings shows actual identity and fixed household preferences without mock controls',()=>{
 const h=settingsHarness();assert.match(h.markup,/sample@example.test/);assert.match(h.markup,/₹ INR/);assert.match(h.markup,/Asia\/Kolkata/);assert.doesNotMatch(h.markup,/demo@example.test|Daily Kitchen Digest|Check Backend Identity|Test Saved Pantry Restore/);
 press(h,'Account Details');press(h,'Privacy & Data');assert.deepEqual(h.routes,['/settings/profile','/settings/privacy']);assert.equal(h.calls.includes('enable'),false);assert.equal(h.calls.includes('signOut'),false);
});
test('reminder status and time remain visible while explicit recovery controls expand',()=>{
 const h=settingsHarness();assert.match(h.markup,/Scheduled alerts at last check: 3/);assert.equal(h.inputs.find(row=>row.accessibilityLabel==='Expiry reminder time').value,'18:30');
 assert.equal(h.controls.some(row=>row.accessibilityLabel==='Sync Expiry Reminders'),false);press(h,'Permission & sync controls');assert.equal(control(h,'Sync Expiry Reminders').disabled,false);press(h,'Sync Expiry Reminders');assert.ok(h.calls.includes('sync'));
 press(h,'How reminders work');assert.match(h.markup,/Up to 60 nearest alerts/);
});

test('reminder actions preserve enable disable and exact time callbacks',()=>{
 const h=settingsHarness();press(h,'Enable Reminders');assert.ok(h.calls.includes('enable'));
 h.inputs.find(row=>row.accessibilityLabel==='Expiry reminder time').onChangeText('25:99');h.render();press(h,'Save Reminder Time');assert.ok(h.calls.some(row=>Array.isArray(row)&&row[0]==='saveHour'&&row[1]==='25:99'));
 h.reminder.enabled=true;h.render();press(h,'Disable Reminders');assert.ok(h.calls.includes('disable'));
});
test('blocked permission and read-only Pantry retain their recovery and sync guards',()=>{
 const blocked=settingsHarness({reminder:{enabled:true,permission:{allowed:false,label:'Blocked in device settings',canAskAgain:false}}});assert.match(blocked.markup,/saved preference is On, but device permission/);press(blocked,'Open Device Settings');assert.ok(blocked.calls.includes('deviceSettings'));press(blocked,'Turn Saved Preference Off');assert.ok(blocked.calls.includes('disable'));
 const h=settingsHarness({reminder:{enabled:true},pantry:{readOnly:true}});press(h,'Permission & sync controls');assert.equal(control(h,'Sync Expiry Reminders').disabled,true);assert.match(h.markup,/Refresh live Pantry/);
});
test('real account details remain read-only and deletion is a review link only',()=>{
 const h=settingsHarness({page:'profile'});assert.match(h.markup,/sample@example.test/);assert.match(h.markup,/Name and email changes are not available yet/);assert.equal(h.inputs.length,0);press(h,'Delete Account & Data');assert.deepEqual(h.routes,['/settings/delete-account']);assert.deepEqual(h.calls,[]);
});
test('privacy explanations expand independently and preserve the data handling caveats',()=>{
 const h=settingsHarness({page:'privacy'});assert.match(h.markup,/Only grocery fields you review and confirm/);assert.doesNotMatch(h.markup,/OS backups/);press(h,'Receipt photos and text');assert.match(h.markup,/OS backups are outside/);press(h,'Saved copies and retries');assert.match(h.markup,/Pending notification outcomes remain tied to the same account/);press(h,'Account and data deletion');assert.match(h.markup,/Shared-household deletion is unavailable/);assert.equal(h.calls.length,0);
});
test('temporary-photo cleanup still needs an explicit tap and preserves success feedback',()=>{
 const h=settingsHarness({page:'privacy'});assert.deepEqual(h.calls,[]);press(h,'Clear Unused Receipt Photos');assert.deepEqual(h.calls,['clearPhotos']);assert.match(h.markup,/FreshTrack receipt copies: 0/);assert.match(h.markup,/Original library photos are unchanged/);
});
test('session actions and demo controls remain distinct',()=>{
 const h=settingsHarness();press(h,'Sign Out');assert.ok(h.calls.includes('signOut'));
 const demo=settingsHarness({auth:{user:null,demo:true}});assert.match(demo.markup,/Demo session/);assert.match(demo.markup,/Daily Kitchen Digest/);assert.equal(demo.controls.some(row=>row.accessibilityLabel==='Enable Reminders'),false);press(demo,'Sign Out of Demo');assert.equal(demo.calls.includes('exitDemo'),false);press(demo,'Stay Here');press(demo,'Sign Out of Demo');press(demo,'Leave Demo');assert.ok(demo.calls.includes('exitDemo'));
});
