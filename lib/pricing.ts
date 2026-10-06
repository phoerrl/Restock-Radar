import type { BranchStock, Result } from "./retail.ts";

export type UvpReference = { uvp_price:number|null; uvp_source:string|null };
export type PriceState = "eligible"|"above"|"missing-price"|"missing-reference";

export function euroPrice(value:unknown):number|null {
  if(typeof value!=="number" && typeof value!=="string")return null;
  if(typeof value==="string" && !/^\d+(?:\.\d{1,2})?$/.test(value))return null;
  const n=Number(value), cents=Math.round(n*100);
  return Number.isFinite(n) && n>0 && n<=10000 && Math.abs(n*100-cents)<0.000001 ? cents/100 : null;
}
export function referenceUrl(value:string) {
  const url=new URL(value);
  if(url.protocol!=="https:" || url.username || url.password || (url.port && url.port!=="443"))throw new Error("Der UVP-Beleg muss eine HTTPS-Adresse ohne Zugangsdaten sein.");
  return url.href;
}
export function validateReference(price:number|null,source:string|null):UvpReference {
  if(price===null && !source)return {uvp_price:null,uvp_source:null};
  if(euroPrice(price)===null || !source)throw new Error("Bitte UVP in EUR und den Beleg für genau diesen Artikel gemeinsam angeben.");
  return {uvp_price:euroPrice(price),uvp_source:referenceUrl(source)};
}
export function priceState(price:number|null,reference:UvpReference):PriceState {
  if(euroPrice(reference.uvp_price)===null || !reference.uvp_source)return "missing-reference";
  try{referenceUrl(reference.uvp_source);}catch{return "missing-reference";}
  if(euroPrice(price)===null)return "missing-price";
  return Math.round(price!*100)<=Math.round(reference.uvp_price!*100)?"eligible":"above";
}
export function readBranches(value:string|null):BranchStock[] {
  try{const rows=JSON.parse(value||"[]");return Array.isArray(rows)?rows:[];}catch{return [];}
}
export function uvpTransition(result:Result,previous:string|null,reference:UvpReference) {
  let stocks:Record<string,string>={}, eligible:Record<string,boolean>={};
  try {
    const old=JSON.parse(previous||"null");
    if(["store-v1","store-uvp-v1"].includes(old?.scope)) {
      stocks={...old.stocks};
      if(old.scope==="store-uvp-v1")eligible={...old.eligible};
    }
  }catch{}
  const observed=result.channel==="store"?result.branches:[];
  const changes:(BranchStock & {kind:"first"|"restock"|"price"})[]=[];
  for(const branch of observed) {
    const qualifies=branch.status==="available" && branch.quantity>0 && priceState(branch.price,reference)==="eligible";
    if(qualifies && eligible[branch.key]!==true)changes.push({...branch,kind:stocks[branch.key]==="available"?"price":stocks[branch.key]?"restock":"first"});
    stocks[branch.key]=branch.status;eligible[branch.key]=qualifies;
  }
  // Missing or blocked responses retain the baseline; unknown prices never qualify.
  return {changes,value:observed.length?JSON.stringify({scope:"store-uvp-v1",stocks,eligible}):previous};
}
