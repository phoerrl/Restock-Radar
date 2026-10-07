import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalGtin,productByGtin,setProducts,catalogSeeds,showcaseDE,showcaseUS} from '../lib/set-catalog.ts';
import {isSet,retailUrl,parsePage} from '../lib/retail.ts';

test('catalog covers the complete researched line including non-booster decks and future collections',()=>{
  assert.equal(setProducts.length,19);
  assert.equal(new Set(setProducts.map(p=>p.family)).size,14);
  assert.equal(setProducts.filter(p=>p.gtin).length,10);
  assert.equal(setProducts.filter(p=>p.release.inTrade).length,10);
  assert.equal(new Set(setProducts.map(p=>p.id)).size,setProducts.length);
  for(const p of setProducts)assert.ok(isSet(`Pokémon 30 Jahre ${p.name}`),p.name);
  assert.ok(setProducts.some(p=>p.id==='deck-psiana'&&p.boosters===0));
  assert.ok(setProducts.some(p=>p.id==='ordner'&&p.boosters===5));
});
test('receipt UPCs match canonical EANs with checksum validation',()=>{
  assert.equal(canonicalGtin('196214145245'),'0196214145245');
  assert.equal(productByGtin('196214146310').id,'mini-tin');
  assert.equal(productByGtin('0196214145245').id,'bundle');
  for(const p of setProducts.filter(p=>p.gtin))assert.equal(canonicalGtin(p.gtin),p.gtin,p.name);
  for(const invalid of ['196214145244','0196214145246','123','EAN 196214145245','https://localhost',''])assert.equal(canonicalGtin(invalid),null);
});
test('future US dates are not represented as German release or delivery promises',()=>{
  for(const p of setProducts.filter(p=>!p.release.inTrade))assert.equal(p.release.deDate,null);
  assert.equal(setProducts.find(p=>p.id==='ordner').release.internationalDate,'2026-12-04');
  assert.equal(setProducts.find(p=>p.id==='deck-nachtara').release.internationalDate,'2026-10-30');
  assert.ok(showcaseDE.includes('/de/'));
  assert.ok(showcaseUS.includes('/us/'));
});
test('catalog seeds use 22 distinct real article URLs and no invented future GTINs',()=>{
  const seeds=catalogSeeds();assert.equal(seeds.length,22);
  assert.equal(new Set(seeds.map(s=>s.url)).size,seeds.length);
  assert.equal(new Set(seeds.map(s=>s.id)).size,seeds.length);
  for(const s of seeds)assert.equal(retailUrl(s.url).href,s.url);
  assert.equal(seeds.find(s=>s.id==='smyths-quajutsu').url.split('/').at(-1),'264149');
  assert.deepEqual([...new Set(seeds.map(s=>s.retailer))].sort(),['GALERIA','Saturn','Smyths Toys','VEDES']);
  for(const p of setProducts.filter(p=>!p.release.inTrade))assert.equal(p.gtin,null);
});
test('recognition includes German retailer abbreviations and new product families but excludes unrelated anniversary goods',()=>{
  for(const name of ['POK 30 Jahre 2-Pack Blister','Pokémon 30 Jahre Kampfdeck Psiana-ex','Pokémon 30 Jahre Knock-out-Kollektion','Pokémon 30 Jahre Ordner-Kollektion'])assert.ok(isSet(name));
  for(const name of ['Pokémon 30 Jahre Sammelordner','Pokémon 30 Jahre Portfolio','Pokémon 30 Jahre Plüsch Pikachu','Pokémon First Partner Collection 30th Celebration','Pokémon Day Kollektion 2026','Pokémon 30 Jahre Deckbox','Kampfdeck Psiana-ex','Pokémon 30 Jahre Puzzle'])assert.equal(isSet(name),false,name);
});
test('VEDES online offer remains unknown and cannot become a local stock alert',()=>{
  const url=catalogSeeds().find(s=>s.id==='vedes-etb').url;
  const product={'@type':'Product',url,name:'POK 30 Jahre Top-Trainer-Box',offers:{availability:'https://schema.org/InStock',price:'54.99',priceCurrency:'EUR'}};
  const result=parsePage(`<h1>${product.name}</h1><script type="application/ld+json">${JSON.stringify(product)}</script>`,url,'product');
  assert.equal(result.status,'unknown');assert.equal(result.price,null);assert.deepEqual(result.branches,[]);
});
