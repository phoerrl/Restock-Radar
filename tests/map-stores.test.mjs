import test from 'node:test';
import assert from 'node:assert/strict';
import { stores, retailers } from '../lib/catalog.ts';
import { assessBranch, branchKey } from '../lib/intelligence.ts';
import { knownHours } from '../lib/research.ts';
import { filterMapBranches, hasPosition, mapBranch, readSavedStops } from '../lib/map-stores.ts';

const now=Date.parse('2026-10-06T12:20:00+02:00');
const store=stores.find(s=>s.retailer==='Hugendubel'&&s.name==='Petersstraße');
const hours=knownHours.find(h=>h.retailer===store.retailer&&h.address===store.address);
const product='Pokémon 30 Jahre Boosterbundle';
const report=(extra={})=>({id:'test-only',retailer:store.retailer,address:store.address,product,kind:'seen',source:'personal',observed_at:now-60000,created_at:now,expected_at:null,time_precision:'minute',source_url:null,note:'test-only',price:29.99,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only',reviewed:1,push_state:'pending',...extra});
const monitor=(extra={})=>({id:'test-only',name:product,retailer:store.retailer,url:'https://www.hugendubel.de/test-only',kind:'product',enabled:1,status:'available',channel:'store',checked_at:now-60000,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only',branches:[{key:'test-only',label:`Hugendubel, ${store.address}`,name:store.name,address:store.address,status:'available',quantity:3,price:29.99}],...extra});
const mapped=(observations=[],monitors=[],at=now)=>mapBranch(store,assessBranch(store.retailer,store.address,observations,hours,at),monitors,hours,at,120);

test('all ten chains have sourced finite positions without duplicate store identities',()=>{
  assert.equal(new Set(stores.map(s=>branchKey(s.retailer,s.address))).size,stores.length);
  assert.equal(new Set(stores.map(s=>s.retailer)).size,retailers.length);
  assert.ok(stores.every(hasPosition));
  assert.ok(stores.every(s=>new URL(s.position.source_url).hostname==='www.openstreetmap.org'));
  assert.equal(stores.find(s=>s.name==='Karl-Liebknecht-Straße').position.precision,'building');
  assert.ok(stores.filter(s=>s.directory_source==='osm').every(s=>/\b04[123]\d{2} Leipzig$/.test(s.address)));
  assert.ok(!stores.some(s=>/bestattungen|die küche|getränkemarkt/i.test(s.name)));
});
test('map stock status expires, future reports and a location alone never become positive',()=>{
  assert.equal(mapped().status,'unknown');
  assert.equal(mapped([report()]).status,'uvp');
  assert.equal(mapped([report()],[],now+21*60000).status,'unknown');
  assert.equal(mapped([report({observed_at:now+60000})]).status,'unknown');
  assert.equal(mapped([report({reviewed:0})]).status,'unknown');
  assert.equal(mapped([report({source:'secondhand'})]).status,'unknown');
  assert.equal(mapped([report({price:null})]).status,'fresh');
  assert.equal(mapped([report({price:39.99})]).status,'fresh');
});
test('closed stores never have green or fresh map status even with a just-seen UVP offer',()=>{
  const at=Date.parse('2026-10-06T20:10:00+02:00');
  assert.equal(mapped([report({observed_at:at-60000})],[monitor({checked_at:at-60000})],at).status,'closed');
});
test('map only joins fresh physical stock of the correct chain, branch and anniversary',()=>{
  assert.equal(mapped([],[monitor()]).status,'uvp');
  for(const extra of [{channel:'online'},{checked_at:now+1},{checked_at:now-11*60000},{enabled:0},{retailer:'Thalia'},{name:'Pokémon 25 Jahre Boosterbundle'},{status:'blocked'}])assert.equal(mapped([],[monitor(extra)]).status,'unknown');
  assert.equal(mapped([],[monitor({branches:[{...monitor().branches[0],label:'Hugendubel, Brühl 1, 04109 Leipzig'}]})]).status,'unknown');
  assert.equal(mapped([],[monitor({branches:[{...monitor().branches[0],quantity:0}]})]).status,'unknown');
  assert.equal(mapped([report({kind:'empty',observed_at:now})],[monitor()]).status,'empty');
});
test('announcement and empty markers expire independently of the last successful API response',()=>{
  const o=report({kind:'announced',source:'staff',expected_at:now+60000});
  const e=assessBranch(store.retailer,store.address,[o],hours,now);
  assert.equal(mapBranch(store,e,[],hours,now,120).status,'announced');
  assert.equal(mapBranch(store,e,[],hours,now+32*60000,120).status,'unknown');
  const empty=assessBranch(store.retailer,store.address,[report({kind:'empty'})],hours,now);
  assert.equal(mapBranch(store,empty,[],hours,now,120).status,'empty');
  assert.equal(mapBranch(store,empty,[],hours,now+21*60000,120).status,'unknown');
});
test('map filters use the same data as markers; unknown hours are not counted as open',()=>{
  const a=mapped([report()]),b=mapBranch({...store,retailer:'Thalia',name:'Other'},undefined,[],undefined,now,120);
  const filters={retailer:'all',query:'',mode:'all',onlyOpen:false,saved:[]};
  assert.equal(filterMapBranches([a,b],filters).length,2);
  assert.deepEqual(filterMapBranches([a,b],{...filters,mode:'uvp'}),[a]);
  assert.deepEqual(filterMapBranches([a,b],{...filters,onlyOpen:true}),[a]);
  assert.deepEqual(filterMapBranches([a,b],{...filters,retailer:'Thalia'}),[b]);
  assert.equal(filterMapBranches([a],{...filters,query:'Petersstr. 12–14'}).length,1);
  assert.deepEqual(filterMapBranches([a,b],{...filters,mode:'saved',saved:[b.id]}),[b]);
});
test('tour persistence validates IDs, removes duplicates, limits stops and tolerates malformed storage',()=>{
  assert.deepEqual(readSavedStops('broken',['a']),[]);
  assert.deepEqual(readSavedStops('{"0":"a"}',['a']),[]);
  assert.deepEqual(readSavedStops('["b","a","a",null,{},"unknown"]',['a','b']),['b','a']);
  const ids=Array.from({length:35},(_,i)=>String(i));assert.equal(readSavedStops(JSON.stringify(ids),ids).length,30);
});
test('Saturday Thalia hours are verified, end-exclusive, and REWE train station has Sunday hours',()=>{
  const thalia=knownHours.find(h=>h.retailer==='Thalia'),branch=stores.find(s=>s.retailer==='Thalia'&&s.name==='Karl-Liebknecht-Straße');
  assert.equal(mapBranch(branch,undefined,[],thalia,Date.parse('2026-10-10T14:59:00+02:00'),120).opening.state,'open');
  assert.equal(mapBranch(branch,undefined,[],thalia,Date.parse('2026-10-10T15:00:00+02:00'),120).opening.state,'closed');
  const rewe=knownHours.find(h=>h.retailer==='REWE');assert.equal(mapBranch(store,undefined,[],rewe,Date.parse('2026-10-11T13:00:00+02:00'),120).opening.state,'open');
});
