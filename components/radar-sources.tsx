"use client";
import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, Radio, RefreshCw } from "lucide-react";
import { sourceCatalog } from "@/lib/source-catalog";
import { hasBranchStock } from "@/lib/branch-stock";
import type { Snapshot } from "@/lib/types";
type Sources={sources:{id:string;name:string;url:string;status:string;detail:string;checked_at:number|null}[];discord:{configured:boolean;total:number;readable:number;checked_at:number|null;detail:string}};
const clock=(n:number|null)=>n?new Date(n).toLocaleString("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"Noch nicht geprueft";
const recentlyRead=(source:Sources["sources"][number],now:number)=>source.status==="readable"&&source.checked_at!==null&&source.checked_at<=now&&now-source.checked_at<600000;
export function RadarSources({snapshot,owner}:{snapshot:Snapshot;owner:boolean}){
  const [data,setData]=useState<Sources|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{let alive=true;fetch("/api/signals",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Quellenstatus nicht erreichbar.");return r.json() as Promise<Sources>;}).then(s=>{if(alive)setData(s);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[snapshot.now]);
  async function refresh(){setBusy(true);setError("");try{const response=await fetch("/api/signals",owner?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"refresh"})}:{cache:"no-store"});if(!response.ok)throw new Error("Quellenpruefung fehlgeschlagen.");setData(await response.json());}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const active=snapshot.monitors.filter(m=>m.enabled),priced=active.filter(m=>m.uvp_price&&m.uvp_source);
  const fresh=active.filter(m=>m.checked_at&&m.checked_at<=snapshot.now&&snapshot.now-m.checked_at<600000&&m.branches.some(hasBranchStock));
  return <section className="sources-view">
    <div className="section-heading"><h2>Quellen & Alarmkette</h2><button className="secondary" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16} className={busy?"spin":""}/>{owner?"Quellen pruefen":"Aktualisieren"}</button></div>
    {error&&<div className="message error-message" role="alert"><AlertCircle size={18}/>{error}</div>}
    <div className="source-health"><div><strong>{fresh.length}</strong><span>Artikel mit frischem Filialbestand</span></div><div><strong>{priced.length} / {active.length}</strong><span>Artikel mit UVP-Referenz</span></div><div><strong>{data?.sources.filter(s=>recentlyRead(s,snapshot.now)).length??0}</strong><span>Frisch gelesene Quellen</span></div><div><strong>{data?.discord?.readable??0}</strong><span>Frisch gelesene Discord-Kan&auml;le</span></div></div>
    {(!fresh.length||priced.length<active.length)&&<div className="signal-empty"><AlertCircle size={21}/><div><strong>Restock-Alarme sind noch eingeschraenkt</strong><p>{!fresh.length?"Keine aktuelle filialgenaue Bestandsantwort. ":""}{priced.length<active.length?"UVP-Referenzen fehlen bei vorgemerkten Artikeln. ":""}Online-Bestand, alte Berichte und unbekannte Preise sind keine bestaetigten UVP-Funde.</p><a href="/admin">Verwaltung</a></div></div>}
    <div className="section-heading"><h2>Automatische oeffentliche Abrufe</h2></div>
    <div className="source-list">{data?.sources.map(s=><div className="source-row" key={s.id}><div><strong>{s.name}</strong><span>{s.detail}</span><span>{clock(s.checked_at)}</span></div><span className={`badge ${recentlyRead(s,snapshot.now)?"neutral":"blocked"}`}>{recentlyRead(s,snapshot.now)?"Lesbar":s.status==="readable"?"Veraltet":s.status==="blocked"?"Blockiert":"Ungeprueft"}</span><a className="icon-button" title="Originalquelle" aria-label={`${s.name}: Originalquelle`} href={s.url} target="_blank" rel="noreferrer"><ExternalLink size={17}/></a></div>)}</div>
    <div className="section-heading"><h2>Discord-Import</h2><Radio size={20}/></div>
    <div className="source-connection"><strong>{data?.discord?.configured?`${data.discord.readable} von ${data.discord.total} Kanalen lesbar`:"Noch nicht verbunden"}</strong><p>{data?.discord?.detail||"Quellenstatus wird geladen."}</p><span className="tiny">{clock(data?.discord?.checked_at??null)}</span></div>
    <div className="section-heading"><h2>Gepruefte Alternativen</h2><span className="tiny">Recherche 08.10.2026</span></div>
    <div className="provider-list">{sourceCatalog.map(s=><article key={s.id}><div className="provider-heading"><h3>{s.name}</h3><a className="icon-button" title="Anbieter ansehen" aria-label={`${s.name}: Anbieter ansehen`} href={s.url} target="_blank" rel="noreferrer"><ExternalLink size={17}/></a></div><span className="badge neutral">{s.status}</span><dl><div><dt>Zugang</dt><dd>{s.cost}</dd></div><div><dt>Abdeckung</dt><dd>{s.scope}</dd></div></dl><p>{s.detail}</p></article>)}</div>
  </section>;
}
