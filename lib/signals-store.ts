import { database, meta, setMeta, sendPush, storeSettings } from "./radar.ts";
import { stores, retailers } from "./catalog.ts";
import { assessBranch, branchKey, freshMinutes, type Observation } from "./intelligence.ts";
import { knownHours, initialObservations, researchNotes } from "./research.ts";
import { publicFeeds, fetchCommunityFeed, sourceUrl, type CommunityPost } from "./community.ts";
import { validateReference } from "./pricing.ts";
import { isSet } from "./product-set.ts";
import { env } from "cloudflare:workers";
import { discordChannels, fetchDiscordMessages, DiscordReadError } from "./discord.ts";

export type ReportInput=Omit<Observation,"id"|"created_at"|"reviewed"|"push_state">;
const columns="id,retailer,address,product,kind,source,observed_at,created_at,expected_at,time_precision,source_url,note,price,uvp_price,uvp_source,reviewed,push_state";
function insert(o:Observation){return database().prepare(`INSERT OR IGNORE INTO observations (${columns}) VALUES (${columns.split(",").map(()=>"?").join(",")})`).bind(...columns.split(",").map(key=>o[key as keyof Observation]));}
export async function seedSignals(){
  if(!await meta("signalsSeededV1"))await database().batch([
    ...initialObservations.map(o=>insert({...o,created_at:Date.now()})),
    ...publicFeeds.map(f=>database().prepare("INSERT OR IGNORE INTO community_sources (id,name,url) VALUES (?,?,?)").bind(f.id,f.name,f.url)),
    database().prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('signalsSeededV1','1')"),
  ]);
  if(!await meta("publicSources20261008"))await database().batch([
    ...publicFeeds.map(f=>database().prepare("INSERT OR IGNORE INTO community_sources (id,name,url) VALUES (?,?,?)").bind(f.id,f.name,f.url)),
    database().prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('publicSources20261008','1')"),
  ]);
}
export async function discordSnapshot(){
  const vars=env as unknown as Record<string,string|undefined>,channels=discordChannels(vars);
  const states=await Promise.all(channels.map(async c=>{
    try{return JSON.parse(await meta(`discordState:${c.channelId}`,"{}")) as {status?:string;checked_at?:number;detail?:string};}catch{return {};}
  }));
  const now=Date.now(),readable=states.filter(s=>s.status==="readable"&&typeof s.checked_at==="number"&&s.checked_at<=now&&now-s.checked_at<600000).length;
  return {configured:channels.length>0,total:channels.length,readable,checked_at:Math.max(0,...states.map(s=>s.checked_at||0))||null,detail:!channels.length?"Noch kein freigegebener Bot-/Kanalzugang eingerichtet.":readable<channels.length?"Mindestens ein Kanal noch ungeprüft, nicht lesbar oder seit über 10 Minuten ohne erfolgreichen Abruf.":"Freigegebene Kanäle frisch gelesen; Filialhinweise bleiben Prüfkandidaten."};
}
export async function signalsSnapshot(){
  await seedSignals();const now=Date.now();
  const observations=(await database().prepare("SELECT * FROM observations ORDER BY observed_at DESC,created_at DESC LIMIT 2000").all<Observation>()).results;
  const directory=new Map(stores.map(s=>[branchKey(s.retailer,s.address),s]));
  for(const o of observations)if(o.reviewed===1&&o.address){
    const key=branchKey(o.retailer,o.address);
    if(!directory.has(key))directory.set(key,{retailer:o.retailer,name:o.address.split(",")[0],address:o.address,url:retailers.find(r=>r.name===o.retailer)!.locator});
  }
  const branches=[...directory.values()].map(store=>({...store,...assessBranch(store.retailer,store.address,observations,knownHours.find(h=>branchKey(h.retailer,h.address)===branchKey(store.retailer,store.address)),now)})).sort((a,b)=>b.priority-a.priority||b.observations.length-a.observations.length||a.retailer.localeCompare(b.retailer,"de"));
  const posts=(await database().prepare("SELECT * FROM community_posts WHERE published_at>? ORDER BY published_at DESC LIMIT 30").bind(now-7*86400000).all<Omit<CommunityPost,"retailers"> & {retailers:string}>()).results.map(p=>({...p,retailers:JSON.parse(p.retailers) as string[]}));
  return {now,branches,observations:observations.slice(0,200),unassigned:observations.filter(o=>!o.address&&o.reviewed===1),candidates:observations.filter(o=>!o.reviewed).slice(0,100),posts,sources:(await database().prepare("SELECT * FROM community_sources ORDER BY name").all()).results,discord:await discordSnapshot(),hours:knownHours,research:researchNotes,retailers};
}
export function validateReport(input:ReportInput,now=Date.now()):ReportInput {
  if(!retailers.some(r=>r.name===input.retailer))throw new Error("Händler ist nicht im Radar.");
  if(!isSet(input.product))throw new Error("Bitte einen Pokémon-Kartenartikel aus dem Set 30 Jahre angeben.");
  if(input.observed_at>now+60000||input.observed_at<now-365*86400000)throw new Error("Beobachtung muss innerhalb des letzten Jahres liegen, nicht in der Zukunft.");
  if(input.address&&!stores.some(s=>s.retailer===input.retailer&&s.address===input.address)&&!(input.retailer==="Smyths Toys"?/\b\d{5}\s+\S/.test(input.address):/\b04[123]\d{2}\s+Leipzig\b/i.test(input.address)))throw new Error("Bitte die genaue Filialadresse mit Postleitzahl angeben (Leipzig; Smyths auch außerhalb).");
  if(input.source==="community"&&!input.source_url)throw new Error("Community-Meldungen brauchen einen öffentlichen Beleglink.");
  if(input.expected_at!==null&&(input.kind!=="announced"||input.source!=="staff"||input.expected_at<input.observed_at||input.expected_at>now+30*86400000))throw new Error("Ankündigungen brauchen eine künftige Mitarbeiterauskunft innerhalb von 30 Tagen.");
  if(input.kind==="announced"&&(input.source!=="staff"||input.expected_at===null))throw new Error("Bitte den angekündigten Termin und Mitarbeiterauskunft angeben.");
  return {...input,source_url:input.source_url?sourceUrl(input.source_url):null,...validateReference(input.uvp_price,input.uvp_source)};
}
export async function saveReport(input:ReportInput,id?:string){
  await seedSignals();const data=validateReport(input),now=Date.now();
  if(id){
    const old=await database().prepare("SELECT * FROM observations WHERE id=?").bind(id).first<Observation>();
    if(!old)throw new Error("Meldung nicht gefunden.");
    const keys=Object.keys(data) as (keyof ReportInput)[];
    await database().prepare(`UPDATE observations SET ${keys.map(k=>`${k}=?`).join(",")},reviewed=1,push_state=? WHERE id=?`).bind(...keys.map(k=>data[k]),old.push_state==="sent"?"sent":"pending",id).run();
  }else{await insert({...data,id:crypto.randomUUID(),created_at:now,reviewed:1,push_state:"pending"}).run();}
  await notifySignals();
}
export async function dismissCandidate(id:string){await database().prepare("UPDATE observations SET reviewed=2,push_state='dismissed' WHERE id=? AND reviewed=0").bind(id).run();}
export async function notifySignals(){
  const devices=await database().prepare("SELECT COUNT(*) AS n FROM devices").first<{n:number}>();
  if(devices?.n)await database().prepare("UPDATE observations SET push_state='pending' WHERE push_state='no-device' AND observed_at>=?").bind(Date.now()-freshMinutes*60000).run();
  await database().prepare("UPDATE observations SET push_state='pending' WHERE push_state LIKE 'sending:%' AND CAST(SUBSTR(push_state,9) AS INTEGER)<?").bind(Date.now()-120000).run();
  const state=await signalsSnapshot(),fresh=state.branches.flatMap(b=>b.opening.state==="closed"?[]:b.priced);
  for(const o of fresh.filter(o=>o.push_state==="pending")){
    const locked=await database().prepare("UPDATE observations SET push_state=? WHERE id=? AND push_state='pending'").bind(`sending:${Date.now()}`,o.id).run();
    if(!locked.meta.changes)continue;
    try{
      const result=await sendPush({title:`${o.retailer}: frischer Fundhinweis`,body:`${o.product} · ${o.price!.toFixed(2).replace(".",",")} EUR · ${o.address} · Quelle: ${o.source==="personal"?"eigener Fund":o.source==="staff"?"Mitarbeiterauskunft":"Community"}. Keine Bestandszusage.`,url:"/",tag:o.id});
      await database().prepare("UPDATE observations SET push_state=? WHERE id=?").bind(result.delivered?"sent":result.failed?"pending":"no-device",o.id).run();
    }catch{await database().prepare("UPDATE observations SET push_state='pending' WHERE id=?").bind(o.id).run();}
  }
  await database().prepare("UPDATE observations SET push_state='expired' WHERE push_state='pending' AND observed_at<?").bind(state.now-freshMinutes*60000).run();
}
export async function refreshCommunity(background=false){
  await seedSignals();
  if(background&&!storeSettings(await meta("settings","{}")).auto)return {paused:true,checked:0,imported:0};
  const now=Date.now(),db=database(),due=await db.prepare("SELECT * FROM community_sources WHERE next_check_at<=? ORDER BY checked_at LIMIT 4").bind(now).all<{id:string;url:string}>();
  let checked=0,imported=0;
  for(const f of due.results){
    const lock=await db.prepare("UPDATE community_sources SET next_check_at=? WHERE id=? AND next_check_at<=?").bind(now+180000,f.id,now).run();if(!lock.meta.changes)continue;
    try{
      const {candidates,posts,entries,newest}=await fetchCommunityFeed(f.url,now);
      const writes=candidates.length?await db.batch(candidates.map(o=>insert({...o,created_at:now}))):[];
      imported+=writes.reduce((n,r)=>n+r.meta.changes,0);
      if(posts.length)await db.batch(posts.map(p=>db.prepare("INSERT INTO community_posts (id,title,excerpt,url,published_at,fetched_at,retailers) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,fetched_at=excluded.fetched_at,retailers=excluded.retailers").bind(p.id,p.title,p.excerpt,p.url,p.published_at,p.fetched_at,JSON.stringify(p.retailers))));
      const stamp=newest?` Neueste Feed-Zeit: ${new Date(newest).toLocaleString("de-DE",{timeZone:"Europe/Berlin"})}.`:" Datum im Feed nicht lesbar.";
      await db.prepare("UPDATE community_sources SET status='readable',detail=?,checked_at=?,next_check_at=? WHERE id=?").bind(`${entries} Feed-Einträge gelesen · ${posts.length} passende Vor-Ort-Beiträge · ${candidates.length} Leipzig-Prüfkandidaten.${stamp} Keine Bestandsbestätigung.`,Date.now(),Date.now()+5*60000,f.id).run();
    }catch(error){await db.prepare("UPDATE community_sources SET status='blocked',detail=?,checked_at=?,next_check_at=? WHERE id=?").bind((error instanceof Error?error.message:"Abruf fehlgeschlagen")+" Keine Live-Meldungen aus dieser Quelle.",Date.now(),Date.now()+30*60000,f.id).run();}
    checked++;
  }
  if(background)await setMeta("communitySchedulerAt",String(Date.now()));
  const discord=await refreshDiscord();
  await notifySignals();return {checked:checked+discord.checked,imported:imported+discord.imported};
}
export async function refreshDiscord(){
  const vars=env as unknown as Record<string,string|undefined>,channels=discordChannels(vars),db=database();
  let checked=0,imported=0;
  for(const channel of channels){
    const now=Date.now(),lease=`discordLease:${channel.channelId}`,stateKey=`discordState:${channel.channelId}`;
    await db.prepare("INSERT OR IGNORE INTO meta (key,value) VALUES (?, '0')").bind(lease).run();
    const lock=await db.prepare("UPDATE meta SET value=? WHERE key=? AND CAST(value AS INTEGER)<=?").bind(String(now+180000),lease,now).run();
    if(!lock.meta.changes)continue;
    let next=now+120000;
    try{
      const result=await fetchDiscordMessages(channel,vars.DISCORD_BOT_TOKEN!,now);
      const writes=result.candidates.length?await db.batch(result.candidates.map(o=>insert({...o,created_at:now}))):[];
      imported+=writes.reduce((n,r)=>n+r.meta.changes,0);
      await setMeta(stateKey,JSON.stringify({status:result.readable?"readable":"limited",checked_at:Date.now(),detail:result.readable?`${result.entries} Nachrichten gelesen; ${result.candidates.length} passende Prüfkandidaten.${result.saturated?" Nur die jüngsten 100 Nachrichten erfasst.":""}`:"Keine lesbaren Textinhalte; MESSAGE_CONTENT und Kanalrechte prüfen."}));
    }catch(error){
      next=Date.now()+(error instanceof DiscordReadError?error.retrySeconds:1800)*1000;
      await setMeta(stateKey,JSON.stringify({status:"blocked",checked_at:Date.now(),detail:error instanceof DiscordReadError?error.message:"Discord-Abruf fehlgeschlagen."}));
    }finally{
      await db.prepare("UPDATE meta SET value=? WHERE key=? AND value=?").bind(String(next),lease,String(now+180000)).run();
    }
    checked++;
  }
  return {checked,imported};
}
