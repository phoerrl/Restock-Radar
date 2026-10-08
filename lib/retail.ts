import { load } from "cheerio";
import { normalizePlace } from "./place.ts";
import { euroPrice } from "./pricing.ts";
import { isSet } from "./product-set.ts";
import { hasBranchStock } from "./branch-stock.ts";
export { isSet } from "./product-set.ts";

export const hosts: Record<string,string> = {
  "smythstoys.com":"Smyths Toys", "www.smythstoys.com":"Smyths Toys", "thalia.de":"Thalia", "www.thalia.de":"Thalia",
  "hugendubel.de":"Hugendubel", "www.hugendubel.de":"Hugendubel", "mediamarkt.de":"MediaMarkt", "www.mediamarkt.de":"MediaMarkt",
  "saturn.de":"Saturn", "www.saturn.de":"Saturn", "mueller.de":"Müller", "www.mueller.de":"Müller",
  "galeria.de":"GALERIA", "www.galeria.de":"GALERIA", "rossmann.de":"Rossmann", "www.rossmann.de":"Rossmann",
  "edeka.de":"EDEKA", "www.edeka.de":"EDEKA", "rewe.de":"REWE", "www.rewe.de":"REWE", "lidl.de":"Lidl", "www.lidl.de":"Lidl",
  "vedes.com":"VEDES", "www.vedes.com":"VEDES",
};
export function retailUrl(value: string) {
  const url = new URL(value);
  if(url.protocol !== "https:" || !hosts[url.hostname] || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Bitte eine HTTPS-Datenquelle eines der gelisteten Händler verwenden.");
  url.hash = "";
  return url;
}
type Json = Record<string, any>;
export type BranchStock = { key:string; label:string; name:string; address:string; status:"available"|"unavailable"|"preorder"; quantity:number|null; price:number|null };
export type Result = { status:string; detail:string; price:number|null; image:string|null; seller:string|null; channel:string; location:string|null; branches:BranchStock[]; products:{name:string;url:string}[] };
export const blank = (): Result => ({status:"unknown",detail:"Keine belegten Bestandsdaten für eine Filiale",price:null,image:null,seller:null,channel:"unknown",location:null,branches:[],products:[]});
function records(value:any, out:Json[] = []):Json[] {
  if (Array.isArray(value)) value.forEach(v=>records(v,out));
  else if(value && typeof value === "object") { if(value["@type"]) out.push(value); Object.values(value).forEach(v=>records(v,out)); }
  return out;
}
function schemaType(v:Json, type:string) { return [v["@type"]].flat().some(t=>String(t).split("/").pop() === type); }
function samePage(a:string,b:string) { try {return new URL(a,b).pathname === new URL(b).pathname;} catch {return false;} }
export function parsePage(html:string, url:string, kind:string):Result {
  const result=blank(), $=load(html);
  const title=$("title").text();
  if(/sicherheits.check|access denied|just a moment|captcha|request unsuccessful/i.test(title + " " + $("body").text().slice(0,1000)) || /_Incapsula_Resource|cf-chl-|geo\.captcha-delivery\.com|akamai.*challenge/i.test(html)) return {...result,status:"blocked",detail:"Händler blockiert die automatische Abfrage"};
  const all:Json[]=[];
  $("script[type='application/ld+json']").each((_,el)=>{try {records(JSON.parse($(el).text()),all);}catch{ /* A malformed block must never imply stock. */ }});
  if(kind === "discovery") {
    const found = new Map<string,string>();
    $("a[href]").each((_,el)=>{
      const a=$(el), name=(a.text()+" "+(a.attr("title")||"")+" "+a.find("img").map((_,i)=>$(i).attr("alt")||"").get().join(" ")).replace(/\s+/g," ").trim();
      if(!isSet(name)) return;
      try {const u=retailUrl(new URL(a.attr("href")!,url).href); if(u.hostname.replace(/^www\./,"")!==new URL(url).hostname.replace(/^www\./,"")) return;
        if(!/\/p\/\d+|artikeldetails\/|produkt-details|\/product\/|\/p\//.test(u.pathname)) return;
        u.search=""; found.set(u.href,name.slice(0,180));
      }catch{}
    });
    for(const p of all.filter(p=>schemaType(p,"Product") && isSet(p.name||""))) {try {const u=retailUrl(new URL(p.url,url).href); if(u.hostname===new URL(url).hostname)found.set(u.href,p.name);}catch{}}
    result.products=[...found].slice(0,20).map(([url,name])=>({url,name}));
    result.status="discovery";result.detail=`${result.products.length} passende Produkte gefunden`;
    return result;
  }
  const h1=$("h1").first().text().trim();
  const products=all.filter(p=>schemaType(p,"Product") && isSet(p.name||""));
  const matching=products.filter(p=>p.url ? samePage(p.url,url) : h1 && (p.name===h1 || h1.includes(p.name)));
  // Related products and descriptions are never evidence for the watched item.
  const product=matching[0];
  if(!product || (h1 && !isSet(h1))) return {...result,detail:isSet(h1)?"Produkt erkannt; Bestandsdaten werden erst im Browser geladen":"Kein eindeutig zugeordnetes Produkt aus 30 Jahre"};
  const image=[product.image].flat()[0];
  try {const u=new URL(typeof image==="string"?image:image?.url,url);if(u.protocol==="https:")result.image=u.href;}catch{}
  const offers=[product.offers].flat().filter(Boolean).flatMap(o=>o.offers?[o.offers].flat():[o]);
  const valid=offers.filter(o=>o.availability && (!o.url || samePage(o.url,url)));
  if(!valid.length) return {...result,detail:"Produkt erkannt; keine eindeutige Angebotsverfügbarkeit"};
  const retailer=hosts[new URL(url).hostname];
  const branches=new Map<string,BranchStock>(), conflicts=new Set<string>();
  for(const offer of valid) {
    const condition=offer.itemCondition||product.itemCondition;
    if(condition && !/^https?:\/\/schema\.org\/NewCondition$/.test(condition))continue;
    const place=offer.availableAtOrFrom, address=place?.address;
    if(!place?.name || !address?.streetAddress || !address?.addressLocality || !/^\d{5}$/.test(String(address?.postalCode||"")))continue;
    if(!["Store","BookStore","ElectronicsStore","ToyStore","HobbyShop","DepartmentStore","DrugStore","GroceryStore"].some(t=>schemaType(place,t)))continue;
    const country=typeof address.addressCountry==="string"?address.addressCountry:address.addressCountry?.name;
    if(country && !/^(DE|Deutschland|Germany)$/i.test(country))continue;
    if(retailer!=="Smyths Toys" && normalizePlace(address.addressLocality)!=="leipzig")continue;
    const seller=typeof offer.seller==="string"?offer.seller:offer.seller?.name;
    if(seller && !normalizePlace(seller).includes(normalizePlace(retailer)))continue;
    if(["MediaMarkt","Saturn"].includes(retailer) && !seller)continue;
    // The offer must identify a physical shop; pickup alone remains insufficient.
    const raw=offer.inventoryLevel?.value;
    const hasQuantity=Object.hasOwn(offer,"inventoryLevel");
    if(hasQuantity && (!["number","string"].includes(typeof raw) || String(raw).trim()==="" || !Number.isInteger(Number(raw)) || Number(raw)<0))continue;
    if([offer.description,offer.deliveryLeadTime?.minValue,offer.deliveryLeadTime?.value].some(v=>typeof v==="string" && /versand|lieferung.*filiale|ship.*store|bestellbar|ab\s+morgen/i.test(v)))continue;
    if(Number(offer.deliveryLeadTime?.minValue||offer.deliveryLeadTime?.value||0)>0)continue;
    const quantity=hasQuantity?Number(raw):null, label=`${place.name}, ${address.streetAddress}, ${address.postalCode} ${address.addressLocality}`;
    const key=normalizePlace(`${address.streetAddress} ${address.postalCode} ${address.addressLocality}`);
    const status=/\/(PreOrder|BackOrder)$/.test(offer.availability)?"preorder":(quantity===null||quantity>0) && /\/(InStock|LimitedAvailability)$/.test(offer.availability)?"available":(quantity===null||quantity===0) && /\/(OutOfStock|SoldOut|Discontinued)$/.test(offer.availability)?"unavailable":null;
    if(!status){conflicts.add(key);continue;}
    const price=offer.priceCurrency==="EUR"?euroPrice(offer.price):null;
    const prior=branches.get(key);
    if(prior && (prior.status!==status || prior.quantity!==quantity || prior.price!==price))conflicts.add(key);
    branches.set(key,{key,label,name:place.name,address:`${address.streetAddress}, ${address.postalCode} ${address.addressLocality}`,status,quantity,price});
  }
  result.branches=[...branches.values()].filter(b=>!conflicts.has(b.key)).sort((a,b)=>a.key.localeCompare(b.key));
  if(!result.branches.length)return {...result,detail:conflicts.size?"Widersprüchliche Filialdaten; kein Drop bestätigt":"Keine filialgenaue Verfügbarkeit belegt; Bestell- und Abholoptionen werden nicht gewertet"};
  result.channel="store";
  const available=result.branches.filter(b=>b.status==="available");
  result.location=available.map(b=>b.label).join("; ")||null;
  result.status=available.length?"available":result.branches.some(b=>b.status==="preorder")?"preorder":"unavailable";
  result.detail=available.length?`Bestand für ${available.length} Filiale${available.length>1?"n":""} gemeldet${available.some(b=>b.quantity===null)?"; Stückzahl offen":""}; Wareneingang nicht belegt`:result.status==="preorder"?"Nachlieferung angekündigt; keine sofort verfügbare Ware":"In den gemeldeten Filialen nicht vorrätig";
  return result;
}
export function stockTransition(result:Result, previous:string|null) {
  let before:Record<string,string>={};
  try{const saved=JSON.parse(previous||"null");if(saved?.scope==="store-v1" && saved.stocks && typeof saved.stocks==="object")before=saved.stocks;}catch{}
  const stocks={...before};
  const observed=result.channel==="store"?result.branches:[];
  const changes=observed.filter(b=>b.status==="available" && before[b.key]!=="available").map(b=>({...b,kind:before[b.key]?"restock":"first"}));
  for(const b of observed)stocks[b.key]=b.status;
  // Missing, blocked or partial responses do not mean that a previously seen store sold out.
  return {newStock:changes.length>0,changes,value:observed.length?JSON.stringify({scope:"store-v1",stocks}):previous};
}
export function canNotify(result:Result) {return result.channel==="store" && result.status==="available" && result.branches.some(hasBranchStock);}
export async function fetchRetail(value:string) {
  let url=retailUrl(value);
  const retailer=hosts[url.hostname];
  for(let i=0;i<4;i++) {
    const res=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(15000),headers:{"User-Agent":"DropRadar/1.0 (personal availability monitor)","Accept":"text/html,application/xhtml+xml","Accept-Language":"de-DE,de;q=0.9"}});
    if(res.status>=300 && res.status<400 && res.headers.get("location")){url=retailUrl(new URL(res.headers.get("location")!,url).href);if(hosts[url.hostname]!==retailer)throw new Error("Weiterleitung zu einem anderen Händler; Produktbezug ungeklärt");continue;}
    if([401,403,429].includes(res.status))return {html:"",url:url.href,status:res.status};
    if(!res.ok)throw new Error(`Händler antwortet mit HTTP ${res.status}`);
    if(!res.headers.get("content-type")?.includes("text/html"))throw new Error("Keine auswertbare Produktseite");
    const reader=res.body?.getReader();if(!reader)throw new Error("Leere Händlerantwort");
    const decoder=new TextDecoder();let html="",size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_500_000){await reader.cancel();throw new Error("Produktseite zu groß");}html+=decoder.decode(value,{stream:true});}
    html+=decoder.decode();return {html,url:url.href,status:res.status};
  }
  throw new Error("Zu viele Weiterleitungen");
}
