"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Radar, RefreshCw, Bell, BellOff, Plus, MapPin, Package, ExternalLink, Radio, Clock, Trash2, SlidersHorizontal, Check, AlertCircle, Smartphone, X, Tag, LockKeyhole } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { matchesStore } from "@/lib/place";
import { priceState } from "@/lib/pricing";
import type { Snapshot, Settings, Monitor, Store } from "@/lib/types";
import { RadarSignals } from "@/components/radar-signals";
import { RadarMap } from "@/components/radar-map";
import { SetCatalog } from "@/components/set-catalog";
import { showcaseDE } from "@/lib/set-catalog";
import { RadarSources } from "@/components/radar-sources";

const names:Record<string,string>={available:"Filialbestand gemeldet",unavailable:"In Filiale nicht vorrätig",unknown:"Bestand offen",blocked:"Abfrage blockiert",error:"Abfrage fehlgeschlagen",preorder:"Keine sofortige Ware"};
const time=(n:number|null)=>n?new Date(n).toLocaleTimeString("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}):"Noch keine";
const date=(n:number)=>new Date(n).toLocaleString("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const euros=(n:number|null)=>n===null?"Preis offen":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n);
const priceNames={eligible:"Bis UVP-Referenz",above:"Über UVP-Referenz","missing-price":"Filialpreis offen","missing-reference":"UVP-Referenz fehlt"};
const empty:Snapshot={monitors:[],drops:[],retailers:[],stores:[],devices:0,settings:{auto:true,interval:120},publicKey:null,lastScan:null,schedulerAt:null,schedule:null,now:0};

async function api<T=Snapshot>(data?:Record<string,unknown>):Promise<T>{
  const res=await fetch("/api/radar",data?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}:{cache:"no-store"});
  let json:T & {error?:string};
  try{json=await res.json() as T & {error?:string};}catch{throw new Error("Die Verbindung ist abgelaufen. Bitte die Seite neu öffnen und anmelden.");}
  if(!res.ok)throw new Error(json.error||"Der Radar ist nicht erreichbar.");return json;
}
async function pushApi(action:"subscribe"|"unsubscribe"|"test",subscription:PushSubscription){
  const response=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,subscription:subscription.toJSON()})});
  const result=await response.json() as {error?:string;delivered?:number;failed?:number};
  if(!response.ok)throw new Error(result.error||"Push-Anfrage fehlgeschlagen.");return result;
}

export default function Page(){
  const [owner,setOwner]=useState(false);
  const [articleView,setArticleView]=useState("catalog");
  const [state,setState]=useState(empty),[loading,setLoading]=useState(true),[tab,setTab]=useState("stores"),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [checking,setChecking]=useState(false),[reportTarget,setReportTarget]=useState<Store|null>(null);
  const [dialog,setDialog]=useState(false),[saving,setSaving]=useState(false);
  const [editing,setEditing]=useState<Monitor|null>(null);
  const [sub,setSub]=useState<PushSubscription|null>(null),[pushBusy,setPushBusy]=useState(false),[pushSupported,setPushSupported]=useState(false),[standalone,setStandalone]=useState(false);
  const scanBusy=useRef(false);
  const reload=useCallback(async()=>{setState(await api());},[]);
  const action=useCallback(async(data:Record<string,unknown>)=>{
    if(!owner)throw new Error("Bitte zuerst die Verwaltung anmelden.");
    setError("");try{const s=await api<Partial<Snapshot> & {delivered?:number;failed?:number}>(data);if(s.monitors)setState(s as Snapshot);return s;}
    catch(err){setError((err as Error).message);throw err;}
  },[owner]);
  const check=useCallback(async(manual=true)=>{
    if(scanBusy.current)return;scanBusy.current=true;setChecking(true);setError("");
    if(!owner){try{await reload();}catch(err){setError((err as Error).message);}finally{scanBusy.current=false;setChecking(false);}return;}
    try{const r=await api<{busy?:boolean;checked:number;drops:number;community?:{checked:number;imported:number}}>({action:"scan"});await reload();if(manual||r.drops)setNotice(r.busy?"Eine Prüfung läuft bereits.":r.checked||r.community?.checked?`${r.checked} Artikelquellen · ${r.community?.checked??0} Community-Feeds geprüft. ${r.drops} neue Filialangebote, ${r.community?.imported??0} neue Prüfkandidaten.`:"Aktive Quellen sind noch im Prüfintervall. Blockierte Quellen: erneuter Versuch nach 30 Minuten.");}
    catch(err){setError((err as Error).message);}finally{scanBusy.current=false;setChecking(false);}
  },[reload,owner]);
  useEffect(()=>{
    fetch("/api/access",{cache:"no-store"}).then(r=>r.json()).then(s=>setOwner(!!s&&typeof s==="object"&&"owner" in s&&s.owner===true)).catch(()=>setOwner(false));
    reload().catch(err=>setError(err.message)).finally(()=>setLoading(false));
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || !!(navigator as Navigator & {standalone?:boolean}).standalone);
    if("serviceWorker" in navigator && "PushManager" in window && "Notification" in window){
      setPushSupported(true);navigator.serviceWorker.register("/sw.js").then(()=>navigator.serviceWorker.ready).then(r=>r.pushManager.getSubscription()).then(setSub).catch(()=>setError("Die Push-Verbindung konnte nicht initialisiert werden."));
    }
  },[reload]);
  useEffect(()=>{
    if(loading||!state.settings.auto)return;
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void (owner?check(false):reload()).catch(()=>{});},state.settings.interval*1000);
    const refresh=()=>{if(document.visibilityState==="visible")reload().catch(()=>{});};document.addEventListener("visibilitychange",refresh);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[loading,state.settings.auto,state.settings.interval,check,reload,owner]);
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;
    if(!context||!owner)return;const life=new AbortController();
    try{void Promise.resolve(context.registerTool({name:"check_drop_radar",description:"Check saved branch stock sources and refresh the physical-store Pokémon radar.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async(input:unknown)=>{if(!input||typeof input!=="object"||Object.keys(input).length)throw new Error("No arguments accepted");const r=await api({action:"scan"});await reload();return r;}},{signal:life.signal})).catch(()=>{});}catch{}
    return()=>life.abort();
  },[reload,owner]);
  async function push(){
    setPushBusy(true);setError("");try{
      if(!state.publicKey)throw new Error("Push ist noch nicht eingerichtet.");
      const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("Push wurde nicht erlaubt. Du kannst die Berechtigung in den iPhone-Einstellungen ändern.");
      const registration=await navigator.serviceWorker.ready;
      const bytes=Uint8Array.from(atob(state.publicKey.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
      const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
      await pushApi("subscribe",subscription);setSub(subscription);setNotice("Dieses Gerät ist verbunden. Eine Testnachricht bestätigt den Empfang.");
    }catch(err){setError((err as Error).message);}finally{setPushBusy(false);}
  }
  async function disablePush(){if(!sub)return;setPushBusy(true);try{await pushApi("unsubscribe",sub);await sub.unsubscribe();setSub(null);}catch(err){setError((err as Error).message);}finally{setPushBusy(false);}}
  async function testPush(){if(!sub)return;setPushBusy(true);try{await pushApi("subscribe",sub);const r=await pushApi("test",sub);if(!r.delivered)throw new Error("Der Push-Dienst hat die Meldung nicht angenommen. Bitte Push erneut verbinden.");setNotice("Testmeldung vom Push-Dienst angenommen. Bitte den Empfang auf diesem Gerät prüfen.");}catch(err){setError((err as Error).message);}finally{setPushBusy(false);}}
  async function saveSettings(next:Settings){try{await action({action:"settings",settings:next});}catch{}}
  async function saveProduct(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);setSaving(true);
    const reference={uvpPrice:form.get("uvpPrice")?Number(String(form.get("uvpPrice")).replace(",",".")):null,uvpSource:form.get("uvpSource")||null};
    try{await action(editing?{action:"reference",id:editing.id,...reference}:{action:"add",name:form.get("name"),url:form.get("url"),...reference});setDialog(false);setNotice(editing?"UVP-Referenz gespeichert.":"Artikel gespeichert. Filialbestand und Filialpreis bleiben bis zu einem Beleg offen.");}catch{}finally{setSaving(false);}
  }
  function openProduct(m:Monitor|null=null){if(!owner)return;setEditing(m);setError("");setDialog(true);}
  const products=state.monitors;
  const available=products.filter(m=>m.enabled&&m.status==="available"&&m.channel==="store");
  const storeOffers=(address:string,shop:string)=>available.filter(m=>m.retailer===shop&&!!m.checked_at&&m.checked_at<=Date.now()&&Date.now()-m.checked_at<Math.max(600000,state.settings.interval*2000)).flatMap(m=>m.branches.filter(b=>b.status==="available"&&matchesStore(b.label,address)).map(b=>({monitor:m,branch:b})));
  const eligibleOffers=(address:string,shop:string)=>storeOffers(address,shop).filter(o=>priceState(o.branch.price,o.monitor)==="eligible");
  const scheduled=state.schedule?.enabled,stale=scheduled&&(!state.schedulerAt||Date.now()-state.schedulerAt>Math.max(600000,state.schedule!.interval*120000));
  const monitorLabel=!state.settings.auto?"Radar pausiert":state.backgroundError?"Hintergrundprüfung fehlgeschlagen":scheduled?(stale?"Hintergrundprüfung wartet":"Hintergrundprüfung aktiv"):"Erster Hintergrundlauf steht aus";
  const withBranchData=products.some(m=>m.enabled&&m.channel==="store");
  return <div className="app-shell">
    <header className="masthead"><a className="brand" href="/"><span className="brand-icon"><Radar size={24}/></span>DROP RADAR</a><span className="region"><MapPin size={16}/>Leipzig</span>{owner?<button className="icon-button" title="Push-Einstellungen" onClick={()=>setTab("push")}><Bell size={20}/></button>:<a className="icon-button" href="/admin" title="Verwaltung anmelden" aria-label="Verwaltung anmelden"><LockKeyhole size={20}/></a>}</header>
    <main>
      <div className="page-heading"><div><div className="eyebrow">POKÉMON · 30 JAHRE · NUR VOR ORT</div><h1>Leipzig-Filialradar</h1></div><button className="primary" aria-label={owner?"Bestandsquellen jetzt prüfen":"Aktuellen Serverstand laden"} onClick={()=>void check()} disabled={checking||loading}><RefreshCw size={17} className={checking?"spin":""}/><span>{checking?(owner?"Wird geprüft…":"Wird geladen…"):(owner?"Jetzt prüfen":"Aktualisieren")}</span></button></div>
      {error&&<div className="message error-message" role="alert"><AlertCircle size={18}/><span>{error}</span><button onClick={()=>setError("")} aria-label="Fehler schließen"><X size={17}/></button></div>}
      {notice&&<div className="message notice-message" role="status"><Check size={18}/><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Meldung schließen"><X size={17}/></button></div>}
      {tab!=="signals"&&tab!=="stores"&&tab!=="radar"&&<div className="stats"><div><span>Händler im Verzeichnis</span><strong>{loading?"–":state.retailers.length}</strong></div><div><span>Verzeichnete Filialen</span><strong>{loading?"–":state.stores.length}</strong></div><div><span>Bis UVP-Referenz verfügbar</span><strong>{loading?"–":state.stores.filter(s=>eligibleOffers(s.address,s.retailer).length).length}</strong></div><div><span>Letzte Quellenprüfung</span><strong className="small-stat">{time(state.lastScan)}</strong></div></div>}
      {tab!=="signals"&&tab!=="stores"&&!loading&&!withBranchData&&<div className="data-status"><AlertCircle size={20}/><div><strong>Filialbestandsquelle fehlt noch</strong><p>Für die vorgemerkten Läden liegt noch kein belastbarer Pokémon-Bestand vor. Wareneingänge werden derzeit nicht erkannt.</p></div></div>}
      <div className="monitor-strip"><Radio size={19}/><div><strong>{monitorLabel}</strong><span>{scheduled?`Letzter Hintergrundlauf: ${time(state.schedulerAt)}`:(owner?`Quellenprüfung alle ${state.settings.interval/60} Minuten bei geöffneter App`:"Serverstand wird bei geöffneter App automatisch aktualisiert")}</span></div><button className={`badge ${sub?"available":"neutral"}`} onClick={()=>setTab("push")}>{sub?"Push verbunden":"Push noch aus"}</button></div>
      <Tabs value={tab} onValueChange={setTab}><TabsList variant="line"><TabsTrigger value="stores"><MapPin/>Karte</TabsTrigger><TabsTrigger value="signals"><Radar/>Heute</TabsTrigger><TabsTrigger value="radar"><Package/>Artikel</TabsTrigger><TabsTrigger value="history"><Clock/>Verlauf</TabsTrigger><TabsTrigger value="sources"><Radio/>Quellen</TabsTrigger><TabsTrigger value="push"><Bell/>Push</TabsTrigger></TabsList>
        <TabsContent value="sources"><RadarSources snapshot={state} owner={owner}/></TabsContent>
        <TabsContent value="signals"><RadarSignals readOnly={!owner} scanVersion={state.now} reportTarget={reportTarget} onReportOpened={()=>setReportTarget(null)}/></TabsContent>
        <TabsContent value="stores">
          <RadarMap snapshot={state} onReport={store=>{if(!owner){window.location.assign("/admin");return;}setReportTarget(store);setTab("signals");}}/>
        </TabsContent>
        <TabsContent value="radar">
          <div className="catalog-view" role="group" aria-label="Artikelansicht"><button aria-pressed={articleView==="catalog"} onClick={()=>setArticleView("catalog")}><Package size={16}/>Set-Katalog</button><button aria-pressed={articleView==="sources"} onClick={()=>setArticleView("sources")}><Radio size={16}/>Prüfquellen <span>{products.length}</span></button></div>
          {articleView==="catalog"?<SetCatalog monitors={products}/>:<>
          <div className="section-heading"><h2>Prüfquellen <span className="count">{products.length}</span></h2>{owner&&<button className="secondary" onClick={()=>openProduct()}><Plus size={17}/>Artikel hinzufügen</button>}</div>
          {!products.length?<div className="empty-state"><Package size={36}/><h3>Noch keine Artikel vorgemerkt</h3></div>:<div className="product-list">{products.map(m=><div className={`product-row ${!m.enabled?"paused":""}`} key={m.id}>
            <div className="product-image">{m.image?<img src={m.image} alt={m.name} loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<Package size={27}/>}</div>
            <div className="product-main"><div className="product-retailer">{m.retailer}<span>{m.channel==="store"?m.location:"Filialbestand nicht belegt"}</span></div><strong className="product-title">{m.name}</strong><p className="product-detail">{m.detail}</p><div className="price-reference"><Tag size={14}/><span>{m.uvp_price?`Eigene UVP-Referenz: ${euros(m.uvp_price)}`:"UVP-Referenz fehlt · kein UVP-Alarm"}</span>{m.uvp_source&&<a href={m.uvp_source} target="_blank" rel="noreferrer" title="UVP-Beleg öffnen"><ExternalLink size={13}/></a>}</div>{m.branches.filter(b=>b.status==="available").map(b=><p className="product-meta" key={b.key}>{b.name}: {euros(b.price)} · {priceNames[priceState(b.price,m)]}</p>)}<div className="product-meta">{m.checked_at?`Quelle geprüft ${date(m.checked_at)}`:"Quelle noch nicht geprüft"}</div></div>
            <div className="product-status"><span className={`badge ${m.status}`}>{names[m.status]||"Bestand offen"}</span>{!m.enabled&&<span className="tiny">Pausiert</span>}</div>
            <div className="row-actions">{owner&&<><Switch checked={!!m.enabled} onCheckedChange={enabled=>void action({action:"update",id:m.id,enabled}).catch(()=>{})} aria-label={`${m.name} beobachten`}/><button className="icon-button" title="UVP-Referenz bearbeiten" aria-label={`${m.name}: UVP-Referenz bearbeiten`} onClick={()=>openProduct(m)}><Tag size={16}/></button></>}<a className="icon-button" href={m.url} target="_blank" rel="noreferrer" title="Bestands-Datenquelle öffnen" aria-label={`${m.name}: Datenquelle`}><ExternalLink size={16}/></a>{owner&&<button className="icon-button" title="Artikel entfernen" onClick={()=>void action({action:"delete",id:m.id}).catch(()=>{})}><Trash2 size={16}/></button>}</div>
          </div>)}</div>}</>}
        </TabsContent>
        <TabsContent value="history">
          <div className="section-heading"><h2>Filialmeldungen im UVP-Rahmen</h2><span className="tiny">{state.drops.length} Einträge</span></div>
          {!state.drops.length?<div className="empty-state"><Clock size={36}/><h3>Noch keine Filialangebote bis UVP erkannt</h3></div>:<div className="drop-list">{state.drops.map(d=><article key={d.id}><div className="drop-time">{date(d.created_at)}<span className={`badge ${d.uvp_price&&d.uvp_source?"available":"unknown"}`}>{d.kind==="price"?"Jetzt im UVP-Rahmen":d.kind==="first"?"Erstmals beobachtet":"Wieder verfügbar"}</span></div><strong>{d.title}</strong><p>{d.retailer} · {d.location}</p>{d.branches.map(b=><p key={b.key}>{b.name}: {euros(b.price)} · Referenz {euros(d.uvp_price)}</p>)}{!d.uvp_source&&<p className="tiny">Älterer Eintrag ohne UVP-Beleg</p>}<span className="tiny">Beobachtungszeit, kein bestätigter Wareneingangszeitpunkt</span></article>)}</div>}
        </TabsContent>
        <TabsContent value="push"><div className="push-layout"><section>
          <div className="section-heading"><h2>Push aufs iPhone</h2><Smartphone size={23}/></div><div className="push-identity"><img src="/icon-192.png" width="64" height="64" alt="Drop Radar App"/><div><strong>{sub?"Dieses Gerät ist verbunden":"Dieses Gerät verbinden"}</strong><p>Filialbestand oder geprüfter frischer Fundhinweis im hinterlegten UVP-Rahmen. Meldungsquelle wird genannt.</p></div></div>
          {!standalone&&<div className="install-note"><strong>Auf dem iPhone</strong><p>In Safari zum Home-Bildschirm hinzufügen, dort starten und Push erlauben.</p></div>}
          {sub?<div className="button-row"><button className="primary" onClick={()=>void testPush()} disabled={pushBusy}><Bell size={17}/>Testmeldung senden</button><button className="secondary" onClick={()=>void disablePush()} disabled={pushBusy}><BellOff size={17}/>Trennen</button></div>:<button className="primary" onClick={()=>void push()} disabled={!pushSupported||pushBusy||!state.publicKey}><Bell size={17}/>{pushBusy?"Wird verbunden…":"Push erlauben"}</button>}
          {!state.publicKey&&<p className="section-note">Push-Schlüssel werden noch eingerichtet.</p>}
          {!pushSupported&&<p className="section-note">Push ist in diesem Browser noch nicht verfügbar.</p>}
          <p className="section-note">{scheduled?`Hintergrundprüfung alle ${state.schedule!.interval} Minuten. Bestandsmeldungen treffen frühestens nach der nächsten Prüfung ein.`:"Hintergrundprüfung noch nicht verbunden. Bei geschlossener App werden derzeit keine neuen Bestände erkannt."}</p>
        </section><section className="settings"><div className="section-heading"><h2>Radar-Status</h2><SlidersHorizontal size={22}/></div><div className="setting-row"><div><strong>Automatisch prüfen</strong><span>Vorgemerkte Bestandsquellen</span></div><Switch disabled={!owner} checked={state.settings.auto} onCheckedChange={auto=>void saveSettings({...state.settings,auto})} aria-label="Automatische Prüfung"/></div><div className="setting-row"><strong>Prüfintervall</strong><Select disabled={!owner} value={String(state.settings.interval)} onValueChange={v=>void saveSettings({...state.settings,interval:Number(v)})}><SelectTrigger className="interval-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="120">2 Minuten</SelectItem><SelectItem value="300">5 Minuten</SelectItem><SelectItem value="600">10 Minuten</SelectItem></SelectContent></Select></div><div className="scope-note"><MapPin size={18}/><div><strong>Alle 10 Händler · nur Filialen</strong><p>Leipzig und die vorgesehene Smyths-Suche. Nur vor Ort vorhandene Neuware, keine Versandangebote oder Bestellungen zur späteren Abholung.</p></div></div><div className="scope-note"><Tag size={18}/><div><strong>UVP-Preisprüfung verpflichtend</strong><p>Filialpreis höchstens die eigene belegte UVP-Referenz des Artikels, auch günstiger. Unbekannte Preise und Angebote darüber lösen keinen Alarm aus. Referenzen werden nicht automatisch als Hersteller-UVP verifiziert.</p></div></div><div className="scope-note"><Clock size={18}/><div><strong>Wareneingang: nicht angebunden</strong><p>Ein Bestandswechsel ist kein Beleg für eine neue Lieferung.</p></div></div></section></div></TabsContent>
      </Tabs>
      <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="product-dialog"><DialogHeader><DialogTitle>{editing?"UVP-Referenz bearbeiten":"Artikel vormerken"}</DialogTitle><DialogDescription>{editing?editing.name:"Pokémon Sammelkarten · 30 Jahre"}</DialogDescription></DialogHeader><form key={editing?.id||"new"} onSubmit={saveProduct} className="product-form">{!editing&&<><label>Produktname<input name="name" required minLength={3} maxLength={180} placeholder="Pokémon 30 Jahre Boosterbundle"/></label><label>Bestands-Datenquelle<input name="url" type="url" required placeholder="https://…"/></label></>}<label>Eigene UVP-Referenz (EUR)<input name="uvpPrice" type="number" min="0.01" max="10000" step="0.01" inputMode="decimal" defaultValue={editing?.uvp_price??""}/></label><label>UVP-Beleg für genau diesen Artikel<input name="uvpSource" type="url" maxLength={2000} defaultValue={editing?.uvp_source??""} placeholder="https://…"/></label><p className="tiny">Ohne Preis und Beleg: UVP-Referenz offen, kein UVP-Alarm.</p>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={saving}><Check size={17}/>{saving?"Wird gespeichert…":"Speichern"}</button></form></DialogContent></Dialog>
      <footer><span>DROP RADAR · NUR FILIALEN</span><a href={showcaseDE} target="_blank" rel="noreferrer">Set-Informationen <ExternalLink size={13}/></a></footer>
    </main>
  </div>;
}
