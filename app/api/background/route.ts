import { scan, snapshot, setMeta } from "@/lib/radar";
import { z } from "zod";
import { refreshCommunity } from "@/lib/signals-store";
export const dynamic="force-dynamic";
// Shared personal radar. Sites enforces owner-private service access at dispatch.
export async function POST(){try{return Response.json({...await scan(true),community:await refreshCommunity(true)});}catch{return Response.json({error:"Hintergrundprüfung fehlgeschlagen"},{status:503});}}
export async function GET(){try{return Response.json(await snapshot());}catch{return Response.json({error:"Radar nicht erreichbar"},{status:503});}}
export async function PUT(request:Request){
  try{const s=z.object({enabled:z.boolean(),interval:z.number().int().min(1).max(60)}).parse(await request.json());await setMeta("schedule",JSON.stringify(s));return Response.json({ok:true});}catch{return Response.json({error:"Ungültiger Zeitplan"},{status:400});}
}
