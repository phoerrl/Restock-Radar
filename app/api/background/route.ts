import { snapshot, setMeta } from "@/lib/radar";
import { z } from "zod";
import { runBackground } from "@/lib/background";
export const dynamic="force-dynamic";
export async function POST(){try{return Response.json(await runBackground());}catch{return Response.json({error:"Hintergrundprüfung fehlgeschlagen"},{status:503});}}
export async function GET(){try{return Response.json(await snapshot());}catch{return Response.json({error:"Radar nicht erreichbar"},{status:503});}}
export async function PUT(request:Request){
  try{const s=z.object({enabled:z.boolean(),interval:z.union([z.literal(2),z.literal(5),z.literal(10)])}).parse(await request.json());await setMeta("settings",JSON.stringify({auto:s.enabled,interval:s.interval*60}));return Response.json({ok:true});}catch{return Response.json({error:"Ungültiger Zeitplan"},{status:400});}
}
