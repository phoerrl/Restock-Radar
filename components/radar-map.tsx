"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, ChevronUp, Clock, ExternalLink, List, LocateFixed, MapPin, Minus, Navigation, Phone, Plus, RefreshCw, Search, Store as StoreIcon, X } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as Leaflet from "leaflet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { branchKey } from "@/lib/intelligence";
import { chainStyle, filterMapBranches, hasPosition, mapBranch, readSavedStops, type MapBranch, type MapFilters } from "@/lib/map-stores";
import { priceState } from "@/lib/pricing";
import type { Snapshot, Store } from "@/lib/types";
import type { signalsSnapshot } from "@/lib/signals-store";

type Signals=Awaited<ReturnType<typeof signalsSnapshot>>;
type MapRuntime={L:typeof Leaflet;map:Leaflet.Map;group:Leaflet.MarkerClusterGroup;tiles:Leaflet.TileLayer;markers:Map<string,Leaflet.Marker>};
const savedKey="drop-radar-stops-v1";
const clock=(n:number)=>new Date(n).toLocaleString("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const euros=(n:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n);
const sourceNames={personal:"Eigener Vor-Ort-Fund",staff:"Mitarbeiterauskunft",community:"Geprüfter Community-Beleg",secondhand:"Zweite Hand"};
const statusRank={uvp:5,fresh:4,announced:3,unknown:2,empty:1,closed:0};

export function RadarMap({snapshot,onReport}:{snapshot:Snapshot;onReport:(store:Store)=>void}) {
  const [signals,setSignals]=useState<Signals|null>(null),[error,setError]=useState(""),[now,setNow]=useState(Date.now()),[refreshing,setRefreshing]=useState(false);
  const [retailer,setRetailer]=useState("all"),[query,setQuery]=useState(""),[mode,setMode]=useState<MapFilters["mode"]>("all"),[onlyOpen,setOnlyOpen]=useState(false);
  const [saved,setSaved]=useState<string[]>([]),[savedReady,setSavedReady]=useState(false),[storageError,setStorageError]=useState(false),[selected,setSelected]=useState<string|null>(null);
  const [mapError,setMapError]=useState(""),[tileError,setTileError]=useState(false),[ready,setReady]=useState(false),[retry,setRetry]=useState(0),[visibleIds,setVisibleIds]=useState<string[]|null>(null),[inView,setInView]=useState(false);
  const container=useRef<HTMLDivElement>(null),detail=useRef<HTMLElement>(null),runtime=useRef<MapRuntime|null>(null),chooseRef=useRef<(id:string)=>void>(()=>{});
  const reload=useCallback(async()=>{setRefreshing(true);try{const r=await fetch("/api/signals",{cache:"no-store"});if(!r.ok)throw new Error("Hinweise nicht erreichbar. Kartenpunkte zeigen nur das Verzeichnis.");setSignals(await r.json());setError("");}catch(e){setError((e as Error).message);}finally{setRefreshing(false);}},[]);
  useEffect(()=>{void reload();},[reload,snapshot.now]);
  useEffect(()=>{const tick=()=>{setNow(Date.now());if(document.visibilityState==="visible")void reload();};const timer=setInterval(tick,60000);document.addEventListener("visibilitychange",tick);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",tick);};},[reload]);
  const branches=useMemo(()=>{
    const evidence=new Map(signals?.branches.map(b=>[branchKey(b.retailer,b.address),b]));
    const directory=new Map(snapshot.stores.map(s=>[branchKey(s.retailer,s.address),s]));
    for(const b of signals?.branches||[])if(!directory.has(branchKey(b.retailer,b.address)))directory.set(branchKey(b.retailer,b.address),b);
    return [...directory.values()].map(s=>mapBranch(s,error?undefined:evidence.get(branchKey(s.retailer,s.address)),snapshot.monitors,signals?.hours.find(h=>branchKey(h.retailer,h.address)===branchKey(s.retailer,s.address)),now,snapshot.settings.interval)).sort((a,b)=>statusRank[b.status]-statusRank[a.status] || a.retailer.localeCompare(b.retailer,"de") || a.name.localeCompare(b.name,"de"));
  },[snapshot,signals,now,error]);
  useEffect(()=>{if(!branches.length||savedReady)return;try{setSaved(readSavedStops(localStorage.getItem(savedKey),branches.map(b=>b.id)));}catch{setStorageError(true);}setSavedReady(true);},[branches,savedReady]);
  useEffect(()=>{if(!savedReady)return;try{localStorage.setItem(savedKey,JSON.stringify(saved));}catch{setStorageError(true);}},[saved,savedReady]);
  const filtered=useMemo(()=>filterMapBranches(branches,{retailer,query,mode,onlyOpen,saved}),[branches,retailer,query,mode,onlyOpen,saved]);
  const mapped=useMemo(()=>filtered.filter(hasPosition),[filtered]);
  const hasMapped=mapped.length>0;
  const listed=inView && visibleIds?filtered.filter(b=>visibleIds.includes(b.id)):filtered;
  const current=filtered.find(b=>b.id===selected);
  useEffect(()=>{if(selected&&!filtered.some(b=>b.id===selected))setSelected(null);},[filtered,selected]);
  function choose(id:string){setSelected(id);const r=runtime.current,m=r?.markers.get(id);if(r&&m)r.group.zoomToShowLayer(m,()=>{m.openTooltip();});if(window.matchMedia("(max-width: 760px)").matches)requestAnimationFrame(()=>detail.current?.scrollIntoView({behavior:"smooth",block:"start"}));}
  chooseRef.current=choose;
  useEffect(()=>{
    let disposed=false,observer:ResizeObserver|undefined;
    async function initialize(){
      try{
        const imported=await import("leaflet"),L=imported.default;
        await import("leaflet.markercluster");
        if(disposed||!container.current)return;
        const map=L.map(container.current,{zoomControl:false,scrollWheelZoom:false,minZoom:10,maxZoom:19}).setView([51.338,12.371],12);
        const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',keepBuffer:2}).addTo(map);
        tiles.on("tileerror",()=>{if(!disposed)setTileError(true);});
        const group=L.markerClusterGroup({maxClusterRadius:36,showCoverageOnHover:false,spiderfyOnMaxZoom:true,iconCreateFunction:cluster=>{
          const count=cluster.getChildCount(),active=cluster.getAllChildMarkers().some(m=>m.options.icon?.options.className?.includes("status-uvp"));
          const fresh=cluster.getAllChildMarkers().some(m=>/status-(fresh|announced)/.test(m.options.icon?.options.className||""));
          return L.divIcon({className:`shop-cluster ${active?"cluster-uvp":fresh?"cluster-fresh":""}`,html:`<span>${count}</span>`,iconSize:[40,40]});
        }}).addTo(map);
        runtime.current={L,map,group,tiles,markers:new Map()};
        const update=()=>{const bounds=map.getBounds();setVisibleIds([...runtime.current!.markers].filter(([,m])=>bounds.contains(m.getLatLng())).map(([id])=>id));};
        map.on("moveend",update);
        observer=new ResizeObserver(()=>map.invalidateSize({pan:false}));observer.observe(container.current);
        setReady(true);setMapError("");
      }catch{if(!disposed)setMapError("Karte konnte nicht geladen werden. Die Filialliste bleibt verfügbar.");}
    }
    void initialize();
    return()=>{disposed=true;observer?.disconnect();runtime.current?.map.remove();runtime.current=null;};
  },[retry]);
  useEffect(()=>{
    const r=runtime.current;if(!ready||!r)return;
    r.group.clearLayers();r.markers.clear();
    for(const b of mapped){
      const style=chainStyle[b.retailer]||{short:"?",color:"#555"},stop=saved.indexOf(b.id);
      const icon=r.L.divIcon({className:`shop-marker status-${b.status}`,html:renderToStaticMarkup(<span className="shop-pin" style={{"--chain":style.color} as React.CSSProperties}><StoreIcon size={15}/><b>{style.short}</b><i className="stock-dot"/>{stop>=0&&<em>{stop+1}</em>}</span>),iconSize:[38,44],iconAnchor:[19,44],tooltipAnchor:[0,-42]});
      const marker=r.L.marker([b.position.lat,b.position.lng],{icon,title:`${b.retailer} ${b.name}: ${b.statusLabel}`,alt:`${b.retailer} ${b.name}`,keyboard:true});
      const tooltip=document.createElement("span");tooltip.textContent=`${b.retailer} · ${b.name}`;marker.bindTooltip(tooltip,{direction:"top"}).on("click",()=>chooseRef.current(b.id)).on("add",()=>{
        const element=marker.getElement();if(!element)return;
        element.setAttribute("aria-label",`${b.retailer} ${b.name}: ${b.statusLabel}`);
        element.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();chooseRef.current(b.id);}});
      });
      r.markers.set(b.id,marker);r.group.addLayer(marker);
    }
    const bounds=r.map.getBounds();setVisibleIds(mapped.filter(b=>bounds.contains([b.position.lat,b.position.lng])).map(b=>b.id));
  },[ready,mapped,saved]);
  function fit(){const r=runtime.current;if(!r||!mapped.length)return;r.map.fitBounds(r.L.latLngBounds(mapped.map(b=>[b.position.lat,b.position.lng])),{padding:[35,35],maxZoom:15});}
  useEffect(()=>{if(ready&&hasMapped)fit();},[ready,hasMapped,retailer,query,mode,onlyOpen]); // Keep the view stable during periodic refreshes.
  function toggleStop(id:string){setSaved(prev=>prev.includes(id)?prev.filter(v=>v!==id):prev.length<30?[...prev,id]:prev);}
  function moveStop(id:string,delta:number){setSaved(prev=>{const next=[...prev],i=next.indexOf(id);if(i>=0&&i+delta>=0&&i+delta<next.length)[next[i],next[i+delta]]=[next[i+delta],next[i]];return next;});}
  return <TooltipProvider delayDuration={200}><section className="map-view">
    <div className="map-heading"><h2>Leipzig & Umgebung</h2><span>{branches.length} Filialen · {new Set(branches.map(b=>b.retailer)).size} Händler</span></div>
    <div className="map-filters"><label className="search-field"><Search size={18}/><input aria-label="Filiale, Straße oder PLZ suchen" placeholder="Filiale, Straße oder PLZ" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Suche löschen" onClick={()=>setQuery("")}><X size={16}/></button>}</label><Select value={retailer} onValueChange={setRetailer}><SelectTrigger aria-label="Karten-Händler filtern"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Alle Händler</SelectItem>{snapshot.retailers.map(r=><SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}</SelectContent></Select><label className="switch-label"><Switch checked={onlyOpen} onCheckedChange={setOnlyOpen}/>Geprüft geöffnet</label></div>
    <div className="map-modebar"><div className="map-modes" role="group" aria-label="Kartenansicht">{([['all','Alle'],['fresh','Frisch'],['uvp','Bis UVP'],['saved',`Tour (${saved.length})`]] as const).map(([key,label])=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{key==="saved"&&<Bookmark size={14}/>} {label}</button>)}</div><Tip label="Hinweise aktualisieren"><button className="icon-button" disabled={refreshing} onClick={()=>void reload()} aria-label="Kartenhinweise aktualisieren"><RefreshCw size={17} className={refreshing?"spin":""}/></button></Tip></div>
    {error&&<p className="map-warning" role="alert">{error}</p>}
    <div className="map-workspace"><div className="map-surface">
      <div ref={container} className="leipzig-map" role="region" aria-label="Interaktive Karte der Filialen in Leipzig"/>
      {!ready&&!mapError&&<div className="map-loading" role="status"><RefreshCw size={20} className="spin"/>Karte wird geladen</div>}
      {mapError&&<div className="map-loading" role="alert"><span>{mapError}</span><button className="secondary" onClick={()=>{setReady(false);setRetry(n=>n+1);}}>Erneut laden</button></div>}
      <div className="map-tools"><Tip label="Alle gefilterten Filialen anzeigen"><button className="icon-button" disabled={!ready||!mapped.length} aria-label="Karte auf Filialen zentrieren" onClick={fit}><LocateFixed size={20}/></button></Tip><Tip label="Vergrößern"><button className="icon-button" disabled={!ready} aria-label="Karte vergrößern" onClick={()=>runtime.current?.map.zoomIn()}><Plus size={20}/></button></Tip><Tip label="Verkleinern"><button className="icon-button" disabled={!ready} aria-label="Karte verkleinern" onClick={()=>runtime.current?.map.zoomOut()}><Minus size={20}/></button></Tip></div>
      {tileError&&<div className="tile-warning" role="status"><span>Kartenhintergrund teilweise nicht erreichbar.</span><button onClick={()=>{setTileError(false);runtime.current?.tiles.redraw();}} aria-label="Kartenhintergrund neu laden"><RefreshCw size={16}/></button></div>}
      <div className="map-legend"><span><i className="uvp-dot"/>Frisch bis UVP-Referenz</span><span><i className="fresh-dot"/>Frisch / angekündigt</span><span><i/>Kein frischer Beleg</span></div>
    </div><aside className="map-sidebar" aria-label="Filialauswahl">
      {current?<MapStoreDetail current={current} openingSource={signals?.hours.find(h=>branchKey(h.retailer,h.address)===current.id)?.source_url} saved={saved} onToggle={()=>toggleStop(current.id)} onReport={()=>onReport(current)} onClose={()=>setSelected(null)} detailRef={detail}/>:<><div className="map-list-heading"><strong><List size={16}/>{listed.length} Filialen</strong><label><input type="checkbox" checked={inView} onChange={e=>setInView(e.target.checked)}/>Kartenausschnitt</label></div><div className="map-branch-list">{!listed.length?<div className="map-empty"><MapPin size={25}/><strong>{mode==="saved"?"Noch keine passenden Tour-Stopps":mode==="uvp"?"Kein frischer UVP-Beleg":mode==="fresh"?"Kein frischer Filialhinweis":"Keine passenden Filialen"}</strong><p>{onlyOpen?"Ungeprüfte Öffnungszeiten sind ausgeschlossen.":mode==="all"?"Filter oder Kartenausschnitt ändern.":"Das ist keine Aussage, dass die Läden leer sind."}</p><button className="secondary" onClick={()=>{setMode("all");setQuery("");setRetailer("all");setOnlyOpen(false);setInView(false);}}>Alle Filialen</button></div>:listed.map(b=><button key={b.id} className="map-list-item" onClick={()=>choose(b.id)}><span className="chain-symbol" style={{background:chainStyle[b.retailer]?.color}}>{chainStyle[b.retailer]?.short||"?"}</span><span><strong>{b.retailer}</strong><span>{b.name}</span><small className={`status-text status-${b.status}`}><i/>{b.statusLabel}</small><small>{b.opening.label}{!hasPosition(b)?" · Position offen":""}</small></span>{saved.includes(b.id)&&<Bookmark size={15} className="saved-symbol"/>}</button>)}</div></>}
    </aside></div>
    <div className="map-coverage"><span>{mapped.length} Kartenpositionen · {filtered.length-mapped.length} ohne Position</span><span>Standortquelle: OpenStreetMap, 06.10.2026 · nicht alle Filialen erfasst</span></div>
    <p className="map-disclaimer">{branches.length} verzeichnete Standorte sind keine {branches.length} Bestandsquellen. Aktuell kein angeschlossenes Wareneingangssystem.</p>
    {!!saved.length&&<section className="saved-tour"><div className="section-heading"><h2>Tour-Stopps <span className="count">{saved.length}</span></h2><span className="tiny">Auf diesem Gerät</span></div>{saved.map((id,index)=>{const b=branches.find(b=>b.id===id);if(!b)return null;return <div className="tour-stop" key={id}><span className="tour-number">{index+1}</span><button className="tour-name" onClick={()=>{setMode("all");setRetailer("all");setQuery("");setOnlyOpen(false);setSelected(id);}}><strong>{b.retailer} · {b.name}</strong><span>{b.opening.label} · {b.statusLabel}</span></button><div className="tour-controls"><Tip label="Stopp nach oben"><button className="icon-button" disabled={index===0} aria-label={`${b.retailer}: Stopp nach oben`} onClick={()=>moveStop(id,-1)}><ChevronUp size={17}/></button></Tip><Tip label="Stopp nach unten"><button className="icon-button" disabled={index===saved.length-1} aria-label={`${b.retailer}: Stopp nach unten`} onClick={()=>moveStop(id,1)}><ChevronDown size={17}/></button></Tip><a className="icon-button" href={`https://maps.apple.com/?daddr=${encodeURIComponent(b.address)}`} target="_blank" rel="noreferrer" title="Route zu diesem Stopp" aria-label={`${b.retailer}: Route zu diesem Stopp`}><Navigation size={17}/></a><Tip label="Stopp entfernen"><button className="icon-button" aria-label={`${b.retailer}: Stopp entfernen`} onClick={()=>toggleStop(id)}><X size={17}/></button></Tip></div></div>;})}</section>}
    {storageError&&<p className="map-warning" role="status">Die Tour kann hier nicht dauerhaft gespeichert werden. Die Stopps bleiben nur bis zum Schließen dieser Ansicht erhalten.</p>}
  </section></TooltipProvider>;
}
function Tip({label,children}:{label:string;children:React.ReactNode}){return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;}
function MapStoreDetail({current,openingSource,saved,onToggle,onReport,onClose,detailRef}:{current:MapBranch;openingSource?:string;saved:string[];onToggle:()=>void;onReport:()=>void;onClose:()=>void;detailRef:React.Ref<HTMLElement>}){
  return <section className="map-detail" ref={detailRef} aria-label="Ausgewählte Filiale"><div className="map-detail-head"><div><div className="product-retailer">{current.retailer}</div><h3>{current.name}</h3><p>{current.address}</p></div><Tip label="Zurück zur Filialliste"><button className="icon-button" aria-label="Filialdetail schließen" onClick={onClose}><X size={18}/></button></Tip></div><div className="map-detail-content"><div><span className={`badge ${current.status==="uvp"?"available":["fresh","announced"].includes(current.status)?"unknown":"neutral"}`}>{current.statusLabel}</span><p>{current.status==="closed"?"Heute derzeit geschlossen. Ein Fund ist keine Zusage für den nächsten Öffnungstag.":current.status==="unknown"?"Kein aktueller Beleg für Pokémon 30 Jahre. Diese Filiale ist eine Anlaufstelle, keine Bestandszusage.":current.status==="uvp"||current.status==="fresh"?"Zeitnaher filialgenauer Hinweis, keine Bestandszusage und kein bestätigter Wareneingang.":current.reason}</p><div className="detail-opening"><Clock size={16}/><span>{current.opening.label}</span></div>{openingSource&&<a className="detail-source" href={openingSource} target="_blank" rel="noreferrer">Öffnungszeiten-Beleg<ExternalLink size={13}/></a>}
    {current.recent.map(o=><div className="map-evidence" key={o.id}><strong>{o.product}</strong><span>{sourceNames[o.source]} · {clock(o.observed_at)}</span><span>{o.price!==null?euros(o.price):"Filialpreis offen"} · {priceState(o.price,o)==="eligible"?"bis eigener UVP-Referenz":"UVP nicht belegt"}</span>{o.source_url&&<a href={o.source_url} target="_blank" rel="noreferrer">Original-Beleg<ExternalLink size={13}/></a>}</div>)}
    {current.offers.map(({monitor:m,branch:b})=><div className="map-evidence" key={m.id}><strong>{m.name}</strong><span>{b.quantity} gemeldete Stück · {clock(m.checked_at!)} · Händlerquelle</span><span>{b.price!==null?euros(b.price):"Filialpreis offen"}</span><a href={m.url} target="_blank" rel="noreferrer">Bestandsquelle<ExternalLink size={13}/></a></div>)}
    {!current.recent.length&&!current.offers.length&&current.observations[0]&&<p className="tiny">Letzte dokumentierte Beobachtung: {current.observations[0].time_precision==="day"?new Date(current.observations[0].observed_at).toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"}):clock(current.observations[0].observed_at)}{current.observations[0].time_precision==="day"?" · Uhrzeit unbekannt":""} · {sourceNames[current.observations[0].source]} · kein aktueller Bestand.</p>}
    {current.position&&<p className="tiny"><a className="detail-source" href={current.position.source_url} target="_blank" rel="noreferrer">{current.position.precision==="building"?"Ungefähre Gebäudeposition":"Kartenposition"}<ExternalLink size={13}/></a>{current.directory_source==="osm"?"Adresse aus OSM, noch nicht gegen die Filialseite geprüft.":"Adresse aus dem Filialverzeichnis."}</p>}</div><div className="map-detail-actions"><a className="primary" href={`https://maps.apple.com/?daddr=${encodeURIComponent(current.address)}`} target="_blank" rel="noreferrer"><Navigation size={17}/>Route öffnen</a>{current.phone&&<a className="secondary" href={`tel:${current.phone}`}><Phone size={16}/>Anrufen</a>}<button className="secondary" aria-pressed={saved.includes(current.id)} disabled={!saved.includes(current.id)&&saved.length>=30} onClick={onToggle}>{saved.includes(current.id)?<Check size={16}/>:<Bookmark size={16}/>} {saved.includes(current.id)?"Von Tour entfernen":"Zur Tour merken"}</button><button className="secondary" onClick={onReport}><Plus size={16}/>Fund eintragen</button><a className="detail-source" href={current.url} target="_blank" rel="noreferrer">Filialseite / Filialfinder<ExternalLink size={14}/></a></div></div></section>;
}
