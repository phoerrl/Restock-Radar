"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink, Package, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canonicalGtin, catalogCheckedAt, setProducts, showcaseDE, showcaseUS } from "@/lib/set-catalog";
import type { Monitor } from "@/lib/types";

const day=(value:string)=>new Date(value+"T12:00:00Z").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
const status=(m:Monitor|undefined)=>!m?"Nicht vorgemerkt":!m.enabled?"Pausiert":m.status==="blocked"?"Abfrage blockiert":m.status==="error"?"Abfrage fehlgeschlagen":m.channel==="store"?"Filialdaten erfasst":m.checked_at?"Filialdaten offen":"Noch nicht geprüft";

export function SetCatalog({monitors}:{monitors:Monitor[]}) {
  const [query,setQuery]=useState(""),[release,setRelease]=useState("all"),[retailer,setRetailer]=useState("all"),[copied,setCopied]=useState("");
  const normalized=query.toLocaleLowerCase("de-DE").trim(),code=canonicalGtin(normalized);
  const filtered=setProducts.filter(p=>(release==="all"||(release==="trade"?p.release.inTrade:!p.release.inTrade))
    &&(retailer==="all"||p.sources.some(s=>s.retailer===retailer))
    &&(!normalized||(code?p.gtin===code:[p.name,p.family,...p.variants,p.gtin||""].join(" ").toLocaleLowerCase("de-DE").includes(normalized))));
  const shops=[...new Set(setProducts.flatMap(p=>p.sources.map(s=>s.retailer)))].sort();
  const current=setProducts.filter(p=>p.release.inTrade).length;
  async function copy(code:string){try{await navigator.clipboard.writeText(code);setCopied(code);}catch{setCopied("");}}
  return <section className="set-catalog" aria-label="Produktkatalog 30 Jahre">
    <div className="section-heading"><h2>30 Jahre <span className="count">{setProducts.length} Positionen</span></h2><a className="catalog-official" href={showcaseDE} target="_blank" rel="noreferrer">Pokémon <ExternalLink size={14}/></a></div>
    <div className="catalog-summary"><span>{current} mit deutschem Handelsnachweis</span><span>{setProducts.length-current} angekündigt / Zuordnung offen</span><span>{setProducts.filter(p=>p.gtin).length} belegte EANs</span></div>
    <div className="filters catalog-filters">
      <label className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Produkt, Pokémon oder EAN" aria-label="Set-Katalog durchsuchen"/></label>
      <Select value={release} onValueChange={setRelease}><SelectTrigger className="retailer-select" aria-label="Veröffentlichungsstatus"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Alle Produkte</SelectItem><SelectItem value="trade">Im Handel nachgewiesen</SelectItem><SelectItem value="announced">Angekündigt / offen</SelectItem></SelectContent></Select>
      <Select value={retailer} onValueChange={setRetailer}><SelectTrigger className="retailer-select" aria-label="Belegte Artikelquellen"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Alle Artikelquellen</SelectItem>{shops.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="catalog-results" role="status">{filtered.length} von {setProducts.length} Positionen · Stand {day(catalogCheckedAt.slice(0,10))}</div>
    <div className="catalog-list">{filtered.map(p=><article className="catalog-item" key={p.id}>
      <div className="catalog-image">{p.image?<img src={p.image} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<Package size={30}/>}</div>
      <div className="catalog-main">
        <div className="catalog-item-head"><h3>{p.name}</h3><span className={`badge ${p.release.inTrade?"neutral":"preorder"}`}>{p.release.inTrade?"Handelsnachweis":"Angekündigt / offen"}</span></div>
        <p className="catalog-content">{p.boosters===0?"60-Karten-Deck · keine Booster":p.family==="Ultra-Premium"?"29 Booster + 1 Classic-Booster":`${p.boosters} Booster`}{p.variants.length?` · ${p.variants.join(" / ")}`:""}</p>
        <div className="catalog-code">{p.gtin?<><span>EAN <code>{p.gtin}</code></span><button className="icon-button" title={copied===p.gtin?"EAN kopiert":"EAN kopieren"} aria-label={`${p.name}: EAN kopieren`} onClick={()=>void copy(p.gtin!)}>{copied===p.gtin?<Check size={15}/>:<Copy size={15}/>}</button>{p.gtinSource?<a href={p.gtinSource} target="_blank" rel="noreferrer" title="Barcode-Beleg"><ExternalLink size={13}/></a>:<span className="tiny">Kassenbeleg</span>}</>:<span className="tiny">Deutsche EAN noch nicht belegt</span>}</div>
        <div className="catalog-release"><span>Deutschland: {p.release.deDate?<a href={p.release.deSource} target="_blank" rel="noreferrer">Verkaufsfreigabe {day(p.release.deDate)}</a>:p.release.deWindow}</span>{p.release.internationalDate&&<span>US-Termin: <a href={showcaseUS} target="_blank" rel="noreferrer">{day(p.release.internationalDate)}</a></span>}</div>
        <details className="catalog-evidence"><summary>Belege und Prüfquellen <span className="count">{p.sources.length}</span></summary><p>{p.release.note}</p><a className="catalog-official" href={p.officialUrl} target="_blank" rel="noreferrer">Herstellerangaben <ExternalLink size={13}/></a>
          {p.sources.length?<ul>{p.sources.map(s=>{const m=monitors.find(m=>m.url===s.url);return <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.retailer} <ExternalLink size={13}/></a><span>Artikel {s.articleId} · {status(m)}{m?.checked_at?` · ${new Date(m.checked_at).toLocaleString("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:""}</span><span>{m?.uvp_price&&m.uvp_source?`Eigene UVP-Referenz: ${m.uvp_price.toFixed(2).replace(".",",")} €`:"UVP-Referenz offen"}</span></li>;})}</ul>:<p>Deutscher Artikelanschluss noch nicht belegt.</p>}
        </details>
      </div>
    </article>)}</div>
    {!filtered.length&&<div className="empty-state"><Package size={30}/><h3>Keine passenden Produkte</h3></div>}
  </section>;
}
