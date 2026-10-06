import { scan } from "@/lib/radar";
import { z } from "zod";
import { signalsSnapshot, refreshCommunity, saveReport } from "@/lib/signals-store";
import { reportSchema } from "@/app/api/signals/route";
export const dynamic="force-dynamic";
const tool={name:"check_pokemon_drops",description:"Check saved Pokémon 30 Jahre physical branch stock sources. Only branch stock changes can send Web Push; online offers never qualify. This does not access or confirm goods receipts. Call once per run. Blocked sources are backed off automatically.",inputSchema:{type:"object",properties:{},additionalProperties:false}};
const readTool={name:"read_branch_signals",description:"Read branch-specific observations, source failures, opening hours and dated research. Historical reports are not current stock. Read before importing research to avoid duplicates.",inputSchema:{type:"object",properties:{},additionalProperties:false}};
const writeTool={name:"record_branch_observation",description:"Record one evidenced physical-store observation. Community reports require an HTTPS permalink. Use the actual observation date, not retrieval time. If the clock time is unknown, use time_precision day. Never infer store stock from an online offer or a general delivery rumor. Only precise fresh price-qualified reports can send a clearly labelled report alert.",inputSchema:{type:"object",properties:{report:{type:"object",properties:{retailer:{type:"string"},address:{type:["string","null"]},product:{type:"string"},kind:{enum:["seen","restock","empty","announced"]},source:{enum:["personal","staff","community","secondhand"]},time_precision:{enum:["minute","day"]},observed_at:{type:"integer"},expected_at:{type:["integer","null"]},source_url:{type:["string","null"]},note:{type:"string"},price:{type:["number","null"]},uvp_price:{type:["number","null"]},uvp_source:{type:["string","null"]}},required:["retailer","address","product","kind","source","time_precision","observed_at","expected_at","source_url","note","price","uvp_price","uvp_source"],additionalProperties:false},id:{type:"string"}},required:["report"],additionalProperties:false}};
export async function POST(req:Request){
  try{
    const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)return new Response("Not allowed",{status:403});
    if(Number(req.headers.get("content-length"))>12000)throw new Error("Request too large");
    const body=await req.text();if(body.length>12000)throw new Error("Request too large");
    const r=z.object({jsonrpc:z.literal("2.0"),id:z.union([z.string(),z.number()]).optional(),method:z.string(),params:z.object({protocolVersion:z.string().optional(),name:z.string().optional()}).passthrough().optional()}).parse(JSON.parse(body));
    let result:unknown;
    if(r.method==="initialize")result={protocolVersion:r.params?.protocolVersion || "2025-03-26",capabilities:{tools:{}},serverInfo:{name:"drop-radar",version:"1.0.0"}};
    else if(r.method==="notifications/initialized")return new Response(null,{status:202});
    else if(r.method==="tools/list")result={tools:[tool,readTool,writeTool]};
    else if(r.method==="tools/call" && r.params?.name===tool.name){const output={...await scan(true),community:await refreshCommunity(true)};result={content:[{type:"text",text:JSON.stringify(output)}]};}
    else if(r.method==="tools/call" && r.params?.name===readTool.name)result={content:[{type:"text",text:JSON.stringify(await signalsSnapshot())}]};
    else if(r.method==="tools/call" && r.params?.name===writeTool.name){const args=z.object({report:reportSchema,id:z.string().max(2200).optional()}).strict().parse(r.params.arguments);await saveReport(args.report,args.id);result={content:[{type:"text",text:JSON.stringify({saved:true})}]};}
    else return Response.json({jsonrpc:"2.0",id:r.id??null,error:{code:-32601,message:"Method not found"}},{status:400});
    return Response.json({jsonrpc:"2.0",id:r.id,result});
  }catch{return Response.json({jsonrpc:"2.0",id:null,error:{code:-32603,message:"Radar check failed"}},{status:500});}
}
