/* Sales analysis: read-only views over monthly unit sales, never money. */
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
 // Presentation-only scale: readable 1/2/5 steps, no rounding of source values.
 function niceTicks(maximum){
  const peak=valid(maximum)&&maximum>0?maximum:1,power=Math.floor(Math.log10(peak));
  const candidates=[];
  for(let exponent=power-2;exponent<=power+1;exponent++)for(const factor of [1,2,5]){
   const step=factor*10**exponent;if(step<1)continue;
   const intervals=Math.max(3,Math.ceil(peak/step));if(intervals>5)continue;
   const max=step*intervals,score=Math.abs(intervals+1-5)+(max-peak)/peak*.5;
   candidates.push({step,max,score,ticks:Array.from({length:intervals+1},(_,i)=>i*step)});
  }
  candidates.sort((a,b)=>a.score-b.score||a.step-b.step);
  const selected=candidates[0];
  // Five grid labels suffice when a six-label scale is the best fit.
  return{step:selected.step,max:selected.max,ticks:selected.ticks.length>5?selected.ticks.slice(0,-1):selected.ticks};
 }
 function recentTrend(rows){
  const recent=rows.filter(row=>valid(row.current)).slice(-3);
  if(recent.length<3)return null;
  const baseline=(recent[0].current+recent[1].current)/2,latest=recent[2].current;
  const direction=latest>baseline*1.1?'strong':latest<baseline*.9?'weak':'steady';
  return{label:{strong:'近期走強',weak:'近期轉弱',steady:'近期持穩'}[direction],direction,average:recent.reduce((sum,row)=>sum+row.current,0)/3,months:recent.map(row=>row.period)};
 }
 function conciseSummary(view,trend){
  if(!valid(view.total))return[view.summary[0]];
  const n=new Intl.NumberFormat('zh-TW'),scope=view.range.complete?'本期':`本期現有 ${view.range.count} 個有效月份`;
  let text=`${scope}銷量 ${n.format(view.total)} 支`;
  if(view.rate.status==='comparable')text+=view.difference===0?'，與去年共同可比月份持平。':`，${view.partial?'共同可比月份':'較去年同期'}${view.difference>0?'增加':'減少'} ${n.format(Math.abs(view.difference))} 支（${Math.abs(view.rate.value).toFixed(1)}%）。`;
  else text+=view.rate.status==='zero-baseline'?'；去年同期為 0，無法計算百分比。':'；目前沒有足夠同期資料。';
  return[text,...(trend?[`${trend.label}（依最新有效月與前兩個有效月平均比較）。`]:[])];
 }
 function paths(rows,width=620,height=260){
  const left=60,right=32,top=38,bottom=38,scale=niceTicks(Math.max(0,...rows.flatMap(row=>[row.current,row.previous]).filter(valid))),max=scale.max;
  const x=i=>rows.length===1?(left+width-right)/2:left+i*(width-left-right)/Math.max(1,rows.length-1),y=value=>top+(height-top-bottom)*(1-value/max);
  const line=field=>{let path='',drawing=false;rows.forEach((row,i)=>{if(!valid(row[field])){drawing=false;return}path+=`${drawing?' L':' M'}${x(i).toFixed(2)} ${y(row[field]).toFixed(2)}`;drawing=true});return path.trim()};
  const segments=[];let segment=[];for(let i=0;i<rows.length;i++){if(valid(rows[i].current))segment.push(i);else{if(segment.length)segments.push(segment);segment=[]}}if(segment.length)segments.push(segment);
  const area=segments.filter(indices=>indices.length>1).map(indices=>`M${x(indices[0])} ${y(rows[indices[0]].current)} `+indices.slice(1).map(i=>`L${x(i)} ${y(rows[i].current)}`).join(' ')+` L${x(indices.at(-1))} ${y(0)} L${x(indices[0])} ${y(0)} Z`).join(' ');
  return{left,right,top,bottom,width,height,max,ticks:scale.ticks,x,y,area,current:line('current'),previous:line('previous')};
 }
 const api=Object.freeze({valid,normalize,searchIndex,search,status,monthSpans,analyze,paths,niceTicks,recentTrend,conciseSummary});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PX_SALES_DASHBOARD_CORE=api;
})(typeof window==='object'?window:globalThis);
