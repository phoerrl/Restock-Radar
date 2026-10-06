import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBranch,openingState,berlinTime} from '../lib/intelligence.ts';
import {parseCommunityFeed,parseCommunityPosts,sourceUrl,fetchCommunityFeed,publicFeeds} from '../lib/community.ts';
import {initialObservations,knownHours} from '../lib/research.ts';

const now=Date.parse('2026-10-06T12:20:00+02:00'),address='Petersstraße 12–14, 04109 Leipzig';
const hours=knownHours.find(h=>h.retailer==='Hugendubel');
const observation=(extra={})=>({id:crypto.randomUUID(),retailer:'Hugendubel',address,product:'Pokémon 30 Jahre Boosterbundle',kind:'restock',source:'personal',time_precision:'minute',observed_at:now-60000,created_at:now,expected_at:null,source_url:null,note:'test-only',price:null,uvp_price:null,uvp_source:null,reviewed:1,push_state:'pending',...extra});
const assess=(all,at=now,h=hours)=>assessBranch('Hugendubel',address,all,h,at);
test('one shelving event creates no recurring delivery prediction',()=>{
  const result=assess([observation({observed_at:now-86400000})]);assert.equal(result.priority,0);assert.deepEqual(result.windows,[]);
});
test('initial user observations preserve unknown branch, time, and prices',()=>{
  assert.equal(initialObservations[0].address,null);assert.equal(berlinTime(initialObservations[0].observed_at).minute,740);
  assert.equal(initialObservations[1].time_precision,'day');assert.equal(initialObservations[1].source,'secondhand');assert.ok(initialObservations.every(o=>o.price===null));
});
test('fresh sightings expire and unknown or above-reference prices never qualify for UVP push',()=>{
  assert.equal(assess([observation()]).priority,3);
  assert.equal(assess([observation({observed_at:now-21*60000})]).priority,0);
  assert.equal(assess([observation({price:40,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only'})]).priced.length,0);
  assert.equal(assess([observation({price:29.99,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only'})]).priority,4);
});
test('unreviewed, wrong branch, future and secondhand reports cannot trigger fresh signals',()=>{
  for(const extra of [{reviewed:0},{address:'Brühl 1, 04109 Leipzig'},{observed_at:now+60000},{source:'secondhand'},{time_precision:'day'}])assert.equal(assess([observation(extra)]).recent.length,0);
});
test('other sets and anniversary accessories cannot create a current-set signal',()=>{
  for(const product of ['Pokémon 25 Jahre Boosterbundle','Pokémon 30 Jahre Portfolio','Pokémon 151 Boosterbundle'])assert.equal(assess([observation({product,price:29.99,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only'})]).recent.length,0);
});
test('newer empty or expensive reports suppress older positive reports of the same product',()=>{
  assert.equal(assess([observation(),observation({kind:'empty',observed_at:now})]).recent.length,0);
  const qualified=observation({price:29.99,uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only'});
  assert.equal(assess([qualified,observation({price:40,observed_at:now})]).priced.length,0);
  assert.equal(assess([qualified,observation({kind:'empty',observed_at:now,product:'Pokémon 30 Jahre TTB'})]).priced.length,1);
});
test('unknown time does not suppress an exact current sighting or create a clock window',()=>{
  assert.equal(assess([observation(),observation({kind:'empty',observed_at:now,time_precision:'day'})]).recent.length,1);
});
test('a repeated window needs three distinct dates over two weeks, with same Berlin weekday',()=>{
  const restocks=[7,14,21].map(days=>observation({observed_at:now-days*86400000}));
  assert.equal(assess(restocks).windows[0].days,3);assert.equal(assess(restocks).priority,1);
  assert.equal(assess(restocks.slice(0,2)).windows.length,0);
  assert.equal(assess([restocks[0],restocks[0],restocks[1]]).windows.length,0);
  assert.equal(assess(restocks.map(o=>({...o,source:'community'}))).windows.length,0);
});
test('opening hours use Berlin, end-exclusive times and actual exceptions',()=>{
  assert.equal(openingState(hours,Date.parse('2026-10-06T10:00:00+02:00')).state,'open');
  assert.equal(openingState(hours,Date.parse('2026-10-06T20:00:00+02:00')).state,'closed');
  const thalia=knownHours.find(h=>h.retailer==='Thalia');assert.equal(openingState(thalia,Date.parse('2026-10-31T12:00:00+01:00')).state,'closed');
  assert.equal(openingState(undefined,now).state,'unknown');
  assert.equal(openingState({...hours,checked_at:now-31*86400000},now).state,'unknown');
  assert.equal(assess([observation()],Date.parse('2026-10-06T21:00:00+02:00')).priority,0);
  assert.equal(berlinTime(Date.parse('2026-10-25T01:30:00Z')).minute,150);
});
test('visit denominator includes empty checks, deduplicates same-day visits',()=>{
  const result=assess([observation(),observation(),observation({kind:'empty',observed_at:now-86400000})]);assert.equal(result.visits,2);assert.equal(result.found,1);
});
test('only recent staff announcements for today are actionable',()=>{
  const o=observation({kind:'announced',source:'staff',expected_at:now+60000});assert.equal(assess([o]).priority,2);
  assert.equal(assess([{...o,source:'community'}]).priority,0);
  assert.equal(assess([{...o,expected_at:now+86400000}]).priority,0);
});
function feed(body='Hugendubel Leipzig Petersstraße: Pokémon 30 Jahre wird gerade einsortiert',updated=new Date(now).toISOString()){
  return `<feed><entry><title>Test-only Restockbericht</title><published>${updated}</published><link href="https://www.reddit.com/r/PokemonTCG_DE/comments/testonly/report/"/><content type="html">${body}</content></entry></feed>`;
}
test('RSS candidates never become automatically reviewed stock or exact eyewitness timestamps',()=>{
  const [o]=parseCommunityFeed(feed(),now);assert.equal(o.address,address);assert.equal(o.reviewed,0);assert.equal(o.time_precision,'day');assert.equal(o.price,null);
});
test('city-only evidence remains unassigned; another city or another set does not qualify',()=>{
  assert.equal(parseCommunityFeed(feed('Hugendubel Leipzig Pokémon 30 Jahre Restock'),now)[0].address,null);
  assert.equal(parseCommunityFeed(feed('Hugendubel Dresden Pokémon 30 Jahre Restock'),now).length,0);
  assert.equal(parseCommunityFeed(feed('Hugendubel Leipzig Petersstraße Mega Entwicklung'),now).length,0);
  assert.equal(parseCommunityFeed(feed(undefined,new Date(now-8*86400000).toISOString()),now).length,0);
});
test('HTML security pages and nonfeeds are failures, never successful empty scans',()=>{
  for(const html of ['<html>Client Challenge</html>','<html>You have been blocked by network security</html>','<html>403</html>'])assert.throws(()=>parseCommunityFeed(html,now));
});
test('only configured public feeds are fetched, with redirect rejection',async()=>{
  await assert.rejects(fetchCommunityFeed('https://localhost/private'));
  for(const u of ['http://www.reddit.com','https://user:secret@example.org','https://127.0.0.1/private'])assert.throws(()=>sourceUrl(u));
  const original=globalThis.fetch;globalThis.fetch=async(url,init)=>{assert.equal(init.redirect,'manual');return new Response('Blocked',{status:403});};
  try{await assert.rejects(fetchCommunityFeed(publicFeeds[0].url),/HTTP 403/);}finally{globalThis.fetch=original;}
});
test('national reports can be context, never Leipzig branch evidence',()=>{
  const xml=feed('Müller Dresden: Pokémon 30 Jahre wurde im Laden einsortiert');
  assert.equal(parseCommunityPosts(xml,now).length,1);assert.equal(parseCommunityFeed(xml,now).length,0);
  assert.equal(parseCommunityPosts(feed('Thalia online Pokémon 30 Jahre bestellen'),now).length,0);
});
test('a different anniversary or an unspecified anniversary cannot become a 30 Jahre report',()=>{
  for(const body of ['Hugendubel Leipzig Petersstraße: Pokémon 25 Jahre Jubiläum im Regal','Hugendubel Leipzig: Pokémon Jubiläumsware im Laden']){
    assert.equal(parseCommunityFeed(feed(body),now).length,0);assert.equal(parseCommunityPosts(feed(body),now).length,0);
  }
});
