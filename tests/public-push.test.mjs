import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { generatePushSecrets, pushSetup, pushNames } from '../scripts/cloudflare-push.mjs';

globalThis.__publicEnv = {};
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'cloudflare:workers') return { url: 'data:text/javascript,export const env=globalThis.__publicEnv;', shortCircuit: true };
  return next(specifier, context);
} });
const { publicPush } = await import('../lib/public-push.ts');
const { runBackground } = await import('../lib/background.ts');
const { snapshot,setCatalogVersion } = await import('../lib/radar.ts');
async function withDb(run) {
  const sql = new DatabaseSync(':memory:');
  const folder = new URL('../drizzle/', import.meta.url);
  for (const file of readdirSync(folder).filter(f => f.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(file, folder), 'utf8'));
  sql.prepare("INSERT INTO meta VALUES (?, '1')").run(setCatalogVersion);
  Object.assign(globalThis.__publicEnv, generatePushSecrets('https://synthetic-radar.test'));
  globalThis.__publicEnv.DB = { prepare(query) {
    const statement = sql.prepare(query); let args = [];
    return { bind(...values) { args = values; return this; }, async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; },
      async first() { return statement.get(...args) ?? null; }, async all() { return { results: statement.all(...args) }; } };
  }, async batch(statements) {
    sql.exec('BEGIN'); try { const results=[]; for (const s of statements) results.push(await s.run()); sql.exec('COMMIT'); return results; }
    catch(error) { sql.exec('ROLLBACK'); throw error; }
  } };
  const key = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const subscription = { endpoint:'https://fcm.googleapis.com/fcm/send/test-only-device',
    keys:{ p256dh:Buffer.from(await crypto.subtle.exportKey('raw',key.publicKey)).toString('base64url'), auth:Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url') } };
  const fetch = globalThis.fetch; let requests=[];
  globalThis.fetch=async url=>{requests.push(String(url));return new Response('',{status:String(url)===subscription.endpoint?201:403});};
  try { await run(sql,subscription,requests); } finally { globalThis.fetch=fetch; sql.close(); }
}
test('initial key provisioning is one-time and incomplete keys are never overwritten',()=>{
  assert.equal(pushSetup([]),'create'); assert.equal(pushSetup(pushNames),'preserve');
  assert.throws(()=>pushSetup(['VAPID_PRIVATE_KEY']),/Refusing/);
  const keys=generatePushSecrets('https://synthetic-radar.test/path');
  assert.equal(Buffer.from(keys.VAPID_PUBLIC_KEY,'base64url').length,65);
  assert.equal(Buffer.from(keys.VAPID_PRIVATE_KEY,'base64url').length,32);
  assert.equal(keys.VAPID_SUBJECT,'https://synthetic-radar.test');
});
test('public subscription and test require only the current device, not admin',async()=>withDb(async(sql,sub,requests)=>{
  assert.deepEqual(await publicPush('subscribe',sub,'synthetic-ip'),{connected:true});
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM devices').get().n,1);
  assert.deepEqual(await publicPush('test',sub,'synthetic-ip'),{delivered:1,failed:0});
  assert.deepEqual(requests,[sub.endpoint]);
  await assert.rejects(publicPush('test',sub,'synthetic-ip'),e=>e.status===429);
  assert.deepEqual(await publicPush('unsubscribe',sub,'synthetic-ip'),{connected:false});
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM devices').get().n,0);
}));
test('different keys cannot replace, test or delete another device',async()=>withDb(async(sql,sub,requests)=>{
  await publicPush('subscribe',sub,'synthetic-ip');
  const other={...sub,keys:{...sub.keys,auth:'Z'.repeat(22)}};
  for(const action of ['subscribe','test','unsubscribe'])await assert.rejects(publicPush(action,other,'synthetic-ip'),e=>e.status===403);
  assert.equal(requests.length,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM devices').get().n,1);
  assert.equal(JSON.parse(sql.prepare('SELECT subscription FROM devices').get().subscription).keys.auth,sub.keys.auth);
}));
test('arbitrary URLs, unknown devices and registration flooding are rejected',async()=>withDb(async(sql,sub)=>{
  for(const endpoint of ['https://localhost/push','https://example.org/push','http://fcm.googleapis.com/push'])await assert.rejects(publicPush('subscribe',{...sub,endpoint},'synthetic-ip'));
  await assert.rejects(publicPush('test',sub,'synthetic-ip'),e=>e.status===404);
  for(let i=0;i<20;i++)await publicPush('subscribe',sub,'synthetic-ip');
  await assert.rejects(publicPush('subscribe',sub,'synthetic-ip'),e=>e.status===429);
}));
test('public snapshots never expose subscriptions, private keys or device secrets',async()=>withDb(async(sql,sub)=>{
  await publicPush('subscribe',sub,'synthetic-ip');const state=await snapshot(),json=JSON.stringify(state);
  assert.equal(state.devices,1);assert.equal(state.publicKey,globalThis.__publicEnv.VAPID_PUBLIC_KEY);
  for(const secret of [sub.endpoint,sub.keys.auth,globalThis.__publicEnv.VAPID_PRIVATE_KEY])assert.ok(!json.includes(secret));
}));
test('real background worker records completion, source blocks and skips an early repeat',async()=>withDb(async(sql,sub,requests)=>{
  const first=await runBackground();assert.equal(first.stock.checked,1);assert.equal(first.community.checked,3);
  const state=await snapshot();assert.ok(state.schedulerAt);assert.equal(state.backgroundError,null);
  assert.deepEqual(state.schedule,{enabled:true,interval:2});assert.equal(requests.length,4);
  assert.ok(state.monitors.every(m=>m.status==='blocked'));assert.equal(state.drops.length,0);
  assert.deepEqual(await runBackground(),{due:false});assert.equal(requests.length,4);
}));
test('the exact next scheduled interval is due despite completion latency',async()=>withDb(async sql=>{
  const scheduledAt=Date.now()-125000;
  await runBackground(Date.now(),scheduledAt);
  const completed=Number(sql.prepare("SELECT value FROM meta WHERE key='schedulerAt'").get().value);
  assert.ok(completed>scheduledAt);
  assert.deepEqual(await runBackground(Date.now(),scheduledAt+119999),{due:false});
  const next=await runBackground(Date.now(),scheduledAt+120000);
  assert.ok(next.stock);assert.ok(next.community);
  assert.equal(sql.prepare("SELECT value FROM meta WHERE key='backgroundDueAt'").get().value,String(scheduledAt+120000));
}));
test('pause and an existing lease prevent background network work',async()=>withDb(async(sql,sub,requests)=>{
  sql.exec("INSERT INTO meta VALUES ('settings','{\"auto\":false,\"interval\":120}')");
  assert.deepEqual(await runBackground(),{paused:true});assert.equal(requests.length,0);
  sql.exec(`UPDATE meta SET value='${Date.now()+60000}' WHERE key='backgroundLease'`);
  assert.deepEqual(await runBackground(),{busy:true});assert.equal(requests.length,0);
}));
test('failed jobs preserve the last successful heartbeat and release their lease',async()=>withDb(async sql=>{
  sql.exec("INSERT INTO meta VALUES ('schedulerAt','100'); CREATE TRIGGER reject_result BEFORE INSERT ON meta WHEN NEW.key='backgroundResult' BEGIN SELECT RAISE(ABORT,'test-only'); END");
  await assert.rejects(runBackground());const state=await snapshot();assert.equal(state.schedulerAt,100);assert.ok(state.backgroundError);
  assert.equal(sql.prepare("SELECT value FROM meta WHERE key='backgroundLease'").get().value,'0');
}));
