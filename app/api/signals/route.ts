import { signalsSnapshot, saveReport, refreshCommunity, dismissCandidate } from "@/lib/signals-store";
import { z } from "zod";
export const dynamic="force-dynamic";
export const reportSchema=z.object({
  retailer:z.string().max(40),address:z.string().min(8).max(200).nullable(),product:z.string().min(3).max(180),kind:z.enum(["seen","restock","empty","announced"]),source:z.enum(["personal","staff","community","secondhand"]),time_precision:z.enum(["minute","day"]),
  observed_at:z.number().int(),expected_at:z.number().int().nullable(),source_url:z.string().url().max(2000).nullable(),note:z.string().max(1000),price:z.number().positive().max(10000).nullable(),uvp_price:z.number().positive().max(10000).nullable(),uvp_source:z.string().url().max(2000).nullable(),
}).strict();
const input=z.discriminatedUnion("action",[
  z.object({action:z.literal("save"),report:reportSchema,id:z.string().max(2200).optional()}).strict(),
  z.object({action:z.literal("refresh")}).strict(),
  z.object({action:z.literal("dismiss"),id:z.string().max(2200)}).strict(),
]);
export async function GET(){try{return Response.json(await signalsSnapshot(),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Hinweisspeicher nicht erreichbar."},{status:503});}}
export async function POST(request:Request){
  const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Nicht erlaubter Ursprung"},{status:403});
  try{
    if(Number(request.headers.get("content-length"))>12000)throw new Error("Anfrage zu groß.");const body=await request.text();if(body.length>12000)throw new Error("Anfrage zu groß.");
    const data=input.parse(JSON.parse(body));
    if(data.action==="save")await saveReport(data.report,data.id);
    if(data.action==="dismiss")await dismissCandidate(data.id);
    const result=data.action==="refresh"?await refreshCommunity():null;
    return Response.json({...await signalsSnapshot(),result});
  }catch(error){return Response.json({error:error instanceof z.ZodError?"Bitte die Meldungsfelder prüfen.":error instanceof Error?error.message:"Aktion fehlgeschlagen."},{status:400});}
}
