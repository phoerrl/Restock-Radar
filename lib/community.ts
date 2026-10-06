import { load } from "cheerio";
import { stores } from "./catalog.ts";
import { normalizePlace } from "./place.ts";
import type { Observation } from "./intelligence.ts";
export type CommunityPost={id:string;title:string;excerpt:string;url:string;published_at:number;fetched_at:number;retailers:string[]};
const targetSet=(text:string)=>/30(?:jahre|th|anniversary)/.test(text);

export const publicFeeds=[
  {id:"reddit-pokemon-posts",name:"Reddit · PokémonTCG_DE · Beiträge",url:"https://www.reddit.com/r/PokemonTCG_DE/new/.rss?limit=50"},
  {id:"reddit-pokemon-comments",name:"Reddit · PokémonTCG_DE · Kommentare",url:"https://www.reddit.com/r/PokemonTCG_DE/comments/.rss?limit=50"},
  {id:"reddit-leipzig",name:"Reddit · Leipzig",url:"https://www.reddit.com/r/Leipzig/new/.rss?limit=50"},
];
export function sourceUrl(value:string) {
  const u=new URL(value);
  if(u.protocol!=="https:"||u.username||u.password||u.port)throw new Error("Beleg muss eine normale HTTPS-Adresse sein.");
  if(u.hostname==="localhost"||!u.hostname.includes(".")||/^\d+(\.\d+){3}$/.test(u.hostname)||u.hostname.startsWith("["))throw new Error("Öffentliche Belegadresse erforderlich.");
  return u.href;
}
export function parseCommunityFeed(xml:string,now:number):Omit<Observation,"created_at">[] {
  if(xml.length>750000 || /client challenge|blocked by network security|just a moment|verify you are human/i.test(xml))throw new Error("Quelle verlangt eine Browser-/Sicherheitsprüfung.");
  const $=load(xml,{xml:true});
  if($("feed").length!==1)throw new Error("Kein lesbarer öffentlicher RSS-/Atom-Feed.");
  const out:Omit<Observation,"created_at">[]=[];
  $("entry").slice(0,100).each((_,entry)=>{
    const item=$(entry),published=Date.parse(item.find("published").text()||item.find("updated").text());
    if(!Number.isFinite(published)||published>now||now-published>7*86400000)return;
    const title=item.find("title").text(),body=load(item.find("content").text()).text().replace(/\s+/g," ").trim(),text=`${title} ${body}`,normal=normalizePlace(text);
    if(!targetSet(normal)||!/(leipzig|paunsdorf|gunthersdorf|guenthersdorf)/.test(normal))return;
    const url=item.find("link").attr("href");if(!url)return;
    let u:URL;try{u=new URL(sourceUrl(url));}catch{return;}
    if(u.hostname!=="www.reddit.com"||!u.pathname.includes("/comments/"))return;
    const mentioned=[...new Set(stores.map(s=>s.retailer))].filter(r=>normal.includes(normalizePlace(r)) || (r==="Smyths Toys"&&normal.includes("smyths")));
    for(const retailer of mentioned){
      const exact=stores.filter(s=>s.retailer===retailer&&normal.includes(normalizePlace(s.name)));
      const address=exact.length===1?exact[0].address:null;
      const kind=/ausverkauft|keineware|nichtsbekommen|leer(?:es|e)?regal/.test(normal)?"empty":/verraum|einsortiert|nachgelegt|restock/.test(normal)?"restock":"seen";
      // Publication time is not an eyewitness timestamp. Candidates always need review.
      out.push({id:`community:${u.href}:${retailer}`,retailer,address,product:"Pokémon 30 Jahre · Artikel zu prüfen",kind,source:"community",time_precision:"day",observed_at:published,expected_at:null,source_url:u.href,note:`Ungeprüfter Beitrag (${new Date(published).toISOString().slice(0,10)}): ${text.slice(0,480)}`,price:null,uvp_price:null,uvp_source:null,reviewed:0,push_state:"unreviewed"});
    }
  });
  return out;
}
export function parseCommunityPosts(xml:string,now:number):CommunityPost[] {
  const $=load(xml,{xml:true}),posts:CommunityPost[]=[];
  $("entry").slice(0,100).each((_,entry)=>{
    const item=$(entry),published=Date.parse(item.find("published").text()||item.find("updated").text());
    if(!Number.isFinite(published)||published>now||now-published>7*86400000)return;
    const title=item.find("title").text(),body=load(item.find("content").text()).text().replace(/\s+/g," ").trim(),normal=normalizePlace(`${title} ${body}`);
    if(!targetSet(normal)||!/filial|regal|vorort|instore|laden|laeden|mitarbeiter|verraum|einsortiert/.test(normal))return;
    const mentioned=[...new Set(stores.map(s=>s.retailer))].filter(r=>normal.includes(normalizePlace(r)) || (r==="Smyths Toys"&&normal.includes("smyths")));
    if(!mentioned.length)return;
    const url=item.find("link").attr("href");if(!url)return;let u:URL;try{u=new URL(sourceUrl(url));}catch{return;}
    if(u.hostname!=="www.reddit.com"||!u.pathname.includes("/comments/"))return;
    posts.push({id:u.href,title:title.slice(0,180),excerpt:body.slice(0,480),url:u.href,published_at:published,fetched_at:now,retailers:mentioned});
  });
  return posts;
}
export async function fetchCommunityFeed(url:string,now=Date.now()) {
  if(!publicFeeds.some(f=>f.url===url))throw new Error("Unbekannte Feed-Adresse.");
  const response=await fetch(url,{headers:{Accept:"application/atom+xml, application/rss+xml", "User-Agent":"DropRadarLeipzig/1.0 public-feed-reader"},redirect:"manual",signal:AbortSignal.timeout(10000)});
  if(response.status>=300&&response.status<400)throw new Error("Feed leitet weiter; keine automatische Weitergabe an andere Quellen.");
  if(!response.ok)throw new Error(`Öffentlicher Feed nicht lesbar (HTTP ${response.status}).`);
  if(Number(response.headers.get("content-length"))>750000)throw new Error("Feed zu groß.");
  const reader=response.body?.getReader();if(!reader)throw new Error("Leere Feed-Antwort.");
  const decoder=new TextDecoder();let size=0,xml="";
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>750000)throw new Error("Feed zu groß.");xml+=decoder.decode(chunk.value,{stream:true});}xml+=decoder.decode();}
  finally{await reader.cancel().catch(()=>{});}
  const candidates=parseCommunityFeed(xml,now);
  const parsed=load(xml,{xml:true}),dates=parsed("entry").toArray().map(e=>Date.parse(parsed(e).find("published").text()||parsed(e).find("updated").text())).filter(Number.isFinite);
  return {candidates,posts:parseCommunityPosts(xml,now),entries:parsed("entry").length,newest:dates.length?Math.max(...dates):null};
}
