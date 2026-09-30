/* Pure derived comparison; no writes to source prices, specs, history or PX data. */
(function(root){
 const price=typeof module!=='undefined'&&module.exports?require('./competitor-price-core'):root.CompetitorPrice;
 const promo=typeof module!=='undefined'&&module.exports?require('./px-promo-core'):root.PXPromo;
 const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
 const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
 // User confirmed 2026-10-01: OP cling-film package 尺 means imperial feet.
 // Only the explicitly mapped PX cling films opt into this policy, never competitor data.
 function pxSpecText(text){return price.normalize(text).replace(/(\d+(?:\.\d+)?)\s*尺/g,(_,n)=>Number(n)*0.3048+'m');}
 function getNormalizedUnitMetrics(product,effectivePrice,source={}){
  const structured=product.spec&&typeof product.spec==='object'?product.spec:{};
  const sourceText=product.specText||(typeof product.spec==='string'?product.spec:'')||source.specText||source.sourceName||product.name||product.productName||'';
  const specText=source.pxImperialFeet?pxSpecText(sourceText):sourceText;
  const parsed=price.parseSpec(specText),fields={...source,...structured,...product};let reliable=true;
  const dimension=key=>{if(!own(fields,key))return parsed[key];const value=fields[key];if(value==null)return null;if(!positive(value)||(key==='packQuantity'&&!Number.isInteger(value))){reliable=false;return null;}return value;};
  const widthCm=dimension('widthCm'),lengthM=dimension('lengthM');let packQuantity=dimension('packQuantity');
  // Ambiguous carton/selling-unit labels may only be resolved with explicit source quantity.
  if(source.sellingQuantityUnknown&&!own(fields,'packQuantity')&&!/\d+\s*(?:支|卷)/.test(sourceText))packQuantity=null;
  const derivedTotal=positive(lengthM)&&positive(packQuantity)?lengthM*packQuantity:null;
  let totalLengthM=derivedTotal;
  if(own(fields,'totalLengthM')){totalLengthM=positive(fields.totalLengthM)?fields.totalLengthM:null;if(fields.totalLengthM!=null&&!positive(fields.totalLengthM))reliable=false;if(totalLengthM!==null&&derivedTotal!==null&&Math.abs(totalLengthM-derivedTotal)>1e-9*Math.max(1,totalLengthM))reliable=false;}
  const validPrice=positive(effectivePrice)?effectivePrice:null;
  const units=price.units(reliable?validPrice:null,{widthCm,lengthM,packQuantity,totalLengthM});
  return {sourceText,specText,widthCm,lengthM,packQuantity,totalLengthM,material:product.material||source.material||price.material(sourceText)||null,reliable,effectivePrice:validPrice,...units};
 }
 function getPxBenchmark(product,activePeriod,source={}){
  const best=promo.bestAverageUnitPrice(activePeriod),effectivePrice=positive(best)?best:null;
  const winningPromotions=(activePeriod?.promotions||[]).filter(p=>p.promotionType!=='UNKNOWN'&&positive(p.averageUnitPrice)&&p.averageUnitPrice===effectivePrice);
  return {...getNormalizedUnitMetrics(product,effectivePrice,source),productName:product.name,productCode:product.code||'',period:activePeriod||null,winningPromotions,promotions:activePeriod?.promotions||[],priceBasis:'PX_BEST_AVERAGE'};
 }
 function getCompetitorMetrics(product){
  const usePromotion=positive(product.effectiveAverageUnitPrice),effectivePrice=usePromotion?product.effectiveAverageUnitPrice:positive(product.currentPrice)?product.currentPrice:null;
  return {...getNormalizedUnitMetrics(product,effectivePrice),priceBasis:usePromotion?'PROMOTION_AVERAGE':'CURRENT_PRICE'};
 }
 function getPreferredComparisonMetric(px,competitor){
  if(!px.reliable||!competitor.reliable||!positive(px.effectivePrice)||!positive(competitor.effectivePrice))return null;
  if(positive(px.widthCm)&&positive(competitor.widthCm)&&positive(px.totalLengthM)&&positive(competitor.totalLengthM)&&positive(px.pricePerSquareMeter)&&positive(competitor.pricePerSquareMeter))return 'AREA';
  if(positive(px.totalLengthM)&&positive(competitor.totalLengthM)&&positive(px.pricePer10M)&&positive(competitor.pricePer10M))return 'LENGTH';
  return null;
 }
 function comparePxToCompetitor(px,product){
  const competitor=getCompetitorMetrics(product),metric=getPreferredComparisonMetric(px,competitor);
  const specMismatch=['widthCm','lengthM','packQuantity'].some(key=>positive(px[key])&&positive(competitor[key])&&px[key]!==competitor[key]);
  const materialMismatch=Boolean(px.material&&competitor.material&&price.key(px.material)!==price.key(competitor.material));
  let reason=null;if(!positive(px.effectivePrice))reason='PX_PRICE_MISSING';else if(!positive(competitor.effectivePrice))reason='COMPETITOR_PRICE_MISSING';else if(!px.reliable||!competitor.reliable)reason='UNRELIABLE_SPEC';else if(!positive(px.totalLengthM))reason='PX_LENGTH_MISSING';else if(!positive(competitor.totalLengthM))reason='COMPETITOR_LENGTH_MISSING';
  const base={metric,pxValue:null,competitorValue:null,difference:null,percentage:null,direction:'UNAVAILABLE',specMismatch,materialMismatch,reason,competitor};
  if(!metric)return base;
  const field=metric==='AREA'?'pricePerSquareMeter':'pricePer10M',pxValue=px[field],competitorValue=competitor[field],difference=competitorValue-pxValue,percentage=difference/pxValue*100;
  const same=Math.abs(difference)<=Number.EPSILON*8*Math.max(1,Math.abs(pxValue),Math.abs(competitorValue));
  if(!Number.isFinite(percentage)||!Number.isFinite(difference))return {...base,metric:null,reason:'INVALID_VALUE'};
  return {...base,pxValue,competitorValue,difference:same?0:difference,percentage:same?null:percentage,direction:same?'SAME':difference>0?'HIGHER':'LOWER'};
 }
 function sortCompetitors(records,mode='default',benchmark=null){
  const defaultOrder=(a,b)=>a.retailer.localeCompare(b.retailer,'zh-Hant')||a.brand.localeCompare(b.brand,'zh-Hant')||a.productName.localeCompare(b.productName,'zh-Hant');
  const rows=records.map(product=>({product,units:getCompetitorMetrics(product),comparison:benchmark?comparePxToCompetitor(benchmark,product):null}));
  const rank=c=>c?.direction==='UNAVAILABLE'||!c?2:c.metric==='AREA'?0:1;
  const value=(a,b,field)=>(a.units[field]===null)-(b.units[field]===null)||(a.units[field]??0)-(b.units[field]??0);
  rows.sort((a,b)=>mode==='difference'?rank(a.comparison)-rank(b.comparison)||(rank(a.comparison)===2?0:a.comparison.difference-b.comparison.difference)||defaultOrder(a.product,b.product):mode==='per10m'?value(a,b,'pricePer10M')||defaultOrder(a.product,b.product):mode==='area'?value(a,b,'pricePerSquareMeter')||defaultOrder(a.product,b.product):defaultOrder(a.product,b.product));
  return rows.map(row=>row.product);
 }
 const api={positive,pxSpecText,getNormalizedUnitMetrics,getPxBenchmark,getCompetitorMetrics,getPreferredComparisonMetric,comparePxToCompetitor,sortCompetitors};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompetitorComparison=api;
})(typeof globalThis!=='undefined'?globalThis:this);
