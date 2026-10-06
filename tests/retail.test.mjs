import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,canNotify,parsePage,retailUrl,stockTransition} from '../lib/retail.ts';
import {matchesStore} from '../lib/place.ts';

const url='https://www.thalia.de/shop/home/artikeldetails/A123';
const branch={'@type':'BookStore',name:'Thalia Leipzig',address:{streetAddress:'Karl-Liebknecht-Str. 8-14',postalCode:'04107',addressLocality:'Leipzig',addressCountry:'DE'}};
const stock={availableAtOrFrom:branch,inventoryLevel:{value:4}};
function offer(availability='InStock',extra={}) {return {'@type':'Offer',url,availability:`https://schema.org/${availability}`,price:'29.99',priceCurrency:'EUR',...extra};}
function page(offers=offer(),extra={}) {
  const product={'@type':'Product',name:'Pokémon 30 Jahre Feelinara-ex Kollektion',url,offers,...extra};
  return `<h1>${product.name}</h1><script type="application/ld+json">${JSON.stringify(product)}</script>`;
}
function observed(availability='InStock',extra={}) {return parsePage(page(offer(availability,{...stock,...extra})),url,'product');}

test('online availability and price cannot become a store alert',()=>{
  const p=parsePage(page(),url,'product');assert.equal(p.status,'unknown');assert.equal(p.channel,'unknown');assert.equal(p.price,null);assert.equal(canNotify(p),false);assert.equal(stockTransition(p,null).newStock,false);
});
test('online sold-out or pre-order states say nothing about shelf stock',()=>{
  for(const status of ['OutOfStock','PreOrder','BackOrder'])assert.equal(parsePage(page(offer(status)),url,'product').status,'unknown');
});
test('a branch quantity and complete address qualify, but do not assert a goods receipt',()=>{
  const p=observed();assert.equal(p.status,'available');assert.equal(p.channel,'store');assert.equal(canNotify(p),true);assert.match(p.location,/04107 Leipzig/);assert.match(p.detail,/Wareneingang nicht belegt/);assert.equal(p.branches[0].quantity,4);
});
test('collection option or branch name without a branch quantity is insufficient',()=>{
  for(const extra of [{availableAtOrFrom:branch},{availableDeliveryMethod:'https://schema.org/OnSitePickup'},{availableAtOrFrom:{name:'Thalia Leipzig'},inventoryLevel:{value:4}}])assert.equal(canNotify(parsePage(page(offer('InStock',extra)),url,'product')),false);
});
test('delivery to store tomorrow is not current branch stock',()=>{
  assert.equal(canNotify(observed('InStock',{deliveryLeadTime:{minValue:1}})),false);
  assert.equal(canNotify(observed('InStock',{description:'Zur Lieferung in die Filiale bestellbar'})),false);
});
test('a warehouse address is not a shop',()=>{
  assert.equal(canNotify(observed('InStock',{availableAtOrFrom:{...branch,'@type':'Place',name:'Zentrallager'}})),false);
});
test('non-Leipzig stores and foreign stock are excluded',()=>{
  assert.equal(canNotify(observed('InStock',{availableAtOrFrom:{...branch,address:{...branch.address,addressLocality:'Berlin'}}})),false);
  assert.equal(canNotify(observed('InStock',{availableAtOrFrom:{...branch,address:{...branch.address,addressCountry:'AT'}}})),false);
});
test('German Smyths shops outside Leipzig can qualify',()=>{
  const smyths='https://www.smythstoys.com/de/de-de/item/p/123';
  const html=page(offer('InStock',{...stock,availableAtOrFrom:{...branch,'@type':'ToyStore',name:'Smyths Berlin',address:{...branch.address,addressLocality:'Berlin'}}})).replaceAll(url,smyths);
  assert.equal(canNotify(parsePage(html,smyths,'product')),true);
});
test('branch-level zero is a known unavailable state',()=>{
  const p=observed('OutOfStock',{inventoryLevel:{value:0}});assert.equal(p.status,'unavailable');assert.equal(canNotify(p),false);
});
test('conflicting quantity or availability stays unknown',()=>{
  const p=parsePage(page([offer('InStock',stock),offer('OutOfStock',{...stock,inventoryLevel:{value:0}})]),url,'product');assert.equal(p.status,'unknown');assert.equal(canNotify(p),false);
  assert.equal(canNotify(observed('InStock',{inventoryLevel:{value:0}})),false);
});
test('related product or description-only match never proves stock',()=>{
  assert.equal(canNotify(parsePage(page(offer('InStock',stock),{url:'https://www.thalia.de/shop/home/artikeldetails/A456'}),url,'product')),false);
  assert.equal(canNotify(parsePage(page(offer('InStock',stock),{name:'Pokémon Handbuch',description:'Pokémon 30 Jahre'}),url,'product')),false);
});
test('third-party seller cannot produce a physical retail alert',()=>assert.equal(canNotify(observed('InStock',{seller:{name:'TCC-Shop'}})),false));
test('used items and anniversary merchandise are not sealed new cards',()=>{
  assert.equal(canNotify(observed('InStock',{itemCondition:'https://schema.org/UsedCondition'})),false);
  for(const name of ['Pokémon 30 Jahre Plüsch Edition','Pokémon 30 Jahre Portfolio','Pokémon 30 Jahre Handbuch'])assert.equal(canNotify(parsePage(page(offer('InStock',stock),{name}),url,'product')),false);
});
test('malformed quantities cannot imply physical inventory',()=>{
  for(const value of [true,false,null,'',-1,0.5,'unknown'])assert.equal(canNotify(observed('InStock',{inventoryLevel:{value}})),false);
});
test('security pages, malformed JSON and generic cart labels stay unknown',()=>{
  assert.equal(parsePage('<title>Sicherheits-Check</title>',url,'product').status,'blocked');
  assert.equal(parsePage('<h1>Pokémon 30 Jahre</h1><script type="application/ld+json">invalid</script>',url,'product').status,'unknown');
  assert.equal(canNotify(parsePage(page()+'<button>Click & Collect Filiale wählen</button>',url,'product')),false);
});
test('only first observation and known reavailability create changes',()=>{
  const first=stockTransition(observed(),null);assert.equal(first.changes[0].kind,'first');
  assert.equal(stockTransition(observed(),first.value).newStock,false);
  const zero=stockTransition(observed('OutOfStock',{inventoryLevel:{value:0}}),first.value);
  assert.equal(stockTransition(observed(),zero.value).changes[0].kind,'restock');
});
test('a quantity increase alone does not pretend to prove a new delivery',()=>{
  const first=stockTransition(observed(),null);assert.equal(stockTransition(observed('InStock',{inventoryLevel:{value:10}}),first.value).newStock,false);
});
test('partial responses, vanished stores and blocked checks retain per-store baselines',()=>{
  const a=observed(), b={...a.branches[0],key:'another-store',label:'Thalia Leipzig, Andere Str. 1, 04109 Leipzig'};
  const first=stockTransition({...a,branches:[...a.branches,b]},null);
  const partial=stockTransition(a,first.value);assert.equal(partial.newStock,false);
  const blocked=stockTransition({...blank(),status:'blocked'},partial.value);assert.equal(blocked.value,partial.value);
  assert.equal(stockTransition({...a,branches:[b]},blocked.value).newStock,false);
});
test('new branch availability reports only the new address',()=>{
  const a=observed(), first=stockTransition(a,null), b={...a.branches[0],key:'another-store',label:'Andere Str. 1, 04109 Leipzig'};
  const change=stockTransition({...a,branches:[...a.branches,b]},first.value);assert.deepEqual(change.changes.map(b=>b.label),[b.label]);
});
test('legacy online state never counts as a previous branch availability or creates a drop',()=>{
  const legacy=JSON.stringify({status:'available',locations:[]});
  assert.equal(stockTransition(parsePage(page(),url,'product'),legacy).newStock,false);
  assert.equal(stockTransition(observed(),legacy).changes[0].kind,'first');
});
test('same address formatting and store-name changes do not repeat an alert',()=>{
  const first=stockTransition(observed(),null), result=observed('InStock',{availableAtOrFrom:{...branch,name:'Thalia Karli',address:{...branch.address,streetAddress:'Karl-Liebknecht-Straße 8–14'}}});
  assert.equal(stockTransition(result,first.value).newStock,false);
  assert.equal(matchesStore(result.location,'Karl-Liebknecht-Str. 8-14, 04107 Leipzig'),true);
  assert.equal(matchesStore(result.location,'Karl-Liebknecht-Str. 136, 03046 Cottbus'),false);
});
test('fetch URLs reject foreign hosts, credentials, HTTP and custom ports',()=>{
  for(const s of ['http://www.thalia.de/test','https://localhost/test','https://user:pass@www.thalia.de/test','https://www.thalia.de:9999/test','https://www.thalia.de.evil.test'])assert.throws(()=>retailUrl(s));
});
