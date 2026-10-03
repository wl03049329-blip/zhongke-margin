/* Public POYA product HTML adapter. No API, account access or invented prices. */
const crypto=require('node:crypto'),core=require('../competitor-price-core');
const clean=value=>core.normalize(String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' '));
function stringField(html,name){const match=html.match(new RegExp('"'+name+'":"((?:\\\\.|[^"\\\\])*)"'));return match?JSON.parse('"'+match[1]+'"'):null;}
function numberField(html,name){const match=html.match(new RegExp('"'+name+'":([0-9.]+)'));return match?Number(match[1]):null;}
function parsePoya(html,url,expected){
 const u=new URL(url);if(u.origin!=='https://www.poyabuy.com.tw'||u.pathname!=='/SalePage/Index/'+expected.id||u.search)throw Error('POYA_SOURCE_NOT_ALLOWED');
 if(!html.includes('POYA寶雅線上買')||/<title[^>]*>[^<]*(?:captcha|access denied|just a moment)/i.test(html))throw Error('PUBLIC_PAGE_UNAVAILABLE');
 const name=stringField(html,'Title'),meta=html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1];
 const itemPrice=Number(html.match(/<meta\s+itemprop="price"\s+content="([\d.]+)"/i)?.[1]),minimum=numberField(html,'MinPrice'),maximum=numberField(html,'MaxPrice');
 // The public page's displayed price, OG title and variant range must agree.
 if(name!==expected.name||!name.startsWith(expected.brand)||meta!==name+' NT$'+core.money(itemPrice))throw Error('POYA_PRODUCT_IDENTITY_MISMATCH');
 if(!Number.isFinite(itemPrice)||itemPrice<=0||minimum!==itemPrice||maximum!==itemPrice)throw Error('POYA_PRICE_FIELDS_DISAGREE_OR_VARIANTS');
 if(!/"IsPurchaseExtra":false/.test(html)||/"IsAPPOnly":true/.test(html))throw Error('POYA_CONDITIONAL_PRICE_REJECTED');
 const ld=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{const p=JSON.parse(m[1]);return Array.isArray(p)?p:[p]}catch{return []}}).find(p=>p['@type']==='Product');
 // Some pages contain invalid JSON-LD (a literal newline inside description).
 // Never repair it; independently corroborated public HTML is the fallback.
 const declaredSku=ld?.sku||html.match(/"sku"\s*:\s*"(\d+)"/)?.[1],declaredPrice=ld?Number(ld.offers?.price):Number(html.match(/"price"\s*:\s*"?([\d.]+)"?/)?.[1]);
 if(String(declaredSku)!==String(expected.id)||declaredPrice!==itemPrice||ld&&ld.name!==name||!html.match(/"priceCurrency"\s*:\s*"TWD"/))throw Error('POYA_STRUCTURED_PRICE_MISMATCH');
 const short=clean(stringField(html,'ShortDescription')),breadcrumb=clean(stringField(html,'ShopCategory_ShowName'));
 const sourceSpecText=[name,breadcrumb,short].filter(Boolean).join('／');
 const availability=ld?.offers?.availability?.split('/').pop()||html.match(/"availability"\s*:\s*"https:\/\/schema.org\/(\w+)"/)?.[1]||'UNKNOWN';
 if(availability!=='InStock'||/"StatusDef":"(?:OffShelf|Closed)"/.test(html))throw Error('POYA_PRICE_NOT_CURRENTLY_AVAILABLE');
 const original=numberField(html,'MinSuggestPrice'),maxOriginal=numberField(html,'MaxSuggestPrice');
 return {retailer:'寶雅',retailerProductId:String(expected.id),brand:expected.brand,productName:name,category:expected.category,specText:name,sourceSpecText,currentPrice:itemPrice,originalPrice:original>0&&original===maxOriginal?original:null,promotionText:'',sourceUrl:url,availability,material:null,sourceMethod:'PUBLIC_HTML',observedAt:new Date().toISOString(),eligibleProductCodes:expected.eligibleProductCodes,matchReason:expected.reason,unitConversionVerified:false,evidenceSHA256:crypto.createHash('sha256').update(html).digest('hex'),priceEvidence:ld?'VISIBLE_META_OG_VARIANTS_JSON_LD':'VISIBLE_META_OG_VARIANTS'};
}
async function collect(source,{publicGet,robotsAllowed,priorRuntime={},delay=1000}){
 if(source.retailer!=='寶雅'||source.baseUrl!=='https://www.poyabuy.com.tw'||source.robotsUrl!==source.baseUrl+'/robots.txt')throw Error('POYA_SOURCE_CONFIG_INVALID');
 const rows=[],audit=[],robots=await publicGet(source.robotsUrl);
 for(const product of source.products){const url=source.baseUrl+'/SalePage/Index/'+product.id,id=core.productId({retailer:'寶雅',retailerProductId:product.id});try{
  if(!robotsAllowed(robots,url))throw Error('ROBOTS_NOT_ALLOWED');
  const html=await publicGet(url),row=parsePoya(html,url,product);rows.push(row);audit.push({url,status:'SUCCESS',price:row.currentPrice,productName:row.productName,evidenceSHA256:row.evidenceSHA256,priceEvidence:row.priceEvidence,noLogin:true});
 }catch(error){rows.push({competitorProductId:id,error:error.message,lastSuccessAt:priorRuntime[id]?.lastSuccessAt});audit.push({url,status:'FAILED',error:error.message});}
 await new Promise(resolve=>setTimeout(resolve,delay));}
 return {rows,audit};
}
module.exports={parsePoya,collect,stringField};
