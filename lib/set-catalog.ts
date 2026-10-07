export const catalogCheckedAt = "2026-10-07T05:04:02Z";
export const showcaseDE = "https://www.pokemon.com/de/news/pokemon-sammelkartenspiel-produktvorschau-30-jahre";
export const showcaseUS = "https://www.pokemon.com/us/news/pokemon-tcg-30th-celebration-product-showcase";
const gallery = "https://www.pokemon.com/de/pokemon-sammelkartenspiel/Produktgalerie/";
const smyths = "https://www.smythstoys.com/de/de-de/spielzeug/action-spielzeug/pokemon/pokemon-karten/";
const vedes = "https://www.vedes.com/p/";

export type CatalogSource = { retailer:string; url:string; articleId:string; monitorId:string; };
export type SetProduct = {
  id:string; name:string; family:string; variants:string[]; boosters:number|null;
  gtin:string|null; gtinSource:string|null; image:string|null; officialUrl:string;
  release:{ deWindow:string; deDate:string|null; deSource:string; internationalDate:string|null; note:string; inTrade:boolean; };
  sources:CatalogSource[];
};
const source = (retailer:string, path:string, articleId:string, monitorId:string):CatalogSource => ({
  retailer, articleId, monitorId,
  url:retailer==="Smyths Toys"?smyths+path:retailer==="VEDES"?vedes+path:path,
});
const image = (path:string)=>"https://vedes-15178.kxcdn.com/media/getproductmainimage/searchResult/"+path;
const deRelease = (deDate:string|null, deSource:string, internationalDate:string|null, inTrade=true, deWindow="Q4 2026", note="Verkaufsfreigabe im deutschen Händlerkatalog; keine Filial-Lieferzusage."):SetProduct["release"]=>({deDate,deSource,internationalDate,inTrade,deWindow,note:deDate&&deWindow==="Q4 2026"&&deDate<"2026-10-01"?"Deutsche Herstellervorschau nennt Q4, Händlerkatalog die frühere Verkaufsfreigabe ab 16.09.2026. Keine bestätigte Anlieferung an eine Filiale.":note});
const upcoming = (internationalDate:string):SetProduct["release"]=>deRelease(null,showcaseDE,internationalDate,false,"Q4 2026","Genauer Tag bisher nur auf der US-Herstellerseite belegt. Deutschland: Q4, kein bestätigter Filialtermin.");

export const setProducts:SetProduct[] = [
  {id:"etb",name:"Top-Trainer-Box",family:"Top-Trainer-Box",variants:["Nidorina"],boosters:9,gtin:"0196214144842",gtinSource:vedes+"pok-30-jahre-top-trainer-box-10-10447-103-61218599",image:image("61218599/61218599_196214144842_H.jpg"),officialUrl:gallery+"top-trainer-box-30-jahre",release:deRelease("2026-09-16",vedes+"pok-30-jahre-top-trainer-box-10-10447-103-61218599","2026-09-16",true,"Q3 2026"),sources:[
    source("Smyths Toys","pokemon-karten-top-trainer-box-30-jahre-edition/p/264148","264148","smyths-etb"),
    source("GALERIA","https://www.galeria.de/produkt/amigo-pokmon-sammelkartenspiel-top-trainer-box-30-jahre-0196214144842","0196214144842","galeria-etb"),
    source("VEDES","pok-30-jahre-top-trainer-box-10-10447-103-61218599","61218599","vedes-etb"),
  ]},
  {id:"bundle",name:"Boosterbundle",family:"Boosterbundle",variants:[],boosters:6,gtin:"0196214145245",gtinSource:null,image:image("61219366/61219366_196214145245_H_14524_frontshot.jpg"),officialUrl:gallery+"boosterbundle-30-jahre",release:deRelease(null,gallery+"boosterbundle-30-jahre","2026-10-02",true,"Oktober 2026","Verkauf durch Paddys Kassenbeleg nachgewiesen. 02.10. ist der US-Herstellertermin, nicht aus dem Beleg abgelesen."),sources:[
    source("Saturn","https://www.saturn.de/de/product/_pokemon-14524-boosterbundle-30-jahre-3067917.html","3067917","saturn-bundle"),
    source("VEDES","pokemon-sammelkartenspiel-boosterbundle-30-jahre-14524-61219366","61219366","vedes-bundle"),
  ]},
  {id:"mini-tin",name:"Mini-Tin",family:"Mini-Tin",variants:["10 Motive, Tag und Nacht"],boosters:2,gtin:"0196214146310",gtinSource:null,image:image("61219374/61219374_196214146310_H_14631_frontshot.jpg"),officialUrl:gallery+"mini-tin-box-30-jahre",release:deRelease(null,gallery+"mini-tin-box-30-jahre","2026-10-02",true,"Oktober 2026","Verkauf durch Paddys Kassenbeleg nachgewiesen. Gemeinsame Sortimentsnummer, keine erfundenen EANs je Motiv."),sources:[
    source("Saturn","https://www.saturn.de/de/product/_pokemon-14631-mini-tin-30-jahre-3067922.html","3067922","saturn-mini-tin"),
    source("VEDES","pokemon-sammelkartenspiel-mini-tin-30-jahre-14631-61219374","61219374","vedes-mini-tin"),
  ]},
  {id:"blister",name:"2er-Pack-Blister",family:"Blister",variants:["Evoli"],boosters:2,gtin:"0196214152274",gtinSource:vedes+"pok-30-jahre-2-pack-blister-10-10666-101-61218602",image:image("61218602/61218602_196214152274_H.jpg"),officialUrl:showcaseDE,release:deRelease("2026-09-16",vedes+"pok-30-jahre-2-pack-blister-10-10666-101-61218602",null,true,"Q3 2026"),sources:[
    source("Smyths Toys","pokemon-karten-blister-pack-2er-set-30-jahre-edition/p/264181","264181","smyths-blister"),
    source("VEDES","pok-30-jahre-2-pack-blister-10-10666-101-61218602","61218602","vedes-blister"),
  ]},
  {id:"tech-sticker",name:"Tech-Sticker-Kollektion",family:"Tech-Sticker",variants:["Alola-Kokowei","Lucario"],boosters:3,gtin:"0196214144989",gtinSource:vedes+"pok-30-jahre-tech-sticker-koll-10-10449-103-61218653",image:image("61218653/61218653_196214144989_H.jpg"),officialUrl:gallery+"tech-sticker-kollektion-30-jahre",release:deRelease(null,"https://blog.vedes.com/p/pokemon-sammelkarten-30-jahre-karten-booster-produkte-2026-im-ueberblick/","2026-09-16",true,"Q4 2026","Deutsche Herstellerseite: Q4; deutscher Händler beschreibt sie bereits als erhältlich. EAN für das Sortiment, nicht je Motiv."),sources:[
    source("Smyths Toys","pokemon-tech-sticker-kollektion-30-jahre-edition-sortiert/p/264175","264175","smyths-tech-sticker"),
    source("VEDES","pok-30-jahre-tech-sticker-koll-10-10449-103-61218653","61218653","vedes-tech-sticker"),
  ]},
  {id:"poster",name:"Poster-Kollektion",family:"Poster",variants:["Arktos, Zapdos und Lavados"],boosters:3,gtin:"0196214147249",gtinSource:vedes+"pok-30-jahre-poster-kollektion-10-10467-104-61218645",image:image("61218645/61218645_196214147249_H.jpg"),officialUrl:gallery+"poster-kollektion-30-jahre",release:deRelease("2026-09-16",vedes+"pok-30-jahre-poster-kollektion-10-10467-104-61218645","2026-09-16"),sources:[
    source("Smyths Toys","pokemon-poster-kollektion-30-jahre-edition/p/264190","264190","smyths-poster"),
    source("VEDES","pok-30-jahre-poster-kollektion-10-10467-104-61218645","61218645","vedes-poster"),
  ]},
  {id:"feelinara-box",name:"Feelinara-ex Kollektion",family:"ex-Kollektion",variants:["Feelinara-ex"],boosters:4,gtin:"0196214147119",gtinSource:vedes+"pok-30-jahre-feelinara-ex-kollekt-10-10463-110-61218611",image:image("61218611/61218611_196214147119_H.jpg"),officialUrl:gallery+"kollektionen-30-jahre-feelinara-ex-und-quajutsu-ex",release:deRelease("2026-09-16",vedes+"pok-30-jahre-feelinara-ex-kollekt-10-10463-110-61218611","2026-09-16"),sources:[
    source("Smyths Toys","pokemon-30-jahre-edition-feelinara-ex/p/264162","264162","smyths-feelinara"),
    source("VEDES","pok-30-jahre-feelinara-ex-kollekt-10-10463-110-61218611","61218611","vedes-feelinara"),
  ]},
  {id:"quajutsu-box",name:"Quajutsu-ex Kollektion",family:"ex-Kollektion",variants:["Quajutsu-ex"],boosters:4,gtin:"0196214147171",gtinSource:vedes+"pok-30-jahre-quajutsu-ex-kollektion-10-10463-116-61218629",image:image("61218629/61218629_196214147171_H.jpg"),officialUrl:gallery+"kollektionen-30-jahre-feelinara-ex-und-quajutsu-ex",release:deRelease("2026-09-16",vedes+"pok-30-jahre-quajutsu-ex-kollektion-10-10463-116-61218629","2026-09-16"),sources:[
    source("Smyths Toys","pokemon-30-jahre-edition-quajutsu-ex/p/264149","264149","smyths-quajutsu"),
    source("VEDES","pok-30-jahre-quajutsu-ex-kollektion-10-10463-116-61218629","61218629","vedes-quajutsu"),
  ]},
  {id:"tin-tag",name:"Tin-Box Tag",family:"Große Tin",variants:["Feelinara-ex"],boosters:4,gtin:"0196214146983",gtinSource:vedes+"pok-30-jahre-tin-1-tag-10-10466-110-61218661",image:image("61218661/61218661_196214146983_H.jpg"),officialUrl:"https://www.pokemon.com/de/news/wirf-einen-blick-auf-alle-pokemon-sammelkartenspiel-produkte-die-im-oktober-2026-veroeffentlicht-werden",release:deRelease("2026-09-16",vedes+"pok-30-jahre-tin-1-tag-10-10466-110-61218661",null),sources:[
    source("Smyths Toys","pokemon-tin-box-mit-feelinara-ex-30-jahre-edition/p/264163","264163","smyths-tin-tag"),
    source("VEDES","pok-30-jahre-tin-1-tag-10-10466-110-61218661","61218661","vedes-tin-tag"),
  ]},
  {id:"tin-nacht",name:"Tin-Box Nacht",family:"Große Tin",variants:["Quajutsu-ex"],boosters:4,gtin:"0196214147041",gtinSource:vedes+"pok-30-jahre-tin-2-nacht-10-10466-116-61218670",image:image("61218670/61218670_196214147041_H.jpg"),officialUrl:"https://www.pokemon.com/de/news/wirf-einen-blick-auf-alle-pokemon-sammelkartenspiel-produkte-die-im-oktober-2026-veroeffentlicht-werden",release:deRelease("2026-09-16",vedes+"pok-30-jahre-tin-2-nacht-10-10466-116-61218670",null),sources:[
    source("Smyths Toys","pokemon-tin-box-mit-quajutsu-ex-30-jahre-edition/p/264164","264164","smyths-tin-nacht"),
    source("VEDES","pok-30-jahre-tin-2-nacht-10-10466-116-61218670","61218670","vedes-tin-nacht"),
  ]},
  {id:"ordner",name:"Ordner-Kollektion",family:"Ordner-Kollektion",variants:[],boosters:5,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"ordner-kollektion-30-jahre",release:upcoming("2026-12-04"),sources:[source("Smyths Toys","pokemon-karten-sammelordner-30-jahre-edition/p/264129","264129","smyths-ordner")]},
  {id:"deck-psiana",name:"Kampfdeck Psiana-ex",family:"Kampfdeck",variants:["Psiana-ex"],boosters:0,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"kampfdeck-30-jahre-psiana-ex-und-30-jahre-nachtara-ex",release:upcoming("2026-10-30"),sources:[]},
  {id:"deck-nachtara",name:"Kampfdeck Nachtara-ex",family:"Kampfdeck",variants:["Nachtara-ex"],boosters:0,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"kampfdeck-30-jahre-psiana-ex-und-30-jahre-nachtara-ex",release:upcoming("2026-10-30"),sources:[]},
  {id:"ditto",name:"Premium-Kollektion Ditto",family:"Premium-Kollektion",variants:["Ditto"],boosters:8,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"premium-kollektion-30-jahre-ditto",release:upcoming("2026-11-06"),sources:[]},
  {id:"upc-tag",name:"Ultra-Premium-Kollektion Tag",family:"Ultra-Premium",variants:["Pikachu-ex und Psiana-ex"],boosters:30,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"ultra-premium-kollektionen-30-jahre-tag-nacht",release:upcoming("2026-11-06"),sources:[]},
  {id:"upc-nacht",name:"Ultra-Premium-Kollektion Nacht",family:"Ultra-Premium",variants:["Pikachu-ex und Nachtara-ex"],boosters:30,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"ultra-premium-kollektionen-30-jahre-tag-nacht",release:upcoming("2026-11-06"),sources:[]},
  {id:"figure-mew",name:"Figuren-Kollektion Mew",family:"Figuren-Kollektion",variants:["Mew"],boosters:5,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"figuren-kollektion-30-jahre",release:upcoming("2026-11-06"),sources:[]},
  {id:"figure-mewtu",name:"Figuren-Kollektion Mewtu",family:"Figuren-Kollektion",variants:["Mewtu"],boosters:5,gtin:null,gtinSource:null,image:null,officialUrl:gallery+"figuren-kollektion-30-jahre",release:upcoming("2026-11-06"),sources:[]},
  {id:"knock-out",name:"Knock-out-Kollektion",family:"Knock-out",variants:["Evoli"],boosters:2,gtin:null,gtinSource:null,image:null,officialUrl:showcaseDE,release:deRelease(null,showcaseDE,"2026-09-16",false,"Q3 2026","In der deutschen Vorschau angekündigt; eigene deutsche Handelsnummer und Abgrenzung zum Evoli-Blister noch nicht belegt."),sources:[]},
];

export function canonicalGtin(value:string):string|null {
  if(!/^\d{12,13}$/.test(value))return null;
  const code=value.length===12?"0"+value:value;
  const sum=[...code.slice(0,-1)].reduce((total,digit,index)=>total+Number(digit)*(index%2?3:1),0);
  return (10-sum%10)%10===Number(code.at(-1))?code:null;
}
export function productByGtin(value:string) {
  const code=canonicalGtin(value);
  return code?setProducts.find(product=>product.gtin===code):undefined;
}
export function catalogSeeds() {
  return setProducts.flatMap(product=>product.sources.map(s=>({
    id:s.monitorId,name:`Pokémon 30 Jahre ${product.name}`,retailer:s.retailer,url:s.url,kind:"product",
  })));
}
