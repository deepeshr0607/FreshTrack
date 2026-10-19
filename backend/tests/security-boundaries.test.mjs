import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { gzipSync } from 'node:zlib';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import appModule from '../dist/app.js';
import authModule from '../dist/services/auth.js';
import deletionModule from '../dist/services/accountDeletion.js';
import pantryModule from '../dist/services/pantry.js';
const { createApp } = appModule, { createIdentityVerifier, AuthFailure } = authModule;
const { AccountDeletionFailure } = deletionModule, { createPantryService } = pantryModule;
const url = 'https://security-fixture.neonauth.neon.tech/neondb/auth', issuer = new URL(url).origin;
const keys = await generateKeyPair('EdDSA'), otherKeys = await generateKeyPair('EdDSA');
const verify = createIdentityVerifier(url, createLocalJWKSet({ keys: [{ ...await exportJWK(keys.publicKey), kid: 'fixture' }] }));
const user = { id: 'security-fixture-a', email: 'a@example.test', name: 'Fixture A' };
const id = '10000000-0000-4000-8000-000000000001', foreign = '20000000-0000-4000-8000-000000000002', version = '2026-10-20T00:00:00.000Z';
const item = { name: 'Fixture Rice', category: 'OTHER', quantity: '1', unit: 'bag', expiresOn: '2026-10-30', totalCostMinor: null };
const outcome = { confirmed: true, expectedUpdatedAt: version }, ref = { id, expectedUpdatedAt: version }, receipt = { items: [{ rowId: 'rice', item }] };
// Valid concrete requests for every registered protected method/path, including account recovery.
const routes = [
 ['get','/auth/me'], ['get','/account/deletion'], ['post','/account/deletion',{ email:user.email, confirmation:'DELETE' }],
 ['get','/households/current'], ['get',`/households/${id}`], ['post','/households/current',{}],
 ['get','/pantry'], ['post','/pantry',item], ['get',`/pantry/${id}`], ['patch',`/pantry/${id}`,{ ...item, expectedUpdatedAt:version }],
 ...['consume','waste','undo-status'].map(action=>['post',`/pantry/${id}/${action}`,outcome]),
 ['post','/pantry/batch-outcome',{ confirmed:true, action:'consume', items:[ref] }], ['post','/pantry/batch-undo',{ confirmed:true, items:[ref] }],
 ['post','/pantry/duplicate-check',item], ['post','/pantry/receipt-review',receipt], ['post','/pantry/receipt-import',{ ...receipt, confirmed:true }],
 ['get','/chef/expiring'], ['post','/chef/suggestions',{}], ['post','/chef/filters',{}], ['get','/chef/recipes/123'],
 ['get','/analytics/summary'], ['get','/analytics/series'], ['get','/scanner/barcodes/3017620422003'],
];
async function token({ claims={}, audience=issuer, expires='15m', signingKey=keys.privateKey }={}) {
 return new SignJWT({ ...user, emailVerified:true, ...claims }).setProtectedHeader({ alg:'EdDSA', kid:'fixture' }).setSubject(user.id)
 .setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expires).sign(signingKey);
}
function send(app,[method,path,body],authorization,extra={}) {
 let call=request(app)[method]('/api/v1'+path).set('Idempotency-Key','security-fixture-key-12345').set(extra);
 if(authorization) call=call.set('Authorization',authorization);
 return body===undefined?call:call.send(body);
}
function envelope(res,status,code) {
 assert.equal(res.status,status); assert.equal(res.body.error.code,code); assert.equal(res.body.error.requestId,res.headers['x-request-id']);
 assert.match(res.body.error.requestId,/^[0-9a-f-]{36}$/); assert.equal(res.headers['cache-control'],'no-store'); assert.equal(res.body.data,undefined);
}
function fixture({ verifier=verify, active=async()=>{} }={}) {
 const calls=[], call=method=>async identity=>{ calls.push({ method,identity }); return {}; };
 const app=createApp({ verifyIdentity:verifier, accountDeletionService:{ assertActive:active, review:call('review'), removeData:call('remove') },
 householdService:{ bootstrap:call('bootstrap'), findForIdentity:call('household') },
 pantryService:Object.fromEntries(['batch','receiptImport','receiptReview','duplicates','edit','undo','outcome','list','create','find'].map(n=>[n,call(n)])),
 chefService:{ expiring:call('expiring') }, chefSuggestionsService:{ suggest:call('suggest'), filters:call('filters'), detail:call('detail') },
 analyticsService:{ summary:call('summary'), series:call('series') }, barcodeProvider:{ lookup:async()=>{ calls.push({ method:'barcode' }); return { status:'NOT_FOUND' }; } } });
 return { app,calls };
}
test('all 25 protected method/path pairs reject missing, forged, expired and unverified credentials before service access',async()=>{
 const credentials=[undefined,'Bearer a.b.c',`Bearer ${await token({ signingKey:otherKeys.privateKey })}`,`Bearer ${await token({ expires:'-1m' })}`,
 `Bearer ${await token({ claims:{ emailVerified:false } })}`,`Bearer ${await token({ audience:'https://wrong.example.test' })}`];
 for(const authorization of credentials) {
  const h=fixture(); for(const route of routes) envelope(await send(h.app,route,authorization,{ 'x-user-id':'victim','x-household-id':foreign }),401,'UNAUTHORIZED');
  assert.equal(h.calls.length,0);
 }
});
test('verification outage blocks every protected route; deleted tokens only reach deletion recovery',async()=>{
 const authorization=`Bearer ${await token()}`, unavailable=fixture({ verifier:async()=>{ throw new AuthFailure(true); } });
 for(const route of routes) envelope(await send(unavailable.app,route,authorization),503,'AUTH_UNAVAILABLE'); assert.equal(unavailable.calls.length,0);
 const deleted=fixture({ active:async()=>{ throw new AccountDeletionFailure('ACCOUNT_DATA_DELETED'); } });
 for(const route of routes) {
  const res=await send(deleted.app,route,authorization);
  if(route[1]==='/account/deletion') assert.equal(res.status,200); else envelope(res,403,'ACCOUNT_DATA_DELETED');
 }
 assert.deepEqual(deleted.calls.map(r=>r.method),['review','remove']);
});
test('valid signed identity reaches every route; spoofed headers never select its owner',async()=>{
 const h=fixture(), authorization=`Bearer ${await token()}`;
 for(const route of routes) {
  const res=await send(h.app,route,authorization,{ 'x-user-id':'victim','x-household-id':foreign }); assert.equal(res.status,200,route.join(' '));
  assert.equal(res.headers['cache-control'],'no-store'); if(route[1]==='/auth/me') assert.deepEqual(res.body.data.user,user);
 }
 assert.equal(h.calls.length,24); for(const row of h.calls.filter(r=>r.method!=='barcode')) assert.deepEqual(row.identity,user);
});
test('query/body identity overrides are rejected before data access; auth/me only returns verified identity',async()=>{
 const h=fixture(), authorization=`Bearer ${await token()}`;
 for(const route of routes.filter(r=>r[1]!=='/auth/me')) envelope(await send(h.app,[route[0],route[1]+'?householdId='+foreign,route[2]],authorization),400,'INVALID_REQUEST');
 for(const route of routes.filter(r=>r[2]!==undefined)) for(const extra of [{ userId:'victim' },{ householdId:foreign }])
  { const isolated=fixture(); envelope(await send(isolated.app,[route[0],route[1],{ ...route[2],...extra }],authorization),400,'INVALID_REQUEST'); assert.equal(isolated.calls.length,0); }
 assert.equal(h.calls.length,0);
 const res=await send(h.app,['get','/auth/me?userId=victim&householdId='+foreign],authorization); assert.equal(res.status,200); assert.deepEqual(res.body.data.user,user);
});
test('foreign details/edit/Used/Wasted/Undo and mixed batches stop before writes or event replay',async()=>{
 let reads=0,writes=0;
 const scope=where=>{ reads++; assert.equal(where.householdId,id); assert.equal(where.household.members.some.authSubject,user.id); };
 const tx={ householdMember:{ findUnique:async({ where })=>{ assert.deepEqual(where,{ authSubject:user.id }); return { householdId:id,household:{ timezone:'Asia/Kolkata' } }; } },
 pantryItem:{ findFirst:async({ where })=>{ scope(where); assert.equal(where.id,foreign); return null; },
 findMany:async({ where })=>{ scope(where); assert.ok(where.id.in.includes(foreign)); return []; }, update:async()=>{ writes++; } },
 pantryItemEvent:{ findUnique:async()=>{ writes++; },findMany:async()=>{ writes++; },create:async()=>{ writes++; } } };
 const service=createPantryService({ $transaction:async run=>run(tx) });
 const attempts=[()=>service.find(user,foreign),()=>service.edit(user,foreign,{ ...item,expectedUpdatedAt:version },'foreign-key'),
 ...['consume','waste'].map(action=>()=>service.outcome(user,foreign,action,outcome,'foreign-key')),()=>service.undo(user,foreign,outcome,'foreign-key'),
 ...['consume','waste','restore'].map(action=>()=>service.batch(user,{ confirmed:true,items:[ref,{ ...ref,id:foreign }] },action,'foreign-key'))];
 for(const attempt of attempts) await assert.rejects(attempt,{ code:'ITEM_NOT_FOUND' }); assert.equal(reads,8); assert.equal(writes,0);
});
test('oversized, compressed and malformed JSON is rejected privately before authentication or service work',async()=>{
 const logs=[], original=console.error; let verifications=0; const h=fixture({ verifier:async()=>{ verifications++; return user; } });
 try {
  console.error=value=>logs.push(JSON.parse(value));
  for(const [body,encoding,status] of [[JSON.stringify({ private:'sensitive-fixture'.repeat(10000) }),null,413],
  [gzipSync(Buffer.from('{"private":"sensitive-fixture"}')),'gzip',415],['{"private":"sensitive-fixture"',null,400]]) {
   let call=request(h.app).post('/api/v1/pantry').set('Content-Type','application/json').set('x-request-id','sensitive-fixture');
   if(encoding) call=call.set('Content-Encoding',encoding); const res=await call.send(body); envelope(res,status,'REQUEST_ERROR'); assert.equal(JSON.stringify(res.body).includes('sensitive-fixture'),false);
  }
  assert.equal(logs.length,3); assert.equal(JSON.stringify(logs).includes('sensitive-fixture'),false); assert.equal(verifications,0); assert.equal(h.calls.length,0);
 } finally { console.error=original; }
});
test('malformed bodies count toward global rate limit; throttling runs before JSON parsing',async()=>{
 const h=fixture(), original=console.error;
 try {
  console.error=()=>{};
  for(let i=0;i<120;i++) assert.equal((await request(h.app).post('/api/v1/pantry').set('Content-Type','application/json').send('{')).status,400);
  const limited=await request(h.app).post('/api/v1/pantry').set('Content-Type','application/json').send('{'); envelope(limited,429,'RATE_LIMITED');
  assert.ok(Number(limited.headers['retry-after'])>0); assert.equal(h.calls.length,0);
 } finally { console.error=original; }
});
test('full 50-item multilingual receipt with expiry provenance fits limit and reaches normal validation',async()=>{
 const h=fixture(), authorization=`Bearer ${await token()}`;
 const body={ confirmed:true,items:Array.from({ length:50 },(_,i)=>({ rowId:'row-'+i,item:{ ...item,name:'अ'.repeat(120),unit:'अ'.repeat(32),
 duplicateConfirmation:{ confirmed:true,action:'add_separately' },expirySelection:{ packageDate:'2026-10-30',userDate:null,preset:null } } })) };
 assert.ok(Buffer.byteLength(JSON.stringify(body))<128*1024); assert.equal((await send(h.app,['post','/pantry/receipt-import',body],authorization)).status,200);
 assert.equal(h.calls[0].method,'receiptImport');
});
