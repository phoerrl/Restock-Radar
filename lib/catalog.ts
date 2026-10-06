import type { Store } from "./types";
import { additionalStores, storePositions } from "./store-locations.ts";
import { normalizePlace } from "./place.ts";

export const retailers = [
  {name:"EDEKA",locator:"https://www.edeka.de/maerkte/ballungsgebiete/leipzig/"},
  {name:"GALERIA",locator:"https://www.galeria.de/filialen"},
  {name:"Hugendubel",locator:"https://www.hugendubel.de/de/branch"},
  {name:"Lidl",locator:"https://www.lidl.de/s/de-DE/filialen/"},
  {name:"MediaMarkt",locator:"https://www.mediamarkt.de/de/store"},
  {name:"Müller",locator:"https://www.mueller.de/storefinder/"},
  {name:"REWE",locator:"https://www.rewe.de/marktsuche/leipzig/"},
  {name:"Rossmann",locator:"https://www.rossmann.de/de/filialen/sachsen/leipzig/index.html"},
  {name:"Smyths Toys",locator:"https://www.smythstoys.com/de/de-de/store-finden"},
  {name:"Thalia",locator:"https://www.thalia.de/buchhandlung/uebersichtsseite?suche=Leipzig"},
];
export const seeds = [
  { id: "smyths-feelinara", name: "30 Jahre Feelinara-ex Kollektion", retailer: "Smyths Toys", kind: "product", url: "https://www.smythstoys.com/de/de-de/spielzeug/action-spielzeug/pokemon/pokemon-karten/pokemon-30-jahre-edition-feelinara-ex/p/264162" },
];
const verifiedStores:Store[] = [
  { retailer:"EDEKA", name:"Voßler", address:"Pestalozzistraße 72, 04178 Leipzig", url:"https://www.edeka.de/eh/nordbayern-sachsen-th%C3%BCringen/edeka-vo%C3%9Fler-pestalozzistra%C3%9Fe-72/index/" },
  { retailer:"GALERIA", name:"Leipzig Neumarkt", address:"Neumarkt 1, 04109 Leipzig", url:"https://www.galeria.de/filialen/l/leipzig/neumarkt-1/001559" },
  { retailer:"Lidl", name:"Höfe am Brühl", address:"Brühl 1, 04109 Leipzig", url:"https://www.lidl.de/s/de-DE/filialen/leipzig/bruehl-1/" },
  { retailer:"Müller", name:"Petersstraße", address:"Petersstraße 28, 04109 Leipzig", phone:"0341127190", url:"https://www.mueller.de/storefinder/" },
  { retailer:"REWE", name:"Hauptbahnhof", address:"Willy-Brandt-Platz 4, 04103 Leipzig", phone:"03419617478", url:"https://www.rewe.de/marktseite/leipzig/4040174/rewe-markt-willy-brandt-platz-4/" },
  { retailer:"Rossmann", name:"Petersstraße", address:"Petersstraße 44, 04109 Leipzig", url:"https://www.rossmann.de/de/filialen/sachsen/leipzig/petersstr--44.html" },
  { retailer:"Thalia", name:"Karl-Liebknecht-Straße", address:"Karl-Liebknecht-Str. 8–14, 04107 Leipzig", phone:"03412131605", url:"https://www.thalia.de/buchhandlung/5629" },
  { retailer:"Smyths Toys", name:"Leipzig Paunsdorf Center", address:"Paunsdorfer Allee, 04329 Leipzig", url:"https://www.smythstoys.com/de/de-de/storefinder/storedetails/leipzig-paunsdorf-center" },
  { retailer:"Smyths Toys", name:"Leipzig Günthersdorf", address:"EKZ NOVA, 06237 Leuna", url:"https://www.smythstoys.com/de/de-de/storefinder/storedetails/leipzig" },
  { retailer:"Thalia", name:"Grimmaische Straße", address:"Grimmaische Str. 10, 04109 Leipzig", phone:"034133975000", url:"https://www.thalia.de/buchhandlung/uebersichtsseite?suche=Leipzig" },
  { retailer:"Thalia", name:"Allee-Center", address:"Ludwigsburger Str. 9, 04209 Leipzig", phone:"03414241070", url:"https://www.thalia.de/buchhandlung/uebersichtsseite?suche=Leipzig" },
  { retailer:"Thalia", name:"Paunsdorf Center", address:"Paunsdorfer Allee 1, 04329 Leipzig", phone:"034133975521", url:"https://www.thalia.de/buchhandlung/uebersichtsseite?suche=Leipzig" },
  { retailer:"Hugendubel", name:"Petersstraße", address:"Petersstraße 12–14, 04109 Leipzig", url:"https://www.hugendubel.de/de/branch?branchId=9816" },
  { retailer:"Hugendubel", name:"Höfe am Brühl", address:"Brühl 1, 04109 Leipzig", url:"https://www.hugendubel.de" },
  { retailer:"Hugendubel", name:"Paunsdorf Center", address:"Paunsdorfer Allee 1, 04329 Leipzig", url:"https://www.hugendubel.de" },
  { retailer:"MediaMarkt", name:"Höfe am Brühl", address:"Brühl 1, 04109 Leipzig", url:"https://www.mediamarkt.de/de/store/leipzig-hoefe-am-bruehl-1229" },
];
export const stores:Store[] = [...verifiedStores.map(s=>({...s,position:storePositions.find(p=>p.retailer===s.retailer&&normalizePlace(p.address)===normalizePlace(s.address))?.position})),...additionalStores];
