import {marketRead} from './market.mjs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';
import {directPrepare,directConfirm,listLaunches} from './launch-direct.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4','.webm':'video/webm','.txt':'text/plain; charset=utf-8'};
export const RPC_METHODS=new Set(['getAccountInfo','getMultipleAccounts','getBalance','getTokenAccountsByOwner','getTokenAccountBalance','getTokenSupply','getLatestBlockhash','getBlockHeight','getSlot','getMinimumBalanceForRentExemption','getSignatureStatuses','getSignaturesForAddress','getTransaction','getHealth','getVersion','isBlockhashValid','getRecentPrioritizationFees']);
export function safeFile(root,pathname){const decoded=decodeURIComponent(pathname);if(decoded.includes('\0')||decoded.includes('\\')||decoded.split('/').includes('..'))return null;const result=path.resolve(root,'.'+decoded);return result===root||result.startsWith(root+path.sep)?result:null;}
const cache=new Map();let manifest;
async function inventory(){return manifest||(manifest=JSON.parse(await readFile(path.join(ROOT,'dist/runtime-manifest.json'),'utf8')));}
let raffleCache=null;

const MAIN_TOKEN='3PoPcQKmU9aXUoA6bk2xYkc6D3EfLUkCEabuEdLBpump';
const SITE_URL=(process.env.SITE_URL||'https://rome.fun').replace(/\/$/,'');
const X_URL='https://x.com/rome';
let tokenCache=null;
function ipfsUrl(value){const v=String(value||'').trim();if(!v)return '';if(v.startsWith('ipfs://'))return 'https://gateway.pinata.cloud/ipfs/'+v.slice(7).replace(/^ipfs\//,'');const m=v.match(/\/ipfs\/([^?#]+)/);return m?'https://gateway.pinata.cloud/ipfs/'+m[1]:v;}
async function tokenMeta(uri){try{const u=ipfsUrl(uri);if(!u)return {};const r=await fetch(u,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)return {};const j=await r.json();return {image:ipfsUrl(j.image||j.image_url||''),description:String(j.description||''),twitter:String(j.twitter||j.x||''),telegram:String(j.telegram||''),website:String(j.website||'')};}catch{return {};}}
async function dex(mint){try{const r=await fetch('https://api.dexscreener.com/tokens/v1/solana/'+mint,{headers:{accept:'application/json','user-agent':'rome.fun'},signal:AbortSignal.timeout(9000)});if(!r.ok)return {};const pairs=await r.json();const p=(Array.isArray(pairs)?pairs:[]).filter(x=>x.chainId==='solana'&&x.baseToken?.address===mint).sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0))[0];if(!p)return {};const price=Number(p.priceUsd)||0, native=Number(p.priceNative)||0, mc=Number(p.marketCap)||Number(p.fdv)||0, solUsd=price&&native?price/native:0;return {priceUsd:price||null,marketCapUsd:mc||null,marketCapSol:mc&&solUsd?mc/solUsd:0,volume24hUsd:Number(p.volume?.h24)||0,dexUrl:p.url||'',pairAddress:p.pairAddress||''};}catch{return {};}}
function coinShape(row,meta={},market={}){return {mint:row.mint,name:row.name||row.symbol||'Coin',symbol:row.symbol||'TOKEN',image:row.image_url||meta.image||'',giftCardId:'verified',createdAt:row.created_at||null,marketCapSol:Number(market.marketCapSol)||0,marketCapUsd:market.marketCapUsd||null,volume24hUsd:market.volume24hUsd||0,priceUsd:market.priceUsd||null,payout:0,floor:0,creator:'',description:row.description||meta.description||'',twitter:meta.twitter||X_URL,telegram:meta.telegram||'',website:row.token_directory||meta.website||`${SITE_URL}/${row.mint}`,feesClaimedSol:0,feesClaimedTx:null,creatorVault:null,poolFeeAccount:null,dividendsDistributedSol:0,dividendsDistributedTx:null,undrawnSol:0};}
async function indexedCoins(){if(tokenCache&&tokenCache.until>Date.now())return tokenCache.value;const rows=await listLaunches().catch(()=>[]);const source=rows.length?rows:[{mint:MAIN_TOKEN,name:'VERIFD',symbol:'VERIFD',description:'VERIFD ecosystem token.',token_directory:SITE_URL,image_url:'/brand-mark.png',created_at:null}];const coins=[];for(const row of source.slice(0,100)){const [meta,market]=await Promise.all([tokenMeta(row.metadata_uri),dex(row.mint)]);coins.push(coinShape(row,meta,market));}const value={coins,total:coins.length};tokenCache={value,until:Date.now()+60000};return value;}

async function lootJson(pathname){const r=await fetch('https://loot.family'+pathname,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000),redirect:'error'});if(!r.ok)throw new Error('Public fee index returned '+r.status);return r.json();}
async function raffleOverview(){
 if(raffleCache&&raffleCache.until>Date.now())return raffleCache.value;
 const list=await lootJson('/api/coins?sort=top&limit=100&offset=0&payout=giveaway');
 const coins=(list.coins||[]).filter(c=>c.payout===1&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(c.mint));
 const details=[];for(let i=0;i<coins.length;i+=8){details.push(...(await Promise.all(coins.slice(i,i+8).map(async c=>{try{return await lootJson('/api/coins/'+c.mint);}catch{return null;}}))).filter(Boolean));}
 const rows=details.filter(c=>c.payout===1).map(c=>({mint:c.mint,name:c.name||'Untitled',symbol:c.symbol||'TOKEN',image:c.image||'',marketCapSol:Number(c.marketCapSol)||0,feesClaimedSol:Number(c.feesClaimedSol)||0,undrawnSol:Number(c.undrawnSol)||0,creator:c.creator||''}));
 const winners=[];for(const c of rows.slice(0,10)){try{const data=await lootJson('/api/coins/'+c.mint+'/payouts?offset=0');for(const p of (data.payouts||[]).slice(0,2))winners.push({wallet:p.wallet,sol:Number(p.sol)||0,symbol:c.symbol,name:c.name,mint:c.mint});}catch{}}
 const value={rows,coins:rows.length,feesClaimedSol:rows.reduce((a,c)=>a+c.feesClaimedSol,0),undrawnSol:rows.reduce((a,c)=>a+c.undrawnSol,0),winners:winners.slice(0,12),syncedAt:new Date().toISOString(),dataSource:'public-loot-index',sharedPool:false};raffleCache={value,until:Date.now()+30000};return value;
}
function json(res,status,payload){res.writeHead(status,{'Content-Type':MIME['.json'],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));}
async function rawBody(req){const chunks=[];let size=0;for await(const part of req){const b=Buffer.from(part);size+=b.length;if(size>6*1024*1024)throw Object.assign(new Error('Too large'),{status:413});chunks.push(b);}return Buffer.concat(chunks);}
async function body(req){const raw=await rawBody(req);try{return JSON.parse(raw.toString()||'{}');}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}}
async function publicGet(res,url){const key=url.href;const hit=cache.get(key);if(hit&&hit.until>Date.now()){res.writeHead(hit.status,{'Content-Type':hit.type,'Cache-Control':'no-store'});res.end(hit.bytes);return;}
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{Accept:'application/json'}});const bytes=Buffer.from(await response.arrayBuffer());const type=response.headers.get('content-type')||MIME['.json'];if(response.ok){if(cache.size>300)cache.clear();cache.set(key,{status:response.status,type,bytes,until:Date.now()+10000});}res.writeHead(response.status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);
}
export async function handler(req,res){try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/raffle/overview'){
  if(req.method!=='GET'){json(res,405,{error:'GET required'});return;}
  try{json(res,200,await raffleOverview());}catch(error){json(res,502,{error:'Live giveaway index unavailable',detail:error.message});}return;
 }
 if(url.pathname==='/api/wallet/holding'){
  if(req.method!=='GET'){json(res,405,{error:'GET required'});return;}
  const wallet=url.searchParams.get('wallet')||'',mint=url.searchParams.get('mint')||'',valid=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if(!valid.test(wallet)||!valid.test(mint)){json(res,400,{error:'Valid wallet and mint required'});return;}
  try{const rpcUrl=process.env.LOOT_RPC_URL||'https://api.mainnet-beta.solana.com';const upstream=await fetch(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',params:[wallet,{mint},{encoding:'jsonParsed'}]}),signal:AbortSignal.timeout(12000)});if(!upstream.ok)throw new Error('RPC provider returned '+upstream.status);const payload=await upstream.json();if(payload.error)throw new Error(payload.error.message||'RPC read failed');const accounts=payload.result?.value||[];let amount=0;for(const account of accounts)amount+=Number(account.account?.data?.parsed?.info?.tokenAmount?.uiAmountString||0);json(res,200,{wallet,mint,amount,accounts:accounts.length,source:'solana-rpc',readOnly:true,lpExcluded:false});}catch(error){json(res,502,{error:'Token balance read unavailable',detail:error.message});}return;
 }
 if(url.pathname==='/api/tokens'&&req.method==='GET'){const data=await indexedCoins();json(res,200,{ok:true,tokens:data.coins,source:'verifd-supabase-index'});return;}
 if(url.pathname==='/api/coins'&&req.method==='GET'){const data=await indexedCoins();json(res,200,data);return;}
 if(url.pathname.startsWith('/api/coins/')&&req.method==='GET'){const mint=url.pathname.split('/').pop();const data=await indexedCoins();const coin=data.coins.find(c=>c.mint===mint);if(!coin){json(res,404,{error:'Coin not indexed'});return;}json(res,200,coin);return;}if(url.pathname==='/api/deploy'||url.pathname==='/api/deploy/confirm'){
  if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
  const result=url.pathname.endsWith('/confirm')?await directConfirm(await body(req)):await directPrepare(req);
  json(res,200,result);return;
 }
 if(url.pathname.startsWith('/api/market/')){if(req.method!=='GET'){json(res,405,{error:'GET required'});return;}try{json(res,200,await marketRead(url));}catch(error){if(error.status===404){json(res,200,{state:'awaiting',mint:url.searchParams.get('token')||url.pathname.split('/').pop(),message:error.message,source:'public-market-provider'});}else json(res,error.status||502,{error:error.message});}return;}
 if(url.pathname==='/api/health'){json(res,200,{status:'ok',application:'rome-launchpad',publicReads:true,operatorWritesConfigured:true,launchBackend:'direct-pump-v2-custom-quote',pairMint:'3PoPcQKmU9aXUoA6bk2xYkc6D3EfLUkCEabuEdLBpump',rpcConfigured:Boolean(process.env.PUMP_RPC_URL||process.env.LOOT_RPC_URL)});return;}
 if(url.pathname==='/api/rpc'){
  if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}const payload=await body(req);const list=Array.isArray(payload)?payload:[payload];if(list.length>30||list.some(p=>!RPC_METHODS.has(p?.method))){json(res,403,{error:'Only public read-only RPC methods are enabled. No transaction was submitted.'});return;}
  const response=await fetch(process.env.LOOT_RPC_URL||'https://api.mainnet-beta.solana.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||MIME['.json'],'Cache-Control':'no-store'});res.end(Buffer.from(await response.arrayBuffer()));return;
 }
 if(url.pathname==='/api/prices'){
  if(req.method!=='GET'){json(res,405,{error:'GET required'});return;}const mint=url.searchParams.get('token');if(!mint||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)){json(res,400,{error:'Invalid token mint'});return;}
  const response=await fetch('https://api.dexscreener.com/tokens/v1/solana/'+mint,{signal:AbortSignal.timeout(10000)});if(!response.ok){json(res,response.status,{error:'Public price provider unavailable'});return;}const pairs=await response.json();const valid=(Array.isArray(pairs)?pairs:[]).filter(p=>p.chainId==='solana'&&p.baseToken?.address===mint&&Number(p.priceUsd)>0).sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0));if(!valid.length){json(res,404,{error:'No exact-mint public price available'});return;}json(res,200,{price:Number(valid[0].priceUsd),source:'dexscreener',mint,pairAddress:valid[0].pairAddress});return;
 }
 if(url.pathname.startsWith('/api/')&&req.method!=='GET'){json(res,501,{error:'This operation requires an independently configured Loot operator backend. No launch, transfer, claim or redemption was submitted.'});return;}
 const data=await inventory();
 if(url.pathname.startsWith('/api/')){
  if(req.method!=='GET'){json(res,501,{error:'This operation requires an independently configured Loot operator backend. No launch, transfer, claim or redemption was submitted.'});return;}
  const rules=data.publicGetPatterns||['^/api/stats$','^/api/coins$','^/api/coins/brands$','^/api/session$'];
  if(!rules.some(p=>new RegExp(p).test(url.pathname))){json(res,501,{error:'This service is not configured for independent operation'});return;}
  if(url.search.length>2500){json(res,400,{error:'Query too large'});return;}
  const allowed=url.pathname==='/api/coins'?new Set(['sort','limit','offset','card','payout','q','creator']):url.pathname.endsWith('/payouts')||url.pathname==='/api/loot/burns'?new Set(['offset']):new Set();
  for(const [key,value] of url.searchParams){
   if(!allowed.has(key)){json(res,400,{error:'Unsupported public query parameter'});return;}
   if((key==='limit'&&(!/^\d+$/.test(value)||Number(value)<1||Number(value)>100))||(key==='offset'&&(!/^\d+$/.test(value)||Number(value)>100000))||(key==='sort'&&!['top','new','old'].includes(value))||(key==='payout'&&!['dividends','giveaway'].includes(value))||(key==='creator'&&!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value))||(key==='card'&&!/^[a-z0-9-]{1,32}$/.test(value))||(key==='q'&&value.length>128)){json(res,400,{error:'Invalid public query value'});return;}
  }
  await publicGet(res,new URL(url.pathname+url.search,'https://loot.family'));return;
 }
 if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Read-only resource'});return;}
 const optimized=data.assets.find(a=>a.url==='https://loot.family'+url.pathname+url.search||a.url==='https://loot.family'+url.pathname);
 let file=optimized?path.join(ROOT,'dist',optimized.localPath.replace(/^\//,'')):safeFile(path.join(ROOT,'dist'),url.pathname);
 if(!file){json(res,400,{error:'Invalid path'});return;}
 let info;try{info=await stat(file);if(!info.isFile())throw new Error('not file');}catch{
  if(path.extname(url.pathname)&&!url.pathname.endsWith('/')){json(res,404,{error:'Asset not captured'});return;}
  file=path.join(ROOT,'dist/index.html');info=await stat(file);
 }
 const bytes=await readFile(file);let status=200;const headers={'Content-Type':MIME[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':url.pathname.startsWith('/assets/')?'public,max-age=3600':'no-cache'};
 let result=bytes;
 if(headers['Content-Type'].startsWith('video/')){headers['Accept-Ranges']='bytes';const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(match){const start=Number(match[1]);const end=match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;if(start>=bytes.length||end<start){res.writeHead(416,{'Content-Range':'bytes */'+bytes.length});res.end();return;}status=206;result=bytes.subarray(start,end+1);headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;}}
 headers['Content-Length']=result.length;res.writeHead(status,headers);res.end(req.method==='HEAD'?undefined:result);
 }catch(error){console.error('[api]',error);json(res,error.status||502,{error:error.status===400?error.message:'Service unavailable',detail:error.status===400?undefined:error.message});}}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))http.createServer(handler).listen(Number(process.env.PORT)||5174,'0.0.0.0',()=>console.log('Loot running on http://localhost:'+(process.env.PORT||5174)));
