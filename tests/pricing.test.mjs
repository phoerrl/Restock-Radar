import test from 'node:test';
import assert from 'node:assert/strict';
import {euroPrice,priceState,uvpTransition,validateReference} from '../lib/pricing.ts';
import {blank,fetchRetail,parsePage,retailUrl} from '../lib/retail.ts';

const reference={uvp_price:29.99,uvp_source:'https://www.pokemon.com/de/test-only-reference'};
const url='https://www.mueller.de/p/test-30-jahre';
function html(offers){return `<h1>Pokémon 30 Jahre Test Kollektion</h1><script type="application/ld+json">${JSON.stringify({'@type':'Product',url,name:'Pokémon 30 Jahre Test Kollektion',offers})}</script>`;}
function branch(price=29.99,street='Petersstraße 28',currency='EUR'){
  return {availability:'https://schema.org/InStock',price,priceCurrency:currency,inventoryLevel:{value:4},availableAtOrFrom:{'@type':'DrugStore',name:'Müller Leipzig',address:{streetAddress:street,postalCode:'04109',addressLocality:'Leipzig'}}};
}
const observed=(offers=branch())=>parsePage(html(offers),url,'product');

test('only valid cent-accurate euro prices are accepted',()=>{
  for(const value of [null,true,'','29,99','29.999','NaN',NaN,Infinity,0,-1,29.999])assert.equal(euroPrice(value),null);
  assert.equal(euroPrice('29.99'),29.99);assert.equal(euroPrice(29.9),29.9);
});
test('exact UVP and lower prices qualify; excess or unproven prices do not',()=>{
  assert.equal(priceState(29.99,reference),'eligible');assert.equal(priceState(25,reference),'eligible');
  assert.equal(priceState(30,reference),'above');assert.equal(priceState(null,reference),'missing-price');
  assert.equal(priceState(25,{...reference,uvp_source:null}),'missing-reference');
  assert.equal(priceState(25,{...reference,uvp_price:null}),'missing-reference');
  assert.throws(()=>validateReference(29.99,null));assert.throws(()=>validateReference(29.99,'http://example.org'));
  assert.throws(()=>validateReference(29.99,'https://user:password@example.org'));
});
test('retailer allowlist covers every requested chain without permitting lookalike hosts',()=>{
  for(const host of ['smythstoys.com','mueller.de','hugendubel.de','thalia.de','mediamarkt.de','galeria.de','rossmann.de','edeka.de','rewe.de','lidl.de'])assert.ok(retailUrl(`https://www.${host}/test`));
  assert.throws(()=>retailUrl('https://www.rewe.de.example.org/test'));
});
test('a cheaper online price is not assigned to a physical branch offer',()=>{
  const online={availability:'https://schema.org/InStock',price:10,priceCurrency:'EUR'};
  const result=observed([online,branch(39.99)]);
  assert.equal(result.branches[0].price,39.99);assert.equal(uvpTransition(result,null,reference).changes.length,0);
});
test('unknown price or non-EUR currency stays unknown despite online EUR offers',()=>{
  for(const offer of [branch(null),branch(25,'Petersstraße 28','USD'),{...branch(),priceCurrency:undefined}]){
    const result=observed(offer);assert.equal(result.branches[0].price,null);assert.equal(uvpTransition(result,null,reference).changes.length,0);
  }
});
test('different branch prices are compared individually and cannot contaminate alerts',()=>{
  const result=observed([branch(29.99),branch(40,'Andere Straße 1')]);
  assert.equal(result.branches.length,2);const changes=uvpTransition(result,null,reference).changes;
  assert.equal(changes.length,1);assert.equal(changes[0].address,'Petersstraße 28, 04109 Leipzig');
});
test('conflicting prices for the same branch suppress the branch instead of choosing the lowest',()=>{
  assert.equal(observed([branch(29.99),branch(40)]).branches.length,0);
});
test('price qualification, sold-out transitions and blocked baselines remain distinct',()=>{
  const expensive=uvpTransition(observed(branch(40)),null,reference);assert.equal(expensive.changes.length,0);
  const qualified=uvpTransition(observed(),expensive.value,reference);assert.equal(qualified.changes[0].kind,'price');
  assert.equal(uvpTransition(observed(),qualified.value,reference).changes.length,0);
  const blocked=uvpTransition({...blank(),status:'blocked'},qualified.value,reference);assert.equal(blocked.value,qualified.value);
  assert.equal(uvpTransition(observed(),blocked.value,reference).changes.length,0);
  const zero=observed({...branch(),availability:'https://schema.org/OutOfStock',inventoryLevel:{value:0}});
  const soldOut=uvpTransition(zero,qualified.value,reference);assert.equal(uvpTransition(observed(),soldOut.value,reference).changes[0].kind,'restock');
});
test('missing reference cannot qualify legacy branch state or unknown responses',()=>{
  const previous=JSON.stringify({scope:'store-v1',stocks:{[observed().branches[0].key]:'available'}});
  assert.equal(uvpTransition(observed(),previous,{uvp_price:null,uvp_source:null}).changes.length,0);
  assert.equal(uvpTransition(blank(),null,reference).changes.length,0);
});
test('a redirect cannot substitute another retailer under the original product UVP reference',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://www.thalia.de/other-product'}});
  try{await assert.rejects(fetchRetail(url),/anderen Händler/);}finally{globalThis.fetch=original;}
});
