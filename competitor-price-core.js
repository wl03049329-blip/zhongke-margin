/* Independent competitor data rules; never writes PX product/campaign data. */
(function(root){
 const normalize=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
 const key=v=>normalize(v).toLowerCase().replace(/\s/g,'');
 const money=v=>Number.isFinite(v)?Number(v.toFixed(2)).toString():'—';
 const statuses=['FRESH','STALE','FAILED','MANUAL','UNSUPPORTED'];
 function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','127.0.0.1','::1'].includes(u.hostname)}catch{return false}}
 function parseSpec(raw){
  const specText=normalize(raw),text=specText.toLowerCase().replace(/[×✕*]/g,'x'),dimensions=[...text.matchAll(/(?<![-\d.])(\d+(?:\.\d+)?)\s*(cm|公分|m|公尺)(?![a-wyz])/g)];
  const widths=dimensions.filter(m=>['cm','公分'].includes(m[2])).map(m=>Number(m[1])),lengths=dimensions.filter(m=>['m','公尺'].includes(m[2])).map(m=>Number(m[1]));
  const packs=[...text.matchAll(/(?<![-\d.])(\d+(?:\.\d+)?)\s*(?:入|卷|支)/g)].map(m=>Number(m[1]));
  const widthCm=widths.length===1&&widths[0]>0?widths[0]:null,lengthM=lengths.length===1&&lengths[0]>0?lengths[0]:null;
  const ambiguousPack=/(?:m|公尺)\s*x\s*\d+(?:\.\d+)?(?:\s|$)/.test(text)||/-\d+(?:\.\d+)?\s*(?:入|卷|支)/.test(text);
  const packQuantity=packs.length===1&&Number.isInteger(packs[0])&&packs[0]>0?packs[0]:packs.length===0&&lengthM!==null&&!ambiguousPack?1:null;
  return {specText,widthCm,lengthM,packQuantity,totalLengthM:lengthM!==null&&packQuantity!==null?lengthM*packQuantity:null};
 }
 function units(price,spec){const valid=Number.isFinite(price)&&price>0,total=spec.totalLengthM,area=spec.widthCm>0&&total>0?spec.widthCm/100*total:null;return {pricePerPiece:valid&&spec.packQuantity>0?price/spec.packQuantity:null,pricePer10M:valid&&total>0?price/total*10:null,totalAreaM2:area,pricePerSquareMeter:valid&&area>0?price/area:null};}
 function effectiveAverage(price,promotion){
  const text=normalize(promotion);let m;
  if((m=text.match(/^(\d+)件\s*\$?(\d+(?:\.\d+)?)$/)))return Number(m[1])>0&&Number(m[2])>0?Number(m[2])/Number(m[1]):null;
  if((m=text.match(/^(?:任選)?買(\d+)送(\d+)\s*\$?(\d+(?:\.\d+)?)$/)))return Number(m[1])>0&&Number(m[3])>0?Number(m[3])/(Number(m[1])+Number(m[2])):null;
  if(/^(?:任選)?買1送1$/.test(text))return price/2;
  if(/^第二件(?:5折|半價)$/.test(text))return price*.75;
  return null;
 }
 function material(text){const found=normalize(text).match(/(?:^|[^a-z])(PVDC|PVC|PE)(?![a-z])/i)?.[1];const tags=[found?.toUpperCase(),...['植材','生物分解','無氯'].filter(word=>normalize(text).includes(word))].filter(Boolean);return tags.length?tags.join('／'):null;}
 function productId(row){return row.retailerProductId?key(row.retailer)+':'+key(row.retailerProductId):[row.retailer,row.brand,row.productName,row.specText].map(key).join(':');}
 function freshness(record,runtime={},now=Date.now()){
  const status=runtime.sourceStatus||record.sourceStatus,lastSuccessAt=runtime.lastSuccessAt||record.lastSuccessAt,ageHours=(now-Date.parse(lastSuccessAt))/3600000;
  if(status==='FAILED'||status==='UNSUPPORTED')return {status,label:status==='FAILED'?'資料來源暫時無法更新':'來源目前不支援更新',lastSuccessAt};
  if(!Number.isFinite(ageHours)||ageHours<0)return {status:'STALE',label:'資料待更新',lastSuccessAt};
  const fresh=ageHours<=24;return {status:status==='MANUAL'?'MANUAL':fresh?'FRESH':'STALE',label:status==='MANUAL'?(fresh?'人工查核':'人工資料待更新'):fresh?'24 小時內更新':ageHours<=72?'資料待更新':'資料已超過 72 小時未更新',lastSuccessAt};
 }
 function validate(row){
  const errors=[],warnings=[];
  for(const field of ['retailer','brand','productName','sourceUrl'])if(!normalize(row[field]))errors.push('MISSING_'+field.toUpperCase());
  if(!safeUrl(row.sourceUrl))errors.push('INVALID_SOURCE_URL');
  if(typeof row.currentPrice!=='number'||!Number.isFinite(row.currentPrice)||row.currentPrice<=0)errors.push('INVALID_PRICE');
  if(row.originalPrice!==null&&row.originalPrice!==undefined&&(!Number.isFinite(row.originalPrice)||row.originalPrice<=0))errors.push('INVALID_ORIGINAL_PRICE');
  // Accept catalog categories for raw public prices; this grants no new unit conversion.
  if(!['CLING_FILM','FOIL','BAKING_PAPER','HEAT_BAG','ZIP_BAG','GLOVES','DISH_CLOTH','SPONGE','DRAIN_NET','DEODORANT_BAG','WIPES','DISHWASH','BAKING_SODA','SPRAY','DEHUMIDIFIER','FRAGRANCE'].includes(row.category))errors.push('UNKNOWN_CATEGORY');
  if(!Number.isFinite(Date.parse(row.observedAt)))errors.push('INVALID_OBSERVED_AT');
  for(const field of ['widthCm','lengthM','packQuantity'])if(row[field]!=null&&(!Number.isFinite(row[field])||row[field]<=0||(field==='packQuantity'&&!Number.isInteger(row[field]))))errors.push('INVALID_'+field.toUpperCase());
  const spec=parseSpec(row.specText);if(spec.lengthM===null||spec.packQuantity===null)warnings.push('UNPARSEABLE_SPEC');if(spec.widthCm===null)warnings.push('MISSING_WIDTH');
  if(Date.now()-Date.parse(row.observedAt)>86400000)warnings.push('STALE_SOURCE');
  if(row.sourceStatus&&!statuses.includes(row.sourceStatus))errors.push('INVALID_SOURCE_STATUS');
  return {errors,warnings};
 }
 function semantic(record){const fields=['brand','productName','category','retailer','retailerProductId','sourceUrl','specText','widthCm','lengthM','packQuantity','totalLengthM','material','currentPrice','originalPrice','promotionText','availability','sourceStatus','sourceMethod','eligibleProductCodes','matchReason','unitConversionVerified'];return JSON.stringify(fields.map(k=>record[k]??null));}
 function applyObservations(existing,history,rows,now=new Date().toISOString()){
  const records=structuredClone(existing),nextHistory=structuredClone(history),runtime={},issues=[],seen=new Map(),urls=new Map();let added=0,changed=0;
  for(const raw of rows){
   if(raw.error){const id=raw.competitorProductId,old=records.find(p=>p.competitorProductId===id);if(old){runtime[id]={lastCheckedAt:now,lastSuccessAt:raw.lastSuccessAt||old.lastSuccessAt,sourceStatus:'FAILED',reason:normalize(raw.error)};}issues.push({id,severity:'error',reason:'PRICE_PARSER_FAILURE',message:normalize(raw.error)});continue;}
   const row={...raw,retailer:normalize(raw.retailer),brand:normalize(raw.brand),productName:normalize(raw.productName),promotionText:normalize(raw.promotionText),originalPrice:raw.originalPrice??null,availability:raw.availability||'UNKNOWN'};
   const validation=validate(row),spec=parseSpec(row.specText),id=productId(row);validation.errors.forEach(reason=>issues.push({id,severity:'error',reason}));validation.warnings.forEach(reason=>issues.push({id,severity:'warning',reason}));if(validation.errors.length)continue;
   // A glove/bag dimension must not become a roll/area conversion by inference.
   if(row.unitConversionVerified===false)Object.assign(spec,{widthCm:null,lengthM:null,totalLengthM:null});
   const prepared={...row,competitorProductId:id,normalizedName:key(row.productName),...spec,...units(row.currentPrice,spec),material:row.material||null,currency:'TWD',lastCheckedAt:now,lastSuccessAt:row.observedAt,sourceMethod:row.sourceMethod||'MANUAL',sourceStatus:row.sourceMethod==='PUBLIC_HTML'?'FRESH':'MANUAL',effectiveAverageUnitPrice:effectiveAverage(row.currentPrice,row.promotionText)};
   if(seen.has(id)){issues.push({id,severity:semantic(seen.get(id))===semantic(prepared)?'warning':'error',reason:semantic(seen.get(id))===semantic(prepared)?'DUPLICATE_PRODUCT':'CONFLICTING_PRICE'});continue;}
   if(urls.has(row.sourceUrl)||records.some(p=>p.sourceUrl===row.sourceUrl&&p.competitorProductId!==id)){issues.push({id,severity:'error',reason:'DUPLICATE_SOURCE_URL'});continue;}seen.set(id,prepared);urls.set(row.sourceUrl,id);
   const index=records.findIndex(p=>p.competitorProductId===id),old=records[index];runtime[id]={lastCheckedAt:now,lastSuccessAt:row.observedAt,sourceStatus:prepared.sourceStatus};
   if(!old||semantic(old)!==semantic(prepared)){if(!old){records.push(prepared);added++;}else{records[index]=prepared;changed++;}}
   if(!old||old.currentPrice!==prepared.currentPrice||old.originalPrice!==prepared.originalPrice||old.promotionText!==prepared.promotionText){(nextHistory[id]??=[]).push({effectiveObservedAt:row.observedAt,price:row.currentPrice,originalPrice:row.originalPrice,promotionText:row.promotionText,availability:row.availability,sourceUrl:row.sourceUrl});}
  }
  return {records,history:nextHistory,runtime,report:{added,changed,successful:seen.size,warnings:issues.filter(i=>i.severity==='warning').length,errors:issues.filter(i=>i.severity==='error').length,issues}};
 }
 const api={normalize,key,money,safeUrl,parseSpec,units,effectiveAverage,material,productId,freshness,validate,semantic,applyObservations};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompetitorPrice=api;
})(typeof globalThis!=='undefined'?globalThis:this);
