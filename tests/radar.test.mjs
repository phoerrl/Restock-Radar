import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';

// Exercise the real worker queries against the real schema without network or real devices.
globalThis.__radarTestEnv={VAPID_PUBLIC_KEY:'test-only',VAPID_PRIVATE_KEY:'test-only'};
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__radarTestEnv;',shortCircuit:true};
  return next(specifier,context);
}});
const {scan,snapshot,seed,storeSettings,addMonitor,updateReference}=await import('../lib/radar.ts');
const url='https://www.thalia.de/shop/home/artikeldetails/A123';
function html(local=false,count=3,price=29.99){
  const offer={availability:`https://schema.org/${count?'InStock':'OutOfStock'}`,price,priceCurrency:'EUR'};
  if(local)Object.assign(offer,{inventoryLevel:{value:count},availableAtOrFrom:{'@type':'BookStore',name:'Thalia Leipzig',address:{streetAddress:'Karl-Liebknecht-Str. 8-14',postalCode:'04107',addressLocality:'Leipzig'}}});
  return `<h1>Pokémon 30 Jahre Boosterbundle</h1><script type="application/ld+json">${JSON.stringify({'@type':'Product',url,name:'Pokémon 30 Jahre Boosterbundle',offers:offer})}</script>`;
}
async function withDb(run){
  const sql=new DatabaseSync(':memory:');
  const migrations=new URL('../drizzle/',import.meta.url);
  for(const file of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,migrations),'utf8'));
  globalThis.__radarTestEnv.DB={prepare(query){
    const statement=sql.prepare(query);let args=[];
    return {bind(...values){args=values;return this;},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};}};
  },async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  sql.exec("INSERT INTO meta VALUES ('seeded','1'),('physicalScopeV1','1')");
  sql.prepare("INSERT INTO monitors (id,name,retailer,url,kind) VALUES ('watched','Pokémon 30 Jahre Boosterbundle','Thalia',?,'product')").run(url);
  sql.exec("UPDATE monitors SET uvp_price=29.99,uvp_source='https://www.pokemon.com/de/test-only-reference' WHERE id='watched'");
  const original=globalThis.fetch;let response=html(),requests=0;
  globalThis.fetch=async()=>{requests++;return new Response(response,{headers:{'content-type':'text/html'}});};
  try{await run(sql,{respond:value=>{response=value;},due:()=>sql.exec("UPDATE monitors SET next_check_at=0"),requests:()=>requests});}
  finally{globalThis.fetch=original;sql.close();}
}

test('old online and marketplace settings cannot re-enable online alarms',async()=>withDb(async sql=>{
  sql.prepare("INSERT INTO meta VALUES ('settings',?)").run(JSON.stringify({auto:true,interval:120,online:true,marketplace:true}));
  const result=await scan();assert.equal(result.checked,1);assert.equal(result.drops,0);
  const state=await snapshot();assert.deepEqual(state.settings,{auto:true,interval:120});assert.equal(state.monitors[0].status,'unknown');assert.equal(state.drops.length,0);
}));
test('pending online and old pickup events are neither displayed nor dispatched',async()=>withDb(async(sql,io)=>{
  for(const channel of ['online','pickup'])sql.prepare("INSERT INTO drops (id,monitor_id,version,title,url,retailer,channel,location,kind,created_at) VALUES (?, 'old', ?, 'Old', ?, 'Thalia', ?, 'Leipzig','first',?)").run(channel,channel==='online'?1:2,url,channel,Date.now());
  await scan();assert.equal((await snapshot()).drops.length,0);assert.equal(io.requests(),1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM drops WHERE push_state='pending'").get().n,2);
}));
test('worker persists first sighting, suppresses repeats and records a real per-branch transition',async()=>withDb(async(sql,io)=>{
  io.respond(html(true));assert.equal((await scan()).drops,1);
  assert.equal((await snapshot()).drops[0].kind,'first');
  io.due();assert.equal((await scan()).drops,0);
  io.respond('<title>Sicherheits-Check</title>');io.due();assert.equal((await scan()).drops,0);
  io.respond(html(true));io.due();assert.equal((await scan()).drops,0);
  io.respond(html(true,0));io.due();assert.equal((await scan()).drops,0);
  io.respond(html(true,4));io.due();assert.equal((await scan()).drops,1);
  const events=(await snapshot()).drops;assert.equal(events.length,2);assert.ok(events.some(d=>d.kind==='restock'));
  assert.ok(events.every(d=>d.channel==='store'&&d.location.includes('04107 Leipzig')&&d.push_state==='no-device'));
}));
test('paused background run makes no retailer requests',async()=>withDb(async(sql,io)=>{
  sql.exec("INSERT INTO meta VALUES ('settings','{\"auto\":false,\"interval\":120}')");
  assert.equal((await scan(true)).paused,true);assert.equal(io.requests(),0);
}));
test('scope upgrade archives legacy shopping sources without deleting data',async()=>withDb(async sql=>{
  sql.exec("DELETE FROM meta WHERE key='physicalScopeV1'; UPDATE monitors SET channel='online',status='available'; INSERT INTO monitors (id,name,retailer,url,kind) VALUES ('search','Search','Thalia','https://www.thalia.de/suche','discovery')");
  await seed();assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM monitors').get().n,2);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM monitors WHERE enabled=0 AND kind='archived'").get().n,2);
  assert.equal((await snapshot()).monitors.length,0);
}));
test('invalid legacy settings fall back to physical-only defaults',()=>{
  assert.deepEqual(storeSettings('not JSON'),{auto:true,interval:120});
  assert.deepEqual(storeSettings('{"auto":true,"interval":-1,"online":true}'),{auto:true,interval:120});
});
test('an interval-limited scan does not advance the real check timestamp',async()=>withDb(async(sql,io)=>{
  await scan();const checkedAt=(await snapshot()).lastScan;
  sql.exec("UPDATE monitors SET next_check_at=9999999999999");
  assert.equal((await scan()).checked,0);assert.equal((await snapshot()).lastScan,checkedAt);assert.equal(io.requests(),1);
}));
test('all ten requested retailers have equal directory entries and physical filters',async()=>withDb(async()=>{
  const state=await snapshot();
  assert.deepEqual(state.retailers.map(r=>r.name),['EDEKA','GALERIA','Hugendubel','Lidl','MediaMarkt','Müller','REWE','Rossmann','Smyths Toys','Thalia']);
  for(const retailer of state.retailers)assert.ok(state.stores.some(s=>s.retailer===retailer.name));
  assert.equal(state.stores[0].retailer,'EDEKA');
}));
test('unknown, above-reference and missing-reference prices never create worker events',async()=>withDb(async(sql,io)=>{
  for(const price of [null,30,100]){io.respond(html(true,3,price));io.due();assert.equal((await scan()).drops,0);}
  sql.exec('UPDATE monitors SET uvp_price=NULL,uvp_source=NULL');io.respond(html(true));io.due();assert.equal((await scan()).drops,0);
  assert.equal((await snapshot()).drops.length,0);
}));
test('a later price confirmation creates one price event, never a fabricated receipt or restock',async()=>withDb(async(sql,io)=>{
  io.respond(html(true,3,null));assert.equal((await scan()).drops,0);
  io.respond(html(true,3,29.99));io.due();assert.equal((await scan()).drops,1);
  const event=(await snapshot()).drops[0];assert.equal(event.kind,'price');assert.equal(event.price,29.99);assert.equal(event.uvp_price,29.99);assert.equal(event.branches[0].price,29.99);
  io.due();assert.equal((await scan()).drops,0);
}));
test('adding or changing a reference is validated, persisted and rechecked',async()=>withDb(async(sql,io)=>{
  await assert.rejects(addMonitor({name:'Pokémon 30 Jahre Test',url:'https://www.rewe.de/test',uvpPrice:29.99}));
  await assert.rejects(updateReference('watched',29.999,'https://www.pokemon.com/de/test'));
  const id=await addMonitor({name:'Pokémon 30 Jahre Test',url:'https://www.rewe.de/test',uvpPrice:29.99,uvpSource:'https://www.pokemon.com/de/test'});
  assert.equal(sql.prepare('SELECT retailer FROM monitors WHERE id=?').get(id).retailer,'REWE');
  sql.prepare('UPDATE monitors SET enabled=0 WHERE id=?').run(id);
  io.respond(html(true,3,30));await scan();
  await updateReference('watched',35,'https://www.pokemon.com/de/test');assert.equal((await scan()).drops,1);
  assert.equal((await snapshot()).drops[0].kind,'price');
  await updateReference('watched',null,null);assert.equal((await snapshot()).monitors.find(m=>m.id==='watched').uvp_price,null);
}));
test('legacy store events without a UVP evidence snapshot cannot be pushed',async()=>withDb(async(sql,io)=>{
  sql.prepare("INSERT INTO drops (id,monitor_id,version,title,url,retailer,channel,location,kind,created_at) VALUES ('old-store','watched',99,'Old',?,'Thalia','store','Leipzig','first',?)").run(url,Date.now());
  await scan();assert.equal(io.requests(),1);assert.equal(sql.prepare("SELECT push_state FROM drops WHERE id='old-store'").get().push_state,'pending');
  assert.equal((await snapshot()).drops.length,0);
}));
test('monitor update and event insert roll back together on event write failure',async()=>withDb(async(sql,io)=>{
  sql.exec("CREATE TRIGGER reject_drop BEFORE INSERT ON drops BEGIN SELECT RAISE(ABORT,'Test write failure'); END");
  io.respond(html(true));await assert.rejects(scan());
  assert.equal(sql.prepare("SELECT last_stock FROM monitors WHERE id='watched'").get().last_stock,null);
  sql.exec('DROP TRIGGER reject_drop');assert.equal((await scan()).drops,1);
}));
test('pending price-qualified alerts cannot be sent after a later expensive or sold-out observation',async()=>withDb(async(sql,io)=>{
  io.respond(html(true));await scan();
  for(const response of [html(true,3,40),html(true,0)]){
    sql.exec("UPDATE drops SET push_state='pending'");io.respond(response);io.due();await scan();
    assert.equal(sql.prepare('SELECT push_state FROM drops').get().push_state,'pending');
  }
}));
