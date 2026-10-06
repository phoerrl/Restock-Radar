import { berlinTime, branchKey, freshMinutes, openingState, type assessBranch, type Hours } from "./intelligence.ts";
import { normalizePlace, matchesStore } from "./place.ts";
import { priceState } from "./pricing.ts";
import { isSet } from "./product-set.ts";
import type { Monitor, Store } from "./types";

export type BranchEvidence=ReturnType<typeof assessBranch>;
export type MapStatus="uvp"|"fresh"|"announced"|"unknown"|"empty"|"closed";
export type MapBranch=Store & BranchEvidence & {
  id:string; status:MapStatus; statusLabel:string;
  offers:{monitor:Monitor;branch:Monitor["branches"][number]}[];
};
export const chainStyle:Record<string,{color:string;short:string}>={
  EDEKA:{color:"#174a9b",short:"E"}, GALERIA:{color:"#3f484a",short:"G"},
  Hugendubel:{color:"#cb3832",short:"H"}, Lidl:{color:"#1251a1",short:"L"},
  MediaMarkt:{color:"#d82331",short:"MM"}, Müller:{color:"#bb530c",short:"MÜ"},
  REWE:{color:"#bd2631",short:"R"}, Rossmann:{color:"#a22732",short:"RO"},
  "Smyths Toys":{color:"#376d28",short:"S"}, Thalia:{color:"#176349",short:"T"},
};
export function hasPosition<T extends Store>(store:T):store is T & {position:NonNullable<Store["position"]>} {
  const p=store.position;
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat>=51.23 && p.lat<=51.45 && p.lng>=12.13 && p.lng<=12.56;
}
export function mapBranch(store:Store,evidence:BranchEvidence|undefined,monitors:Monitor[],hours:Hours|undefined,now:number,interval:number):MapBranch {
  const opening=openingState(hours,now);
  const recent=(evidence?.recent||[]).filter(o=>o.observed_at<=now && now-o.observed_at<=freshMinutes*60000 && o.reviewed===1 && o.source!=="secondhand" && o.time_precision==="minute");
  const priced=recent.filter(o=>priceState(o.price,o)==="eligible");
  const offers=monitors.filter(m=>m.enabled && m.channel==="store" && m.status==="available" && m.retailer===store.retailer && isSet(m.name) && m.checked_at!==null && m.checked_at<=now && now-m.checked_at<Math.max(600000,interval*2000)).flatMap(m=>m.branches.filter(b=>b.status==="available" && b.quantity>0 && matchesStore(b.label,store.address)).map(branch=>({monitor:m,branch}))).filter(({monitor:m})=>!(evidence?.observations||[]).some(o=>o.reviewed===1 && o.kind==="empty" && o.time_precision==="minute" && o.observed_at<=now && o.observed_at>=m.checked_at! && normalizePlace(o.product)===normalizePlace(m.name)));
  const candidate=evidence?.announced;
  const announced=candidate && candidate.expected_at!==null && candidate.observed_at<=now && now-candidate.observed_at<=86400000 && candidate.expected_at>=now-30*60000 && berlinTime(candidate.expected_at).date===berlinTime(now).date?candidate:null;
  const uvp=priced.length>0 || offers.some(o=>priceState(o.branch.price,o.monitor)==="eligible");
  const negative=evidence?.observations.some(o=>o.kind==="empty" && o.time_precision==="minute" && o.reviewed===1 && o.observed_at<=now && now-o.observed_at<=freshMinutes*60000);
  const status:MapStatus=opening.state==="closed"?"closed":uvp?"uvp":recent.length||offers.length?"fresh":announced?"announced":negative?"empty":"unknown";
  const statusLabel={uvp:"Frischer Hinweis bis UVP-Referenz",fresh:"Frischer Hinweis · UVP nicht belegt",announced:"Lieferung für heute angekündigt",unknown:"Bestand nicht belegt",empty:"Zuletzt nicht gefunden",closed:"Geschlossen"}[status];
  return {...store,id:branchKey(store.retailer,store.address),priority:evidence?.priority||0,label:evidence?.label||"Bestand offen",reason:evidence?.reason||"Keine aktuelle filialgenaue Bestandsmeldung.",observations:evidence?.observations||[],windows:evidence?.windows||[],visits:evidence?.visits||0,found:evidence?.found||0,opening,recent,priced,announced,offers,status,statusLabel};
}
export type MapFilters={retailer:string;query:string;mode:"all"|"fresh"|"uvp"|"saved";onlyOpen:boolean;saved:string[]};
export function filterMapBranches(branches:MapBranch[],filter:MapFilters) {
  const q=normalizePlace(filter.query);
  return branches.filter(b=>(filter.retailer==="all"||b.retailer===filter.retailer) && (!q||normalizePlace(`${b.retailer} ${b.name} ${b.address}`).includes(q)) && (!filter.onlyOpen||b.opening.state==="open") && (filter.mode==="all" || filter.mode==="fresh" && ["uvp","fresh"].includes(b.status) || filter.mode==="uvp" && b.status==="uvp" || filter.mode==="saved" && filter.saved.includes(b.id)));
}
export function readSavedStops(raw:string|null,allowed:string[]) {
  try {const data:unknown=JSON.parse(raw||"[]");return Array.isArray(data)?[...new Set(data.filter((id):id is string=>typeof id==="string"&&allowed.includes(id)))].slice(0,30):[];}catch{return [];}
}
