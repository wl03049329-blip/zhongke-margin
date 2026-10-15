/* Lookup-only adapters. Never supplies calculator inputs or changes source records. */
(function(root){
 'use strict';
 const promo=typeof module==='object'&&module.exports?require('./px-promo-core'):root.PXPromo;
 const comparison=typeof module==='object'&&module.exports?require('./competitor-comparison-core'):root.CompetitorComparison;
 const publicPrice=typeof module==='object'&&module.exports?require('./competitor-price-core'):root.CompetitorPrice;
 const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
 const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/\s/g,'');
 const qualification=o=>['GENERAL','FREE_MEMBER','OTHER'].includes(o.qualification)?o.qualification:'UNKNOWN';
 function offer(p,context={}){
  const q=p.receiveQuantity,total=p.promotionPrice;
  if(p.promotionType==='UNKNOWN'||!Number.isInteger(q)||q<1||!positive(total)||!positive(p.averageUnitPrice)||Math.abs(total/q-p.averageUnitPrice)>1e-8)return null;
  return {average:p.averageUnitPrice,total,quantity:q,label:p.label||'已記錄方案',original:positive(context.original)?context.original:null,
   startDate:context.startDate||null,endDate:context.endDate||null,observedAt:context.observedAt||null,
   qualification:qualification(p),eligibility:p.eligibility||'',platform:p.platform||context.platform||'',
   restrictions:p.restrictions||'',restrictionsVerified:p.restrictionsVerified===true,
   verified:context.verified===true,source:context.source||'',optional:p.optional===true};
 }
 function ownOffers(period){return (period?.promotions||[]).map(p=>offer(p,{startDate:period.startDate,endDate:period.endDate,verified:true,source:'PX 檔期資料',platform:'PX'})).filter(Boolean);}
 function publicOffers(record){
  // Existing snapshots do not prove membership eligibility or an effective date range.
  // Do not infer either from scrape date, coupon prose, or a low average alone.
  const ctx={startDate:record.validFrom,endDate:record.validTo,observedAt:record.observedAt,original:record.originalPrice,platform:record.retailer,source:record.sourceUrl,verified:publicPrice.safeUrl(record.sourceUrl)};
  if(Array.isArray(record.verifiedOffers))return record.verifiedOffers.map(p=>offer(p,{...ctx,verified:p.verified===true&&ctx.verified})).filter(Boolean);
  const text=String(record.promotionText||'').trim(),parsed=promo.parse(text);
  // Exact formats already supported by the public-price engine. Quantity is a
  // single stated bundle, never an inferred unlimited/repeated promotion.
  const average=publicPrice.effectiveAverage(record.currentPrice,text),bundle=text.match(/^(\d+)件\s*\$?(\d+(?:\.\d+)?)$/);
  if(bundle&&positive(average))return [offer({promotionType:'MULTI_BUY',label:text,receiveQuantity:Number(bundle[1]),promotionPrice:Number(bundle[2]),averageUnitPrice:average},ctx)].filter(Boolean);
  if(positive(average)&&(/^(?:任選)?買1送1$/.test(text)||/^第二件(?:5折|半價)$/.test(text))){const result=promo.parse(/^第二件/.test(text)?`單特 $${record.currentPrice} 第二件5折`:`$${record.currentPrice} ${text}`);return result.promotions.map(p=>offer(p,ctx)).filter(Boolean);}
  const exact=/^(?:(?:IP|DM)\s*)?(?:\$?\d+(?:\.\d+)?|(?:單|二|三|四|五|六|\d+)特\s*\$?\d+(?:\.\d+)?|(?:任選\s*)?買\d+送\d+\s*\$\d+(?:\.\d+)?|\$\d+(?:\.\d+)?\s*(?:任選\s*)?買\d+送\d+|任選\s*\d+件\s*\$\d+(?:\.\d+)?)$/;
  const known=exact.test(text)&&parsed.warnings.length===0&&parsed.promotions.every(p=>p.promotionType!=='UNKNOWN');
  if(known)return parsed.promotions.map(p=>offer(p,ctx)).filter(Boolean);
  if(positive(record.effectiveAverageUnitPrice))return [{average:record.effectiveAverageUnitPrice,total:null,quantity:null,label:text||'公開促銷均價',...ctx,qualification:'UNKNOWN',restrictionsVerified:false,original:record.originalPrice??null}];
  if(!positive(record.currentPrice))return [];
  return [offer({promotionType:'SINGLE',label:'公開標價',receiveQuantity:1,promotionPrice:record.currentPrice,averageUnitPrice:record.currentPrice,qualification:record.qualification,eligibility:record.eligibility,platform:record.retailer,restrictionsVerified:record.restrictionsVerified},ctx)];
 }
 function best(offers,group,date){const rows=offers.filter(o=>o&&positive(o.average)&&o.qualification===group&&(group==='UNKNOWN'||o.verified&&o.restrictionsVerified&&(group!=='FREE_MEMBER'||o.eligibility&&o.platform))&&(!date||group==='UNKNOWN'||dateOK(o.startDate)&&dateOK(o.endDate)&&o.startDate<=date&&o.endDate>=date));return rows.sort((a,b)=>a.average-b.average)[0]||null;}
 function reference(offers){return offers.filter(o=>o&&['GENERAL','UNKNOWN'].includes(o.qualification)).sort((a,b)=>a.average-b.average)[0]||null;}
 function minimumPairs(baseOffers,otherOffers,date){
  const general=[best(baseOffers,'GENERAL',date),best(otherOffers,'GENERAL',date)],member=[best(baseOffers,'FREE_MEMBER',date),best(otherOffers,'FREE_MEMBER',date)];
  const unknown=[best(baseOffers,'UNKNOWN'),best(otherOffers,'UNKNOWN')];
  return {primary:general.every(Boolean)?general:unknown.every(Boolean)?unknown:null,primaryLabel:general.every(Boolean)?'一般價格參考':'資格未確認價格參考',member:member.every(Boolean)?member:null};
 }
 function eligible(o,date,quantity,group){return Boolean(o&&dateOK(date)&&Number.isInteger(quantity)&&quantity>0&&o.verified&&o.restrictionsVerified&&o.qualification===group&&['GENERAL','FREE_MEMBER'].includes(group)&&(!o.optional)&&o.quantity===quantity&&dateOK(o.startDate)&&dateOK(o.endDate)&&o.startDate<=date&&o.endDate>=date&&(group!=='FREE_MEMBER'||(o.eligibility&&o.platform)));}
 function selectFormal(offers,date,quantity,group){return offers.filter(o=>eligible(o,date,quantity,group)).sort((a,b)=>a.average-b.average)[0]||null;}
 function unavailableReason(offers,date,quantity,group){
  if(!dateOK(date)||!Number.isInteger(quantity)||quantity<1)return '請填寫有效日期與正整數件數';
  if(!offers.length)return '目前無有效價格';
  const groupOffers=offers.filter(o=>o.qualification===group);
  if(!groupOffers.length)return group==='FREE_MEMBER'?'未查得會員價':'優惠資格尚未確認';
  if(!groupOffers.some(o=>dateOK(o.startDate)&&dateOK(o.endDate)&&o.startDate<=date&&o.endDate>=date))return '比較日期的價格有效性未確認';
  if(!groupOffers.some(o=>o.quantity===quantity))return '沒有相同購買件數的已確認方案（不推算重複優惠）';
  return '優惠限制或適用商品尚待確認';
 }
 function grade(base,record,candidate){
  if(!candidate)return {level:3,reason:'用途或品類未確認，僅供人工參考'};
  const c=comparison.comparePxToCompetitor(base,record);
  if(!['CLING_FILM','FOIL','BAKING_PAPER'].includes(base.lookupCategory)||!c.metric)return {level:3,reason:'相同用途候選；規格不足，無法公平換算'};
  if(c.materialMismatch)return {level:3,reason:'材質不同，僅供人工參考'};
  return c.specMismatch?{level:2,reason:'相同用途，不同規格；可換算單位價'}:{level:1,reason:'相同用途與已確認規格'};
 }
 function compare(base,record,baseOffer,otherOffer){
  if(!baseOffer||!otherOffer)return null;
  const unit=comparison.getNormalizedUnitMetrics(base,baseOffer.average);
  return comparison.comparePxToCompetitor({...base,...unit},{...record,currentPrice:otherOffer.average,effectiveAverageUnitPrice:otherOffer.average});
 }
 function rank(base,rows,{date,quantity,group}){
  const b=selectFormal(base.offers,date,quantity,group);
  const evaluated=rows.map(row=>{const o=selectFormal(row.offers,date,quantity,group),c=compare(base.benchmark,row.record,b,o);
   const reason=row.level===3?'僅供參考，不參與排名':!b?('OP：'+unavailableReason(base.offers,date,quantity,group)):!o?unavailableReason(row.offers,date,quantity,group):!c?.metric?'規格不足，無法公平換算':null;
   return {...row,selectedOffer:o,comparison:reason?null:c,reason};});
  // AREA and LENGTH are separate ranking groups. Never rank unlike unit values.
  for(const metric of ['AREA','LENGTH']){const groupRows=evaluated.filter(r=>r.comparison?.metric===metric),values=groupRows.flatMap(r=>[r.comparison.pxValue,r.comparison.competitorValue]);const min=values.length?Math.min(...values):null;for(const row of groupRows){row.lowest=Math.abs(row.comparison.competitorValue-min)<1e-9;row.opLowest=Math.abs(row.comparison.pxValue-min)<1e-9;}}
  return evaluated;
 }
 function validatePersonal(raw,known){
  if(!raw||raw.version!==1||!Array.isArray(raw.favorites)||!Array.isArray(raw.sets)||raw.favorites.length>300||raw.sets.length>100)throw new Error('匯入格式或數量不符');
  const valid=new Set(known.map(p=>p.id)),own=new Set(known.filter(p=>p.kind==='own').map(p=>p.id)),market=new Set(known.filter(p=>p.kind==='market').map(p=>p.id));
  const text=(v,n)=>typeof v==='string'?v.slice(0,n):'';
  const favorites=[...new Map(raw.favorites.filter(p=>p&&valid.has(p.id)).map(p=>[p.id,{id:p.id,note:text(p.note,240)}])).values()];
  const sets=raw.sets.filter(s=>s&&own.has(s.baseId)&&Array.isArray(s.ids)).map((s,i)=>({id:text(s.id,80)||'import-'+i,name:text(s.name,80)||'未命名比較',baseId:s.baseId,ids:[...new Set(s.ids.filter(id=>market.has(id)))].slice(0,5)}));
  const dedup=[...new Map(sets.map(s=>[s.id,s])).values()];
  return {version:1,favorites,sets:dedup,lastBase:own.has(raw.lastBase)?raw.lastBase:null,recent:Array.isArray(raw.recent)?[...new Set(raw.recent.filter(v=>typeof v==='string').map(v=>v.slice(0,100)))].slice(0,8):[]};
 }
 const api={positive,dateOK,norm,offer,ownOffers,publicOffers,best,reference,minimumPairs,eligible,selectFormal,unavailableReason,grade,compare,rank,validatePersonal};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PriceCenter=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
