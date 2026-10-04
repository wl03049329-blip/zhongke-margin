/* Sales analysis 2.0: read-only views over monthly unit sales, never money. */
((root)=>{
 'use strict';
 const monthly=typeof module==='object'&&module.exports?require('./px-sales-analysis.js'):root.PX_SALES_ANALYSIS;
 const explorer=typeof module==='object'&&module.exports?require('./px-sales-explorer-core.js'):root.PX_SALES_EXPLORER;
 const valid=explorer.valid;
 const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
 function searchIndex(products){return products.map(product=>({product,fields:[product.name,product.barcode,product.code].filter(Boolean).map(normalize)}))}
 function search(index,query){const key=normalize(query);return key?index.filter(entry=>entry.fields.some(field=>field.includes(key))).sort((a,b)=>Number(b.fields.includes(key))-Number(a.fields.includes(key))).map(entry=>entry.product):[]}
 function status(rate){
  if(!valid(rate))return{label:'資料不足',tone:'neutral'};
  if(rate>=20)return{label:'高成長',tone:'positive'};
  if(rate>0)return{label:'成長',tone:'positive'};
  if(rate===0)return{label:'穩定',tone:'neutral'};
  return{label:rate<=-20?'明顯衰退':'衰退',tone:'negative'};
 }
 function monthSpans(months){
  const chunks=[];let start=null,end=null;
  const flush=()=>{if(start)chunks.push(start===end?start:start.slice(0,4)===end.slice(0,4)?`${start}～${end.slice(5)}`:`${start}～${end}`)};
  for(const period of months){if(start&&explorer.shift(end,1)===period){end=period;continue}flush();start=end=period}flush();return chunks.join('、');
 }
 function analyze(periods,sales,condition={mode:'same'}){
  const sorted=periods.map((period,index)=>({period:explorer.normalize(period),value:valid(sales?.[index])?sales[index]:null})).filter(row=>row.period).sort((a,b)=>explorer.ordinal(a.period)-explorer.ordinal(b.period));
  const source=new Map(sorted.map(row=>[row.period,row.value]));
  const latest=sorted.filter(row=>valid(row.value)).at(-1)?.period||null;
  let start=condition.start,end=condition.end;
  if(condition.mode==='latest')start=end=latest;
  else if(condition.mode==='all'){start=sorted[0]?.period;end=sorted.at(-1)?.period}
  else if(condition.mode!=='custom'){start=latest?latest.slice(0,4)+'/01':null;end=latest}
  const range=explorer.range(sorted.map(row=>row.period),sorted.map(row=>row.value),start,end);
  const empty={latest,range,rows:[],total:null,pairedCurrent:null,previous:null,difference:null,rate:monthly.change(null,null),partial:false,pairs:[],currentMonths:[],previousMonths:[],daily:null,hasPrevious:false,status:status(null),summary:['此期間沒有銷售資料'],period:'資料不足'};
  if(range.error)return {...empty,summary:[latest?range.error:'此商品尚無有效銷售資料']};
  const rows=range.months.map(period=>{const current=source.get(period)??null,previousPeriod=explorer.shift(period,-12),previous=source.get(previousPeriod)??null;return{period,current,previousPeriod,previous,difference:valid(current)&&valid(previous)?current-previous:null,rate:monthly.change(current,previous)}});
  const pairs=rows.filter(row=>valid(row.current)&&valid(row.previous));
  const pairedCurrent=pairs.length?pairs.reduce((n,row)=>n+row.current,0):null,previous=pairs.length?pairs.reduce((n,row)=>n+row.previous,0):null;
  const difference=valid(pairedCurrent)&&valid(previous)?pairedCurrent-previous:null,rate=monthly.change(pairedCurrent,previous),partial=pairs.length>0&&pairs.length!==rows.length;
  const period=`${range.start} ～ ${range.end}`,currentMonths=pairs.map(row=>row.period),previousMonths=pairs.map(row=>row.previousPeriod);
  const n=new Intl.NumberFormat('zh-TW'),summary=[];
  if(!valid(range.total))summary.push('此期間沒有銷售資料');
  else if(!range.complete)summary.push(`本期現有 ${range.count} 個有效月份，合計 ${n.format(range.total)} 支；缺值未補為 0。`);
  else summary.push(`本期銷量 ${n.format(range.total)} 支。`);
  if(rate.status==='comparable')summary.push(difference===0?'本期與去年同期銷量持平。':`共同可比月份較去年同期${difference>0?'增加':'減少'} ${n.format(Math.abs(difference))} 支（${Math.abs(rate.value).toFixed(1)}%）。`);
  else summary.push(rate.status==='zero-baseline'?'去年同期為 0，無法計算百分比。':'目前沒有足夠同期資料。');
  const last=rows.slice(-3);
  if(last.length===3&&last.every(row=>valid(row.current))&&last[0].current<last[1].current&&last[1].current<last[2].current)summary.push('選取期間最後 3 個連續月份銷量逐月增加。');
  else if(last.length===3&&last.every(row=>valid(row.current))&&last[0].current>last[1].current&&last[1].current>last[2].current)summary.push('選取期間最後 3 個連續月份銷量逐月減少。');
  return{...empty,range,rows,total:range.total,pairedCurrent,previous,difference,rate,partial,pairs,currentMonths,previousMonths,hasPrevious:rows.some(row=>valid(row.previous)),status:status(rate.value),summary,period};
 }
 function paths(rows,width=620,height=260){
  const left=55,right=18,top=22,bottom=38,max=Math.max(1,...rows.flatMap(row=>[row.current,row.previous]).filter(valid));
  const x=i=>rows.length===1?(left+width-right)/2:left+i*(width-left-right)/Math.max(1,rows.length-1),y=value=>top+(height-top-bottom)*(1-value/max);
  const line=field=>{let path='',drawing=false;rows.forEach((row,i)=>{if(!valid(row[field])){drawing=false;return}path+=`${drawing?' L':' M'}${x(i).toFixed(2)} ${y(row[field]).toFixed(2)}`;drawing=true});return path.trim()};
  return{left,right,top,bottom,width,height,max,x,y,current:line('current'),previous:line('previous')};
 }
 const api=Object.freeze({valid,normalize,searchIndex,search,status,monthSpans,analyze,paths});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PX_SALES_DASHBOARD_CORE=api;
})(typeof window==='object'?window:globalThis);
