import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {publicFeeds} from '../lib/community.ts';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
globalThis.__signalsEnv={};
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__signalsEnv;',shortCircuit:true};return next(specifier,context);}});
const {signalsSnapshot,refreshCommunity,refreshDiscord,saveReport,validateReport,notifySignals}=await import('../lib/signals-store.ts');
const report=(extra={})=>({retailer:'Hugendubel',address:'Petersstraße 12–14, 04109 Leipzig',product:'Pokémon 30 Jahre Boosterbundle',kind:'seen',source:'personal',time_precision:'minute',observed_at:Date.now()-60000,expected_at:null,source_url:null,note:'test-only synthetic',price:null,uvp_price:null,uvp_source:null,...extra});
async function withDb(run){
  const sql=new DatabaseSync(':memory:'),folder=new URL('../drizzle/',import.meta.url);
  for(const f of readdirSync(folder).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(f,folder),'utf8'));
  globalThis.__signalsEnv.DB={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};}};},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const original=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;return new Response('Test-only block',{status:403});};
  try{await run(sql,()=>requests);}finally{globalThis.fetch=original;sql.close();}
}
async function testDevice(sql){
  const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const raw=await crypto.subtle.exportKey('raw',key.publicKey),privateKey=await crypto.subtle.exportKey('jwk',key.privateKey);
  globalThis.__signalsEnv.VAPID_PUBLIC_KEY=Buffer.from(raw).toString('base64url');globalThis.__signalsEnv.VAPID_PRIVATE_KEY=privateKey.d;globalThis.__signalsEnv.VAPID_SUBJECT='mailto:test@example.org';
  const endpoint='https://fcm.googleapis.com/fcm/send/test-only-synthetic-device';
  sql.prepare('INSERT INTO devices (endpoint,subscription,created_at) VALUES (?,?,?)').run(endpoint,JSON.stringify({endpoint,keys:{p256dh:Buffer.from(raw).toString('base64url'),auth:Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url')}}),Date.now());
  return endpoint;
}
test('real user history is seeded once without inventing live stock',async()=>withDb(async sql=>{
  const state=await signalsSnapshot();await signalsSnapshot();assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM observations').get().n,2);assert.ok(state.branches.every(b=>b.priced.length===0));assert.equal(state.unassigned.length,1);
}));
test('blocked feeds are recorded and backed off, never displayed as connected',async()=>withDb(async(sql,requests)=>{
  const first=await refreshCommunity();assert.equal(first.checked,publicFeeds.length);assert.equal(first.imported,0);assert.equal(requests(),publicFeeds.length);
  const state=await signalsSnapshot();assert.ok(state.sources.every(s=>s.status==='blocked'&&s.next_check_at>Date.now()));assert.equal((await refreshCommunity()).checked,0);assert.equal(requests(),publicFeeds.length);
}));
test('paused background does not fetch, personal historical reports survive',async()=>withDb(async(sql,requests)=>{
  sql.exec("INSERT INTO meta VALUES ('settings','{\"auto\":false,\"interval\":120}')");assert.equal((await refreshCommunity(true)).paused,true);assert.equal(requests(),0);assert.equal((await signalsSnapshot()).observations.length,2);
}));
test('branch assignment keeps eyewitness time and does not manufacture a current stock alert',async()=>withDb(async sql=>{
  const old=(await signalsSnapshot()).unassigned[0];await saveReport(report({...old,address:'Petersstraße 12–14, 04109 Leipzig'}),'user-hugendubel-2026-10-05');
  const result=await signalsSnapshot();assert.equal(result.unassigned.length,0);assert.ok(result.branches.every(b=>b.priced.length===0));assert.equal(sql.prepare("SELECT observed_at FROM observations WHERE id='user-hugendubel-2026-10-05'").get().observed_at,old.observed_at);
}));
test('missing community evidence, future time, wrong city and incomplete UVP are rejected',()=>{
  for(const input of [report({source:'community'}),report({observed_at:Date.now()+120000}),report({address:'Straße 1, 10115 Berlin'}),report({uvp_price:29.99}),report({kind:'announced',source:'personal',expected_at:Date.now()+60000})])assert.throws(()=>validateReport(input));
  assert.ok(validateReport(report({address:'Musterstraße 1, 04275 Leipzig'})));
  assert.ok(validateReport(report({retailer:'Smyths Toys',address:'Musterstraße 1, 10115 Berlin'})));
});
test('report inputs reject other sets and accessories before persisting a stock alarm',()=>{
  for(const product of ['Pokémon 25 Jahre Boosterbundle','Pokémon 30 Jahre Portfolio','Pokémon 151 Boosterbundle'])assert.throws(()=>validateReport(report({product})),/30 Jahre/);
});
test('new precise report persists; unknown-price report cannot dispatch push',async()=>withDb(async(sql,requests)=>{
  await saveReport(report());assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM observations').get().n,3);assert.equal(requests(),0);assert.equal((await signalsSnapshot()).branches.find(b=>b.retailer==='Hugendubel'&&b.address.includes('12')).recent.length,1);
}));
test('stale pending reports expire and stranded push leases recover',async()=>withDb(async sql=>{
  await signalsSnapshot();sql.exec("UPDATE observations SET push_state='sending:1'");await notifySignals();assert.ok(sql.prepare("SELECT COUNT(*) AS n FROM observations WHERE push_state='expired'").get().n===2);
}));
test('price-qualified fresh reports dispatch once to a synthetic device; edits do not resend',async()=>withDb(async sql=>{
  const endpoint=await testDevice(sql);let sent=0;globalThis.fetch=async(url)=>{assert.equal(url,endpoint);sent++;return new Response('',{status:201});};
  const original=Date.now;Date.now=()=>Date.parse('2026-10-06T12:20:00+02:00');
  try{
    const input=report({price:29.99,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only-reference'});
    await saveReport(input);assert.equal(sent,1);await notifySignals();assert.equal(sent,1);
    const o=(await signalsSnapshot()).observations.find(o=>o.note==='test-only synthetic');assert.equal(o.push_state,'sent');
    await saveReport({...input,note:'test-only corrected note'},o.id);assert.equal(sent,1);
  }finally{Date.now=original;}
}));
test('a newly connected synthetic device can receive a still-fresh no-device report once',async()=>withDb(async sql=>{
  const original=Date.now;Date.now=()=>Date.parse('2026-10-06T12:20:00+02:00');
  try{
    await testDevice(sql);sql.exec('DELETE FROM devices');
    await saveReport(report({price:29.99,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only'}));
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM observations WHERE push_state='no-device'").get().n,1);
    const endpoint=await testDevice(sql);let sent=0;globalThis.fetch=async(url)=>{assert.equal(url,endpoint);sent++;return new Response('',{status:201});};
    await notifySignals();await notifySignals();assert.equal(sent,1);
  }finally{Date.now=original;}
}));
test('connecting a synthetic device does not replay expired no-device reports',async()=>withDb(async sql=>{
  await signalsSnapshot();sql.exec("UPDATE observations SET push_state='no-device'");
  await testDevice(sql);let sent=0;globalThis.fetch=async()=>{sent++;return new Response('',{status:201});};
  await notifySignals();assert.equal(sent,0);
}));
test('empty, closed-store, and unknown-price reports never dispatch to a synthetic device',async()=>withDb(async sql=>{
  await testDevice(sql);let sent=0;globalThis.fetch=async()=>{sent++;return new Response('',{status:201});};
  const original=Date.now;Date.now=()=>Date.parse('2026-10-06T21:20:00+02:00');
  try{
    for(const extra of [{kind:'empty'},{price:null},{price:29.99,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only-reference'}])await saveReport(report(extra));
    assert.equal(sent,0);
  }finally{Date.now=original;}
}));
test('readable synthetic feed is durably imported once, but never promoted to verified stock',async()=>withDb(async sql=>{
  const xml=`<feed><entry><title>Test-only Hugendubel Leipzig Petersstraße Pokémon 30 Jahre</title><published>${new Date(Date.now()-60000).toISOString()}</published><link href="https://www.reddit.com/r/PokemonTCG_DE/comments/testonly/"/><content>Im Laden wird gerade Ware einsortiert. Synthetic test only.</content></entry></feed>`;
  globalThis.fetch=async url=>new Response(String(url).includes('vercel.app')?'<main><h1>Latest reports</h1><h2>Community deals</h2></main>':xml,{headers:{'content-type':'application/atom+xml'}});
  const first=await refreshCommunity();assert.equal(first.imported,1);
  let state=await signalsSnapshot();assert.equal(state.posts.length,1);assert.equal(state.candidates.length,1);assert.ok(state.branches.every(b=>b.priority<=0));
  assert.ok(state.sources.every(s=>s.status==='readable'));assert.ok(state.sources.filter(s=>s.url.includes('reddit')).every(s=>s.detail.includes('1 Feed-Einträge')));
  sql.exec('UPDATE community_sources SET next_check_at=0');assert.equal((await refreshCommunity()).imported,0);
  state=await signalsSnapshot();assert.equal(state.posts.length,1);assert.equal(state.candidates.length,1);
}));
test('authorized Discord imports persist once with backoff and never disclose bot credentials or full chat',async()=>withDb(async sql=>{
  const env=globalThis.__signalsEnv;
  env.DISCORD_IMPORT_ENABLED='true';env.DISCORD_BOT_TOKEN='test-only-private-bot-secret';
  env.DISCORD_CHANNELS=JSON.stringify([{guildId:'111111111111111111',channelId:'222222222222222222',label:'Test-only authorized'}]);
  let requests=0;globalThis.fetch=async()=>{requests++;return Response.json([{id:'333333333333333333',channel_id:'222222222222222222',type:0,timestamp:new Date(Date.now()-60000).toISOString(),content:'Hugendubel Leipzig Petersstrasse: Pokemon 30 Jahre Boosterbundle im Laden. PRIVATE-TEST-ONLY-SENTENCE',author:{username:'PRIVATE-TEST-ONLY-USER'}}]);};
  try{
    await signalsSnapshot();const first=await refreshDiscord();assert.deepEqual(first,{checked:1,imported:1});
    assert.deepEqual(await refreshDiscord(),{checked:0,imported:0});assert.equal(requests,1);
    const state=await signalsSnapshot();assert.equal(state.discord.readable,1);assert.equal(state.candidates.length,1);assert.equal(state.candidates[0].reviewed,0);
    for(const secret of [env.DISCORD_BOT_TOKEN,'PRIVATE-TEST-ONLY-SENTENCE','PRIVATE-TEST-ONLY-USER'])assert.ok(!JSON.stringify(state).includes(secret));
    sql.exec("UPDATE meta SET value='0' WHERE key LIKE 'discordLease:%'");assert.equal((await refreshDiscord()).imported,0);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM observations WHERE id LIKE 'discord:%'").get().n,1);
    sql.prepare("UPDATE meta SET value=? WHERE key='discordState:222222222222222222'").run(JSON.stringify({status:'readable',checked_at:Date.now()-660000}));
    const stale=await signalsSnapshot();assert.equal(stale.discord.readable,0);assert.ok(stale.discord.detail.includes('10 Minuten'));
  }finally{delete env.DISCORD_IMPORT_ENABLED;delete env.DISCORD_BOT_TOKEN;delete env.DISCORD_CHANNELS;}
}));
test('missing Discord credentials never count as a connected source',async()=>withDb(async()=>{
  assert.deepEqual(await refreshDiscord(),{checked:0,imported:0});const state=await signalsSnapshot();assert.equal(state.discord.configured,false);assert.equal(state.discord.readable,0);
}));
