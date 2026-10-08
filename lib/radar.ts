import { env } from "cloudflare:workers";
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { seeds, stores, retailers } from "./catalog.ts";
import { blank, fetchRetail, hosts, parsePage, retailUrl, type Result } from "./retail.ts";
import { priceState, readBranches, uvpTransition, validateReference } from "./pricing.ts";
import { normalizePlace } from "./place.ts";
import { catalogSeeds } from "./set-catalog.ts";
import { hasBranchStock } from "./branch-stock.ts";

export const setCatalogVersion = "setCatalog20261007V1";

export function storeSettings(value:string) {
  try{const s=JSON.parse(value);return {auto:s.auto!==false,interval:[120,300,600].includes(s.interval)?s.interval:120};}
  catch{return {auto:true,interval:120};}
}

export function database() { if(!env.DB)throw new Error("Der Radar-Speicher ist vorübergehend nicht erreichbar.");return env.DB; }
export async function meta(key:string, fallback="") {return (await database().prepare("SELECT value FROM meta WHERE key = ?").bind(key).first<{value:string}>())?.value ?? fallback;}
export async function setMeta(key:string,value:string){await database().prepare("INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key,value).run();}
export async function seed(){
  if(!await meta("seeded"))await database().batch([
    ...seeds.map(s=>database().prepare("INSERT OR IGNORE INTO monitors (id,name,retailer,url,kind) VALUES (?,?,?,?,?)").bind(s.id,s.name,s.retailer,s.url,s.kind)),
    database().prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('seeded','1')"),
  ]);
  if(!await meta("physicalScopeV1"))await database().batch([
    database().prepare("UPDATE monitors SET enabled=0,kind='archived' WHERE kind='discovery' OR (channel='online' AND status IN ('available','unavailable','preorder'))"),
    database().prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('physicalScopeV1','1')"),
  ]);
  if(!await meta(setCatalogVersion))await database().batch([
    ...catalogSeeds().map(s=>database().prepare("INSERT OR IGNORE INTO monitors (id,name,retailer,url,kind) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM monitors WHERE url=?)").bind(s.id,s.name,s.retailer,s.url,s.kind,s.url)),
    database().prepare("INSERT OR IGNORE INTO meta (key,value) VALUES (?, '1')").bind(setCatalogVersion),
  ]);
}
export async function snapshot(){
  await seed();
  const [monitors,drops,deviceCount,settings,schedulerAt,schedule,backgroundError,backgroundStartedAt] = await Promise.all([
    database().prepare("SELECT * FROM monitors WHERE kind='product' ORDER BY retailer,name").all(),
    database().prepare("SELECT * FROM drops WHERE channel='store' AND location IS NOT NULL AND uvp_price IS NOT NULL AND uvp_source IS NOT NULL ORDER BY created_at DESC LIMIT 100").all(),
    database().prepare("SELECT COUNT(*) AS n FROM devices").first<{n:number}>(),
    meta("settings",'{}'),
    meta("schedulerAt"),meta("schedule"),
    meta("backgroundError"),meta("backgroundStartedAt"),
  ]);
  const vars=env as unknown as Record<string,string|undefined>;
  const physical=monitors.results.map((m:any)=>m.channel==="store"?{...m,branches:readBranches(m.branch_stock)}:{...m,branches:[],channel:"unknown",location:null,price:null,seller:null,status:["available","unavailable","preorder"].includes(m.status)?"unknown":m.status,detail:["available","unavailable","preorder"].includes(m.status)?"Kein Filialbestand belegt":m.detail});
  const directory=new Map(stores.map(s=>[`${s.retailer}:${normalizePlace(s.address)}`,s]));
  for(const m of physical)for(const b of m.branches)if(b.address && b.name){
    const key=`${m.retailer}:${normalizePlace(b.address)}`;
    if(!directory.has(key))directory.set(key,{retailer:m.retailer,name:b.name,address:b.address,url:m.url});
  }
  const ordered=[...directory.values()].sort((a,b)=>a.retailer.localeCompare(b.retailer,"de")||a.name.localeCompare(b.name,"de"));
  const pricedDrops=drops.results.map((d:any)=>({...d,branches:readBranches(d.branch_stock)})).filter((d:any)=>d.branches.length>0 && d.branches.every((b:any)=>hasBranchStock(b) && priceState(b.price,d)==="eligible"));
  return {monitors:physical,drops:pricedDrops,retailers,stores:ordered,devices:deviceCount?.n??0,settings:storeSettings(settings),schedulerAt:schedulerAt?Number(schedulerAt):null,schedule: schedule?JSON.parse(schedule):null,backgroundError:backgroundError||null,backgroundStartedAt:backgroundStartedAt?Number(backgroundStartedAt):null,publicKey:vars.VAPID_PUBLIC_KEY??null,lastScan:Math.max(0,...physical.map((m:any)=>Number(m.checked_at)||0))||null,now:Date.now()};
}
export function pushEndpoint(endpoint:string){
  const u=new URL(endpoint);
  if(u.protocol!=="https:" || (u.port && u.port!=="443") || u.username || u.password || !(u.hostname.endsWith(".push.apple.com") || ["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com"].includes(u.hostname)))throw new Error("Unbekannter Push-Dienst");
  return u;
}
export async function subscribe(sub:PushSubscription){
  pushEndpoint(sub.endpoint);
  if(!/^[\w-]{86,90}$/.test(sub.keys?.p256dh) || !/^[\w-]{20,24}$/.test(sub.keys?.auth))throw new Error("Ungültiges Push-Abonnement");
  await database().prepare("INSERT INTO devices (endpoint,subscription,created_at) VALUES (?,?,?) ON CONFLICT(endpoint) DO UPDATE SET subscription=excluded.subscription,last_error=NULL").bind(sub.endpoint,JSON.stringify(sub),Date.now()).run();
}
export async function sendPush(payload:Record<string,unknown>, endpoint?:string){
  const vars=env as unknown as Record<string,string>;
  if(!vars.VAPID_PRIVATE_KEY || !vars.VAPID_PUBLIC_KEY)throw new Error("Push ist noch nicht eingerichtet.");
  const list=await database().prepare(endpoint?"SELECT * FROM devices WHERE endpoint = ?":"SELECT * FROM devices").bind(...(endpoint?[endpoint]:[])).all<{endpoint:string;subscription:string}>();
  let delivered=0,failed=0;
  for(const device of list.results){
    try{
      pushEndpoint(device.endpoint);
      const request=await buildPushPayload({data:JSON.stringify(payload),options:{ttl:600}},JSON.parse(device.subscription),{subject:vars.VAPID_SUBJECT,publicKey:vars.VAPID_PUBLIC_KEY,privateKey:vars.VAPID_PRIVATE_KEY});
      const res=await fetch(device.endpoint,{...request,redirect:"manual",signal:AbortSignal.timeout(10000)});
      if(res.ok){delivered++;await database().prepare("UPDATE devices SET last_error=NULL WHERE endpoint=?").bind(device.endpoint).run();}
      else if([404,410].includes(res.status)){failed++;await database().prepare("DELETE FROM devices WHERE endpoint=?").bind(device.endpoint).run();}
      else {failed++;await database().prepare("UPDATE devices SET last_error=? WHERE endpoint=?").bind(`Push-Dienst HTTP ${res.status}`,device.endpoint).run();}
    }catch{failed++;await database().prepare("UPDATE devices SET last_error='Push-Übertragung fehlgeschlagen' WHERE endpoint=?").bind(device.endpoint).run();}
  }
  return {delivered,failed};
}
export async function addMonitor(input:{name:string;url:string;uvpPrice?:number|null;uvpSource?:string|null}){
  const url=retailUrl(input.url);
  const name=input.name.trim().slice(0,180);
  if(name.length<3)throw new Error("Bitte einen Produktnamen angeben.");
  const reference=validateReference(input.uvpPrice??null,input.uvpSource??null);
  const count=await database().prepare("SELECT COUNT(*) AS n FROM monitors").first<{n:number}>();
  if((count?.n??0)>=80)throw new Error("Maximal 80 Produkte und Quellen sind möglich.");
  const id=crypto.randomUUID();
  await database().prepare("INSERT INTO monitors (id,name,retailer,url,kind,uvp_price,uvp_source) VALUES (?,?,?,?,'product',?,?)").bind(id,name,hosts[url.hostname],url.href,reference.uvp_price,reference.uvp_source).run();
  return id;
}
export async function updateReference(id:string,price:number|null,source:string|null){
  const reference=validateReference(price,source);
  await database().prepare("UPDATE monitors SET uvp_price=?,uvp_source=?,next_check_at=0,version=version+1 WHERE id=? AND kind='product'").bind(reference.uvp_price,reference.uvp_source,id).run();
}
export async function scan(background=false){
  await seed();
  const started=Date.now(), db=database();
  await db.prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('scanLock','0')").run();
  const lock=await db.prepare("UPDATE meta SET value=? WHERE key='scanLock' AND CAST(value AS INTEGER) < ?").bind(String(started+180000),started).run();
  if(!lock.meta.changes)return {busy:true,checked:0,drops:0};
  try{
    const settings=storeSettings(await meta("settings",'{}'));
    if(background&&!settings.auto)return {paused:true,checked:0,drops:0};
    const rows=await db.prepare("SELECT * FROM monitors WHERE enabled=1 AND kind='product' AND next_check_at<=? ORDER BY checked_at ASC LIMIT 12").bind(started).all<any>();
    let checked=0,dropCount=0;
    const blockedHosts=new Set<string>();
    for(const row of rows.results){
      const host=new URL(row.url).hostname;
      const retryAt=Number(await meta(`retailerBackoff:${host}`))||0;
      if(blockedHosts.has(host)||retryAt>started){
        await db.prepare("UPDATE monitors SET next_check_at=MAX(next_check_at,?) WHERE id=?").bind(retryAt,row.id).run();
        continue;
      }
      let result:Result;
      try{const response=await fetchRetail(row.url);result=response.status===200?parsePage(response.html,response.url,row.kind):{...blank(),status:"blocked",detail:`Händler begrenzt die Abfrage (HTTP ${response.status})`};}
      catch(err){result={...blank(),status:"error",detail:err instanceof Error?err.message:"Abfrage fehlgeschlagen"};}
      const now=Date.now(),blocked=["blocked","error"].includes(result.status);
      const next=now+(blocked?30*60*1000:Math.max(120,settings.interval)*1000);
      if(result.status==="blocked"){
        blockedHosts.add(host);
        await setMeta(`retailerBackoff:${host}`,String(next));
      }
      const transition=uvpTransition(result,row.last_stock,row);
      const notify=row.kind==="product" && transition.changes.length>0;
      // Version check makes each availability transition produce at most one event.
      const statements=[db.prepare("UPDATE monitors SET status=?,detail=?,price=?,image=COALESCE(?,image),seller=?,channel=?,location=?,checked_at=?,next_check_at=?,last_stock=?,branch_stock=?,version=version+1 WHERE id=? AND version=?").bind(result.status,result.detail,result.price,result.image,result.seller,result.channel,result.location,now,next,transition.value,JSON.stringify(result.branches),row.id,row.version)];
      if(notify){
        const locations=transition.changes.map(b=>b.label).join("; ");
        const prices=transition.changes.map(b=>b.price),price=prices.every(p=>p===prices[0])?prices[0]:null;
        const kind=transition.changes.every(b=>b.kind==="price")?"price":transition.changes.some(b=>b.kind==="restock")?"restock":"first";
        statements.push(db.prepare("INSERT OR IGNORE INTO drops (id,monitor_id,version,title,url,retailer,price,channel,location,kind,created_at,uvp_price,uvp_source,branch_stock) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),row.id,row.version+1,row.name,row.url,row.retailer,price,"store",locations,kind,now,row.uvp_price,row.uvp_source,JSON.stringify(transition.changes)));
      }
      const written=await db.batch(statements);
      if(!written[0].meta.changes)continue;
      checked++;if(notify && written[1].meta.changes)dropCount++;
    }
    if(checked)await setMeta("lastScan",String(Date.now()));
    const pending=await db.prepare("SELECT drops.*,monitors.branch_stock AS current_branches,monitors.uvp_price AS current_uvp_price,monitors.uvp_source AS current_uvp_source FROM drops JOIN monitors ON monitors.id=drops.monitor_id WHERE monitors.enabled=1 AND monitors.kind='product' AND drops.channel='store' AND drops.location IS NOT NULL AND drops.uvp_price IS NOT NULL AND drops.uvp_source IS NOT NULL AND drops.push_state='pending' AND drops.created_at>? ORDER BY drops.created_at LIMIT 8").bind(Date.now()-600000).all<any>();
    for(const drop of pending.results){
      const evidence=readBranches(drop.branch_stock);
      if(!evidence.length || evidence.some(b=>!hasBranchStock(b) || priceState(b.price,drop)!=="eligible"))continue;
      const current=readBranches(drop.current_branches),reference={uvp_price:drop.current_uvp_price,uvp_source:drop.current_uvp_source};
      const latest=evidence.map(b=>current.find(now=>now.key===b.key));
      if(latest.some(b=>!b || !hasBranchStock(b) || priceState(b.price,reference)!=="eligible"))continue;
      const prices=[...new Set(latest.map(b=>b!.price!.toFixed(2).replace(".",",")+" €"))].join(" / ");
      const {delivered,failed}=await sendPush({title:`${drop.retailer}: ${drop.kind==="price"?"Jetzt im UVP-Rahmen":drop.kind==="first"?"Filialbestand im UVP-Rahmen":"Wieder verfügbar im UVP-Rahmen"}`,body:`${drop.title} · ${prices} · ${drop.location} · ≤ hinterlegte UVP-Referenz; kein bestätigter Wareneingang`.slice(0,600),url:"/",tag:drop.id});
      if(delivered>0 || failed===0)await db.prepare("UPDATE drops SET push_state=? WHERE id=?").bind(delivered?"sent":"no-device",drop.id).run();
    }
    return {checked,drops:dropCount,busy:false};
  }finally{await db.prepare("UPDATE meta SET value='0' WHERE key='scanLock' AND value=?").bind(String(started+180000)).run();}
}
