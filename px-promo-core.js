/* Shared importer/browser promotion rules. Prices never change calculator inputs. */
(function(root){
 const clean=value=>String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();
 const identifier=value=>clean(value).replace(/\s/g,'');
 const name=value=>identifier(value).toLowerCase();
 const money=value=>Number.isFinite(value)?Number(value.toFixed(2)).toString():'—';
 const quantity=value=>({一:1,二:2,兩:2,三:3,四:4,五:5,六:6}[value]||Number(value));
 function parse(raw){
  const text=clean(raw),campaignType=text.match(/\b(IP|DM)(?![a-z])/i)?.[1]?.toUpperCase()||'其他';
  const body=text.replace(/\b(IP|DM)(?![a-z])/ig,'').trim(),promotions=[],warnings=[];
  const add=(promotionType,label,payQuantity,receiveQuantity,promotionPrice,optional=false)=>promotions.push({promotionType,label,payQuantity,receiveQuantity,promotionPrice,averageUnitPrice:Number.isFinite(promotionPrice)&&receiveQuantity>0?promotionPrice/receiveQuantity:null,optional});
  const cash='\\$?\\s*(\\d+(?:\\.\\d+)?)';
  const gift=body.match(/買\s*([\d一二兩三四五六]+)\s*送\s*([\d一二兩三四五六]+)/);
  if(gift){const price=body.match(/\$\s*(\d+(?:\.\d+)?)/)?.[1],pay=quantity(gift[1]),received=pay+quantity(gift[2]);add('BUY_X_GET_Y',`${body.includes('任選')?'任選 ':''}買${pay}送${received-pay}`,pay,received,price===undefined?null:Number(price),body.includes('任選'));}
  else if(/第[二2]件\s*(?:5折|半價)/.test(body)){const price=body.match(/(?:單特\s*)?\$\s*(\d+(?:\.\d+)?)/)?.[1];if(price!==undefined){add('SINGLE','單特',1,1,Number(price));add('SECOND_HALF_PRICE','第二件5折',2,2,Number(price)*1.5);}else add('UNKNOWN',body,null,null,null);}
  else{
   for(const match of body.matchAll(new RegExp('(單|[二三四五六\\d]+)特\\s*'+cash,'g'))){const count=match[1]==='單'?1:quantity(match[1]);add(count===1?'SINGLE':'MULTI_BUY',match[1]+'特',count,count,Number(match[2]));}
   if(!promotions.length){const choose=body.match(new RegExp('任選\\s*([\\d一二兩三四五六]+)\\s*件\\s*'+cash));if(choose){const count=quantity(choose[1]);add('MULTI_BUY',`任選${count}件`,count,count,Number(choose[2]),true);}else if(/^\$?\s*\d+(?:\.\d+)?$/.test(body))add('SINGLE','單件售價',1,1,Number(body.replace('$','')));else add('UNKNOWN',body||'未提供售價',null,null,null);}
  }
  if(!text)warnings.push('MISSING_PRICE');
  if(promotions.some(p=>p.promotionType==='UNKNOWN'))warnings.push('UNKNOWN_PROMOTION');
  if(promotions.some(p=>p.averageUnitPrice===null))warnings.push('AVERAGE_UNAVAILABLE');
  // Unrecognized remainder must not be silently treated as an ordinary single price.
  if(promotions.length&&promotions.every(p=>p.promotionType!=='UNKNOWN')&&!gift&&!/第[二2]件/.test(body)){
   const remainder=body.replace(new RegExp('(單|[二三四五六\\d]+)特\\s*'+cash,'g'),'').replace(new RegExp('任選\\s*([\\d一二兩三四五六]+)\\s*件\\s*'+cash,'g'),'').replace(/^\$?\s*\d+(?:\.\d+)?$/,'').trim();
   if(remainder){warnings.push('UNKNOWN_PROMOTION');add('UNKNOWN',remainder,null,null,null);}
  }
  return {campaignType,promotions,warnings};
 }
 function periods(data){const unique=new Map();data.products.forEach(p=>Object.values(p.periods).forEach(period=>unique.set(period.id,period)));return [...unique.values()].sort((a,b)=>a.startDate.localeCompare(b.startDate));}
 function context(data,date){const list=periods(data),current=list.find(p=>p.startDate<=date&&p.endDate>=date)||null,next=list.find(p=>p.startDate>date)||null;return {current,next,preferred:current||next,list};}
 // Comparison is read-only and uses the global schedule, never the product's last available price.
 function bestAverageUnitPrice(period){
  const prices=(period?.promotions||[]).filter(p=>p.promotionType!=='UNKNOWN'&&Number.isFinite(p.averageUnitPrice)&&p.averageUnitPrice>=0).map(p=>p.averageUnitPrice);
  return prices.length?Math.min(...prices):null;
 }
 function promotionSet(period){
  return [...new Set((period?.promotions||[]).map(p=>JSON.stringify([p.promotionType,p.payQuantity,p.receiveQuantity,Boolean(p.optional),p.discountRate??null,p.promotionType==='UNKNOWN'?clean(p.label):null])))].sort();
 }
 function comparePeriods(data,product,currentPeriodId){
  const schedule=periods(data),index=schedule.findIndex(p=>p.id===currentPeriodId),currentPeriod=schedule[index]||null,previousPeriod=index>0?schedule[index-1]:null;
  const record=data.products.find(p=>p.productName===product.name),current=record?.periods[currentPeriodId]||null,previous=record?.periods[previousPeriod?.id]||null;
  const currentBest=bestAverageUnitPrice(current),previousBest=bestAverageUnitPrice(previous);
  const promotionChange=current&&previous?JSON.stringify(promotionSet(current))!==JSON.stringify(promotionSet(previous)):false;
  const base={currentPeriod,previousPeriod,current,previous,currentBest,previousBest,promotionChange,priceDelta:null,changePercent:null,isNew:product.newProductPeriod===currentPeriod?.id.slice(0,7)};
  if(currentBest===null)return {...base,status:'CURRENT_UNAVAILABLE'};
  if(!previousPeriod)return {...base,status:'NO_PREVIOUS_PERIOD'};
  if(!previous)return {...base,status:'PREVIOUS_MISSING'};
  if(previousBest===null)return {...base,status:'PREVIOUS_UNAVAILABLE'};
  const priceDelta=currentBest-previousBest,changePercent=previousBest>0?priceDelta/previousBest*100:null;
  return {...base,priceDelta,changePercent,status:priceDelta===0?'UNCHANGED':priceDelta>0?'INCREASED':'DECREASED'};
 }
 function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 const api={clean,identifier,name,money,parse,periods,context,today,bestAverageUnitPrice,promotionSet,comparePeriods};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PXPromo=api;
})(typeof globalThis!=='undefined'?globalThis:this);
