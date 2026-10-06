import { snapshot, scan, addMonitor, updateReference, database, subscribe, sendPush, setMeta } from "@/lib/radar";
import type { PushSubscription } from "@block65/webcrypto-web-push";
import { z } from "zod";
import { refreshCommunity, notifySignals } from "@/lib/signals-store";
export const dynamic="force-dynamic";
const input=z.discriminatedUnion("action",[
  z.object({action:z.literal("scan")}),
  z.object({action:z.literal("add"),name:z.string().min(3).max(180),url:z.string().url().max(2000),uvpPrice:z.number().positive().max(10000).nullable().optional(),uvpSource:z.string().url().max(2000).nullable().optional()}),
  z.object({action:z.literal("reference"),id:z.string().min(1),uvpPrice:z.number().positive().max(10000).nullable(),uvpSource:z.string().url().max(2000).nullable()}),
  z.object({action:z.literal("update"),id:z.string().min(1),enabled:z.boolean()}),
  z.object({action:z.literal("delete"),id:z.string().min(1)}),
  z.object({action:z.literal("settings"),settings:z.object({auto:z.boolean(),interval:z.number()})}),
  z.object({action:z.literal("subscribe"),subscription:z.object({endpoint:z.string().url(),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:z.string(),auth:z.string()})})}),
  z.object({action:z.literal("unsubscribe"),endpoint:z.string().url()}),
  z.object({action:z.literal("test-push"),endpoint:z.string().url()}),
]);
export async function GET(){try{return Response.json(await snapshot(),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Der Radar-Speicher ist gerade nicht erreichbar. Bitte erneut versuchen."},{status:503});}}
export async function POST(request:Request){
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin)return Response.json({error:"Nicht erlaubter Ursprung"},{status:403});
  try{
    if(Number(request.headers.get("content-length"))>12000)throw new Error("Anfrage zu groß");
    const body=await request.text();if(body.length>12000)throw new Error("Anfrage zu groß");
    const data=input.parse(JSON.parse(body));
    switch(data.action){
      case "scan":return Response.json({...await scan(),community:await refreshCommunity()});
      case "add": await addMonitor(data);break;
      case "reference":await updateReference(data.id,data.uvpPrice,data.uvpSource);break;
      case "update": {
        if(typeof data.id!=="string")throw new Error("Produkt fehlt");
        await database().prepare("UPDATE monitors SET enabled=?,version=version+1 WHERE id=? AND kind='product'").bind(data.enabled?1:0,data.id).run();break;
      }
      case "delete":await database().prepare("DELETE FROM monitors WHERE id=?").bind(String(data.id)).run();break;
      case "settings":{
        if(![120,300,600].includes(data.settings?.interval))throw new Error("Ungültiges Prüfintervall");
        await setMeta("settings",JSON.stringify({auto:!!data.settings.auto,interval:data.settings.interval}));break;
      }
      case "subscribe":await subscribe(data.subscription as PushSubscription);await notifySignals();break;
      case "unsubscribe":await database().prepare("DELETE FROM devices WHERE endpoint=?").bind(String(data.endpoint)).run();break;
      case "test-push":return Response.json(await sendPush({title:"Drop Radar ist verbunden",body:"Dein iPhone kann jetzt Drop-Meldungen empfangen.",url:"/",tag:"test"},String(data.endpoint)));
      default:throw new Error("Unbekannte Aktion");
    }
    return Response.json(await snapshot());
  }catch(error){return Response.json({error:error instanceof z.ZodError?"Ungültige Eingabe. Bitte Name und Datenquellen-URL prüfen.":error instanceof Error?error.message:"Aktion fehlgeschlagen"},{status:400});}
}
