import { normalizePlace } from "./place.ts";
import { priceState } from "./pricing.ts";
import { isSet } from "./product-set.ts";

export const freshMinutes = 20;
export type Observation = {
  id:string; retailer:string; address:string|null; product:string;
  kind:"seen"|"restock"|"empty"|"announced";
  source:"personal"|"staff"|"community"|"secondhand";
  observed_at:number; created_at:number; expected_at:number|null;
  time_precision:"minute"|"day";
  source_url:string|null; note:string; price:number|null;
  uvp_price:number|null; uvp_source:string|null; reviewed:number; push_state:string;
};
export type Hours = {address:string;retailer:string;weekly:Record<string,[number,number][]>;exceptions:Record<string,[number,number][]>;source_url:string;checked_at:number};
export function branchKey(retailer:string,address:string) {return `${normalizePlace(retailer)}:${normalizePlace(address)}`;}
const berlinFormatter=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export function berlinTime(timestamp:number) {
  const parts=berlinFormatter.formatToParts(timestamp);
  const part=(key:string)=>parts.find(p=>p.type===key)?.value||"";
  return {date:`${part("year")}-${part("month")}-${part("day")}`,day:part("weekday"),minute:Number(part("hour"))*60+Number(part("minute"))};
}
export function openingState(hours:Hours|undefined,now:number) {
  if(!hours || now-hours.checked_at>30*86400000)return {state:"unknown" as const,label:"Öffnungszeiten offen",ranges:[] as [number,number][]};
  const local=berlinTime(now),ranges=hours.exceptions[local.date]??hours.weekly[local.day];
  if(!ranges)return {state:"unknown" as const,label:"Öffnungszeiten offen",ranges:[] as [number,number][]};
  const clock=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`;
  const open=ranges.find(([start,end])=>local.minute>=start&&local.minute<end);
  const next=ranges.find(([start])=>local.minute<start);
  return {state:open?"open" as const:"closed" as const,label:open?`Geöffnet bis ${clock(open[1])}`:next?`Öffnet heute ${clock(next[0])}`:"Heute geschlossen",ranges};
}
const productKey=(name:string)=>normalizePlace(name).replace(/booster\s+bundle/g,"boosterbundle");
export function assessBranch(retailer:string,address:string,all:Observation[],hours:Hours|undefined,now:number) {
  const opening=openingState(hours,now),local=berlinTime(now);
  const dates=new Map<number,ReturnType<typeof berlinTime>>();
  const localTime=(n:number)=>{if(!dates.has(n))dates.set(n,berlinTime(n));return dates.get(n)!;};
  const observations=all.filter(o=>o.reviewed===1&&isSet(o.product)&&o.address&&branchKey(o.retailer,o.address)===branchKey(retailer,address)&&o.observed_at<=now).sort((a,b)=>b.observed_at-a.observed_at||b.created_at-a.created_at);
  // An empty report suppresses older sightings of that product, never a different SKU.
  const latest=new Map<string,Observation>();
  for(const o of observations)if(o.time_precision==="minute"&&!latest.has(productKey(o.product)))latest.set(productKey(o.product),o);
  const recent=[...latest.values()].filter(o=>["seen","restock"].includes(o.kind)&&o.time_precision==="minute"&&o.source!=="secondhand"&&now-o.observed_at<=freshMinutes*60000);
  const priced=recent.filter(o=>priceState(o.price,o)==="eligible");
  const checks=observations.filter(o=>o.source==="personal"&&["seen","restock","empty"].includes(o.kind)&&now-o.observed_at<=60*86400000);
  const byDate=new Map<string,Observation>();
  for(const o of checks)if(!byDate.has(localTime(o.observed_at).date))byDate.set(localTime(o.observed_at).date,o);
  const visits=[...byDate.values()],found=visits.filter(o=>o.kind!=="empty");
  const restocks=observations.filter(o=>o.kind==="restock"&&o.source==="personal"&&o.time_precision==="minute"&&now-o.observed_at<=60*86400000);
  const windows=[] as {start:number;end:number;days:number;dates:string[]}[];
  for(let start=0;start<1440;start+=120){
    const matching=restocks.filter(o=>{const t=localTime(o.observed_at);return t.day===local.day&&t.minute>=start&&t.minute<start+120;});
    const unique=[...new Map(matching.map(o=>[localTime(o.observed_at).date,o])).values()];
    if(unique.length<3)continue;
    const intersect=opening.state==="unknown"?[start,start+120]:opening.ranges.flatMap(([open,close])=>Math.max(open,start)<Math.min(close,start+120)?[Math.max(open,start),Math.min(close,start+120)]:[]).slice(0,2);
    if(intersect.length===2)windows.push({start:intersect[0],end:intersect[1],days:unique.length,dates:unique.map(o=>localTime(o.observed_at).date)});
  }
  const timed=windows.some(w=>local.minute>=w.start-30&&local.minute<w.end);
  const announced=observations.find(o=>o.kind==="announced"&&o.source==="staff"&&o.expected_at&&berlinTime(o.expected_at).date===local.date&&now-o.observed_at<=86400000&&o.expected_at>=now-30*60000);
  const empty=[...latest.values()].find(o=>o.kind==="empty"&&o.time_precision==="minute"&&now-o.observed_at<=freshMinutes*60000);
  let priority=0,label="Kein aktueller Hinweis",reason="Kein filialgenauer Fund aus den letzten 20 Minuten.";
  if(empty){priority=-1;label="Zuletzt leer gemeldet";reason=`${empty.product}: nach jüngster Kontrolle nicht gefunden.`;}
  if(timed){priority=1;label="Wiederholtes Verräumfenster";reason="Mindestens drei eigene Verräum-Beobachtungen an verschiedenen Tagen über mindestens zwei Wochen. Keine Lieferzusage.";}
  if(announced){priority=2;label="Heute angekündigt";reason="Von dir protokollierte Mitarbeiterauskunft. Termin kann sich verschieben.";}
  if(recent.length){priority=3;label="Frischer Fundhinweis";reason="Filialgenauer Bericht, höchstens 20 Minuten alt. Preis oder UVP noch offen.";}
  if(priced.length){priority=4;label="Frischer Fund im UVP-Rahmen";reason="Gemeldeter Filialpreis liegt innerhalb der hinterlegten Referenz. Keine Bestands- oder Reservierungsgarantie.";}
  if(opening.state==="closed"){priority=Math.min(priority,0);reason=`${opening.label}. ${reason}`;}
  return {priority,label,reason,opening,observations:observations.slice(0,8),recent,priced,announced:announced??null,windows,visits:visits.length,found:found.length};
}
