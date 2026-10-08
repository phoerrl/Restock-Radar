import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLocalDeals,fetchCommunityFeed,publicFeeds} from '../lib/community.ts';
import {discordChannels,parseDiscordMessages,fetchDiscordMessages} from '../lib/discord.ts';
import {hasBranchStock} from '../lib/branch-stock.ts';
import {uvpTransition} from '../lib/pricing.ts';
const now=Date.parse('2026-10-08T12:00:00+02:00');
const channel={guildId:'111111111111111111',channelId:'222222222222222222',label:'Test-only authorized channel'};
const message=extra=>({id:'333333333333333333',channel_id:channel.channelId,timestamp:new Date(now-60000).toISOString(),type:0,content:'Hugendubel Leipzig Petersstrasse: Pokemon 30 Jahre Boosterbundle im Laden',author:{username:'test-only-private-name'},...extra});
const deal=(title='Pokemon 30 Jahre Boosterbundle',extra='')=>`<main><h1>Latest reports across Germany</h1><h2>Community deals</h2><div class="deal"><a href="https://www.mydealz.de/deals/test-only-123">${title}</a><span>Globus</span><span class="pill">local</span><span>2 h ago</span>${extra}</div></main>`;
test('local 30-year deals retain original links but cannot imply live branch stock',()=>{
  const [post]=parseLocalDeals(deal(),now);assert.equal(post.published_at,now-2*3600000);assert.deepEqual(post.retailers,['Globus']);assert.match(post.excerpt,/kein Restock-Beleg/);
  assert.equal(parseLocalDeals(deal('Pokemon 151 Boosterbundle'),now).length,0);
  assert.equal(parseLocalDeals(deal('Pokemon 30th 6 boosterbundle & Tins'),now).length,1);
  assert.equal(parseLocalDeals(deal().replace('class="pill">local','class="pill">online'),now).length,0);
  assert.equal(parseLocalDeals(deal().replace('2 h ago','8 days ago'),now).length,0);
  assert.equal(parseLocalDeals(deal().replace('www.mydealz.de','localhost'),now).length,0);
  assert.throws(()=>parseLocalDeals('<html>Challenge</html>',now));
});
test('real HTML source uses the configured URL and returns only context posts',async()=>{
  const original=fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,publicFeeds[3].url);assert.equal(options.redirect,'manual');return new Response(deal());};
  try{const result=await fetchCommunityFeed(publicFeeds[3].url,now);assert.equal(result.posts.length,1);assert.deepEqual(result.candidates,[]);assert.equal(result.newest,null);}finally{globalThis.fetch=original;}
});
test('Discord needs explicit opt-in, a bot token and bounded channel configuration',()=>{
  const vars={DISCORD_IMPORT_ENABLED:'true',DISCORD_BOT_TOKEN:'test-only-secret',DISCORD_CHANNELS:JSON.stringify([channel])};
  assert.deepEqual(discordChannels(vars),[channel]);
  for(const changes of [{DISCORD_IMPORT_ENABLED:'false'},{DISCORD_BOT_TOKEN:''},{DISCORD_CHANNELS:'invalid'},{DISCORD_CHANNELS:JSON.stringify([{...channel,channelId:'https://localhost'}])},{DISCORD_CHANNELS:JSON.stringify([channel,channel,channel,channel])}])assert.deepEqual(discordChannels({...vars,...changes}),[]);
});
test('Discord candidates are deduplicable, stripped of personal chat details and never reviewed automatically',()=>{
  const {candidates,readable}=parseDiscordMessages([message()],channel,now);
  assert.equal(readable,true);assert.equal(candidates.length,1);assert.equal(candidates[0].reviewed,0);assert.equal(candidates[0].time_precision,'day');assert.equal(candidates[0].price,null);assert.equal(candidates[0].address,'Petersstraße 12–14, 04109 Leipzig');
  assert.ok(!JSON.stringify(candidates).includes('test-only-private-name'));assert.equal(candidates[0].source_url,`https://discord.com/channels/${channel.guildId}/${channel.channelId}/333333333333333333`);
});
test('online-only, another set, another region, old and future Discord messages are excluded',()=>{
  for(const changes of [{content:'Hugendubel Leipzig Pokemon 30 Jahre Boosterbundle online bestellen'},{content:'Hugendubel Leipzig Pokemon 151 Boosterbundle im Laden'},{content:'Thalia Dresden Pokemon 30 Jahre Boosterbundle im Laden'},{timestamp:new Date(now-8*86400000).toISOString()},{timestamp:new Date(now+1000).toISOString()}])assert.equal(parseDiscordMessages([message(changes)],channel,now).candidates.length,0);
  assert.throws(()=>parseDiscordMessages([message({channel_id:'444444444444444444'})],channel,now));
  assert.equal(parseDiscordMessages([message({content:'',embeds:[]})],channel,now).readable,false);
});
test('Discord REST uses only configured channel and Bot auth, rejects redirects and respects rate limits',async()=>{
  const original=fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,`https://discord.com/api/v10/channels/${channel.channelId}/messages?limit=100`);assert.equal(options.headers.Authorization,'Bot test-only-secret');assert.equal(options.redirect,'manual');return Response.json([message()]);};
  try{assert.equal((await fetchDiscordMessages(channel,'test-only-secret',now)).candidates.length,1);
    globalThis.fetch=async()=>new Response('',{status:403});await assert.rejects(fetchDiscordMessages(channel,'test-only-secret',now),/Leserechte/);
    globalThis.fetch=async()=>new Response('',{status:429,headers:{'retry-after':'3600'}});await assert.rejects(fetchDiscordMessages(channel,'test-only-secret',now),e=>e.retrySeconds===3600);
    globalThis.fetch=async()=>new Response('',{status:302,headers:{location:'https://example.org'}});await assert.rejects(fetchDiscordMessages(channel,'test-only-secret',now));
  }finally{globalThis.fetch=original;}
});
test('unknown quantities are not invented; explicit branch status still undergoes full price qualification',()=>{
  const branch={key:'test-only',label:'Test-only shop',name:'Test-only',address:'Test-only',status:'available',quantity:null,price:29.99};
  assert.equal(hasBranchStock(branch),true);
  const result={channel:'store',branches:[branch]};
  assert.equal(uvpTransition(result,null,{uvp_price:null,uvp_source:null}).changes.length,0);
  assert.equal(uvpTransition(result,null,{uvp_price:29.99,uvp_source:'https://www.pokemon.com/test-only'}).changes.length,1);
  for(const quantity of [0,-1,0.5,undefined,'3'])assert.equal(hasBranchStock({...branch,quantity}),false);
});
