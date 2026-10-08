import { z } from "zod";
import { stores } from "./catalog.ts";
import { normalizePlace } from "./place.ts";
import { isSet } from "./product-set.ts";
import type { Observation } from "./intelligence.ts";

const snowflake=z.string().regex(/^\d{17,20}$/);
const channelSchema=z.object({guildId:snowflake,channelId:snowflake,label:z.string().min(1).max(80)}).strict();
export type DiscordChannel=z.infer<typeof channelSchema>;
export function discordChannels(vars:Record<string,string|undefined>):DiscordChannel[] {
  if(vars.DISCORD_IMPORT_ENABLED!=="true"||!vars.DISCORD_BOT_TOKEN)return [];
  try{return z.array(channelSchema).min(1).max(3).parse(JSON.parse(vars.DISCORD_CHANNELS||"[]"));}catch{return [];}
}
const messageSchema=z.object({id:snowflake,channel_id:snowflake,timestamp:z.string().datetime({offset:true}),type:z.number().int(),content:z.string().max(8000).optional(),embeds:z.array(z.object({title:z.string().max(1000).optional(),description:z.string().max(8000).optional(),fields:z.array(z.object({name:z.string().max(300),value:z.string().max(2000)})).max(25).optional()})).max(10).optional()});

export function parseDiscordMessages(input:unknown,channel:DiscordChannel,now:number) {
  const rows=z.array(messageSchema).max(100).parse(input);
  if(rows.some(m=>m.channel_id!==channel.channelId))throw new Error("Discord lieferte einen anderen Kanal.");
  const messages=rows.filter(m=>[0,19].includes(m.type));
  const readable=messages.length===0||messages.some(m=>!!m.content?.trim()||!!m.embeds?.length);
  const candidates:Omit<Observation,"created_at">[]=[];
  for(const m of messages){
    const published=Date.parse(m.timestamp);
    if(published>now||now-published>7*86400000)continue;
    const text=[m.content,...(m.embeds||[]).flatMap(e=>[e.title,e.description,...(e.fields||[]).map(f=>`${f.name}: ${f.value}`)])].filter(Boolean).join(" ");
    const normal=normalizePlace(text);
    if(!isSet(text)||!/filial|regal|vorort|instore|laden|einsortiert/.test(normal)||!/(leipzig|paunsdorf|gunthersdorf|guenthersdorf)/.test(normal))continue;
    const mentioned=[...new Set(stores.map(s=>s.retailer))].filter(r=>normal.includes(normalizePlace(r))||(r==="Smyths Toys"&&normal.includes("smyths")));
    for(const retailer of mentioned){
      const matches=stores.filter(s=>s.retailer===retailer&&normal.includes(normalizePlace(s.name)));
      const url=`https://discord.com/channels/${channel.guildId}/${channel.channelId}/${m.id}`;
      // Only a minimal candidate is stored, never usernames, IDs, attachments or full chat text.
      candidates.push({id:`discord:${channel.channelId}:${m.id}:${retailer}`,retailer,address:matches.length===1?matches[0].address:null,product:"Pokémon 30 Jahre · Artikel zu prüfen",kind:/ausverkauft|leer(?:es|e)?regal/.test(normal)?"empty":"seen",source:"community",time_precision:"day",observed_at:published,expected_at:null,source_url:url,note:"Hinweis aus einem freigegebenen Discord-Kanal. Nachrichtenzeit ist keine bestätigte Beobachtungszeit. Artikel, Ort, Uhrzeit und Preis am Original prüfen.",price:null,uvp_price:null,uvp_source:null,reviewed:0,push_state:"unreviewed"});
    }
  }
  return {candidates,entries:rows.length,readable,saturated:rows.length===100};
}

export class DiscordReadError extends Error {
  retrySeconds:number;
  constructor(message:string,retrySeconds=1800){super(message);this.retrySeconds=retrySeconds;}
}
export async function fetchDiscordMessages(channel:DiscordChannel,token:string,now=Date.now()) {
  channelSchema.parse(channel);
  if(!token||token.length>300||/[\r\n]/.test(token))throw new DiscordReadError("Bot-Zugang fehlt oder ist ungültig.");
  const response=await fetch(`https://discord.com/api/v10/channels/${channel.channelId}/messages?limit=100`,{headers:{Authorization:`Bot ${token}`,Accept:"application/json"},redirect:"manual",signal:AbortSignal.timeout(10000)});
  if(response.status===429){const retry=Number(response.headers.get("retry-after"));throw new DiscordReadError("Discord begrenzt die Abfrage; erneuter Versuch nach Wartezeit.",Number.isFinite(retry)?Math.min(86400,Math.max(120,retry)):1800);}
  if(!response.ok)throw new DiscordReadError([401,403,404].includes(response.status)?"Bot-Zugang oder Kanal-Leserechte fehlen.":"Discord-Abfrage fehlgeschlagen.");
  const reader=response.body?.getReader();if(!reader)throw new DiscordReadError("Discord-Antwort ist leer.");
  let text="",size=0;const decoder=new TextDecoder();
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>750000)throw new DiscordReadError("Discord-Antwort ist zu groß.");text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
  try{return parseDiscordMessages(JSON.parse(text),channel,now);}catch{throw new DiscordReadError("Discord-Antwort nicht auswertbar; kein Bestand daraus bestätigt.");}
}
