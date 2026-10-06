import type { BranchStock } from "./retail";
import type { UvpReference } from "./pricing";
export type Monitor = UvpReference & {id:string;name:string;retailer:string;url:string;kind:string;enabled:number;max_price:number|null;status:string;detail:string;price:number|null;image:string|null;seller:string|null;channel:string;location:string|null;checked_at:number|null;next_check_at:number;last_stock:string|null;branches:BranchStock[]};
export type Drop=UvpReference & {id:string;title:string;url:string;retailer:string;price:number|null;channel:string;location:string|null;kind:string;created_at:number;push_state:string;branches:BranchStock[]};
export type Settings={auto:boolean;interval:number};
export type Store={retailer:string;name:string;address:string;phone?:string;url:string;directory_source?:"osm";position?:{lat:number;lng:number;source_url:string;precision:"shop"|"building";checked_at:string}};
export type Snapshot={monitors:Monitor[];drops:Drop[];retailers:{name:string;locator:string}[];stores:Store[];settings:Settings;publicKey:string|null;devices:number;lastScan:number|null;schedulerAt:number|null;schedule:{enabled:boolean;interval:number}|null;now:number};
