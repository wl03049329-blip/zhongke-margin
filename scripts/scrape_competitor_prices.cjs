const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),core=require('../competitor-price-core'),{read,save,root}=require('./competitor-price-import.cjs');
const text=html=>core.normalize(String(html||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))));
function parseProduct(html,url,retailer,category='CLING_FILM'){
 const scripts=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{const json=JSON.parse(m[1]);return Array.isArray(json)?json:json['@graph']||[json]}catch{return []}}),p=scripts.find(s=>s['@type']==='Product');
 if(!p||!p.offers||Array.isArray(p.offers))throw Error('PUBLIC_PRODUCT_OFFER_MISSING');
 const price=Number(p.offers.price),visible=html.match(/class="money"[^>]*>\s*([\d.]+)\s*</)?.[1];if(!Number.isFinite(price)||price<=0||visible&&Number(visible)!==price)throw Error('PRICE_FIELDS_DISAGREE_OR_INVALID');
 if(p.offers.priceCurrency!=='TWD')throw Error('UNSUPPORTED_CURRENCY');
 const urlId=url.match(/\/(\d+)\.html$/)?.[1];if(urlId&&String(p.sku||p.mpn||'')!==urlId)throw Error('RETAILER_PRODUCT_ID_MISMATCH');
 const h1=text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);const categoryPattern={CLING_FILM:/保鮮膜/,FOIL:/鋁箔/,BAKING_PAPER:/料理紙|烘焙紙/}[category];
 if(h1!==core.normalize(p.name)||!categoryPattern||!categoryPattern.test(h1)||/膜罩|組合包|鋁箔(?:盤|深盤|板)|吸油紙|廚房紙巾|氣炸鍋/.test(h1))throw Error('PRODUCT_NAME_OR_CATEGORY_MISMATCH');
 if(/\d\s*\+\s*\d/.test(h1))throw Error('AMBIGUOUS_BONUS_LENGTH');
 const sourceSpec=text(html.match(/◎規格[：:]([\s\S]*?)<\/span>/)?.[1]);
 const pack=sourceSpec.match(/^1PC(?:支|個)\s*x\s*1\s*x\s*(\d+)PC(?:支|個)$/i)?.[1]||sourceSpec.match(/^\d+(?:\.\d+)?M米\s*x\s*1\s*x\s*(\d+)PC(?:支|個)$/i)?.[1];
 // Only clearly labelled roll length in a title is normalized; raw evidence remains visible.
 const measureName=h1.replace(/-(\d+(?:\.\d+)?m)\b/ig,' $1');
 const cmOnly=category==='FOIL'&&[...measureName.matchAll(/(\d+(?:\.\d+)?)\s*cm/ig)];
 const normalizedSpec=cmOnly&&cmOnly.length===1&&Number(cmOnly[0][1])>=100&&!/\d\s*m\b/i.test(measureName)?measureName.replace(/(\d+(?:\.\d+)?)\s*cm/ig,(_,n)=>Number(n)/100+'m'):measureName;
 const specText=pack?`${normalizedSpec}／${pack}入`:h1+'／'+sourceSpec;
 const spec=core.parseSpec(specText);if(!pack)spec.packQuantity=null; // Unknown pack convention must not masquerade as one roll.
 if(!pack)throw Error('PACK_QUANTITY_UNVERIFIED');
 const original=html.match(/class="original-p"[^>]*>\s*\$\s*([\d.]+)\s*</)?.[1];
 const promotionText=[...html.matchAll(/class="active-desc"[^>]*>([\s\S]*?)<\/div>/g)].map(m=>text(m[1])).join('\n');
 return {retailer,retailerProductId:String(p.sku||p.mpn||''),brand:(typeof p.brand==='string'?p.brand:p.brand?.name)||h1.match(/^(OP|楓康|興家)/)?.[1],productName:h1,category,specText,sourceSpecText:h1+'／'+sourceSpec,currentPrice:price,originalPrice:original===undefined?null:Number(original),promotionText,sourceUrl:url,availability:String(p.offers.availability||'').split('/').pop()||'UNKNOWN',material:core.material(h1+' '+text(p.description)),sourceMethod:'PUBLIC_HTML',observedAt:new Date().toISOString(),evidenceSHA256:crypto.createHash('sha256').update(html).digest('hex')};
}
function robotsAllowed(robots,url){const path=new URL(url).pathname+new URL(url).search;let relevant=false;const rules=[];for(const line of robots.split(/\r?\n/)){const m=line.split('#')[0].trim().match(/^(User-agent|Disallow|Allow):\s*(.*)$/i);if(!m)continue;if(m[1].toLowerCase()==='user-agent')relevant=m[2]==='*';else if(relevant&&m[2]){const pattern=m[2].replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');if(new RegExp('^'+pattern).test(path))rules.push({allow:m[1].toLowerCase()==='allow',length:m[2].length});}}return !rules.length||rules.sort((a,b)=>b.length-a.length||Number(b.allow)-Number(a.allow))[0].allow;}
async function publicGet(url){const res=await fetch(url,{headers:{'User-Agent':'PXWorkbenchPriceRadar/1.0 (public price observation; no account access)'},signal:AbortSignal.timeout(20000),redirect:'error'});if(!res.ok)throw Error('HTTP_'+res.status);return res.text();}
async function run(){
 const existing=read('competitor-prices.json',[]),history=read('competitor-price-history.json',{}),priorRuntime=read('competitor-runtime.json',{}),rows=[],sourceAudit=[];
 for(const source of read('competitor-sources.json',[])){
  let robots;try{robots=await publicGet(source.robotsUrl)}catch(error){sourceAudit.push({retailer:source.retailer,status:'ROBOTS_UNAVAILABLE',error:error.message});}
  for(const url of source.productUrls){const id=core.productId({retailer:source.retailer,retailerProductId:url.match(/\/(\d+)\.html$/)?.[1]});try{if(!core.safeUrl(url)||new URL(url).origin!==new URL(source.baseUrl).origin||!robots||!robotsAllowed(robots,url))throw Error('SOURCE_NOT_ALLOWED');const html=await publicGet(url);if(/<title[^>]*>[^<]*(?:captcha|access denied|just a moment)/i.test(html))throw Error('BOT_CHALLENGE_STOP');rows.push(parseProduct(html,url,source.retailer,source.category));sourceAudit.push({url,status:'SUCCESS',method:'PUBLIC_HTML_JSON_LD',noLogin:true});}catch(error){rows.push({competitorProductId:id,error:error.message,lastSuccessAt:priorRuntime[id]?.lastSuccessAt});sourceAudit.push({url,status:'FAILED',error:error.message});}await new Promise(r=>setTimeout(r,1000));}
 }
 const result=core.applyObservations(existing,history,rows);result.runtime={...priorRuntime,...result.runtime};save(result);
 fs.writeFileSync(path.join(root,'COMPETITOR_SOURCE_AUDIT.json'),JSON.stringify({observedAt:new Date().toISOString(),sources:sourceAudit},null,2)+'\n');console.log(JSON.stringify(result.report,null,2));
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});module.exports={parseProduct,robotsAllowed,publicGet,run};
