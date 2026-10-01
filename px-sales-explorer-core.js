/* Read-only extensions to Phase 1 monthly unit-sales analysis. */
((global)=>{
 'use strict';
 const phase1=typeof module==='object'&&module.exports?require('./px-sales-analysis.js'):global.PX_SALES_ANALYSIS;
 const valid=value=>typeof value==='number'&&Number.isFinite(value);
 const ordinal=period=>{const m=/^(\d{4})[/-](0[1-9]|1[0-2])$/.exec(period||'');return m?Number(m[1])*12+Number(m[2])-1:null};
 const monthLabel=value=>`${Math.floor(value/12)}/${String(value%12+1).padStart(2,'0')}`;
 const shift=(period,offset)=>ordinal(period)===null?null:monthLabel(ordinal(period)+offset);
 const normalize=period=>ordinal(period)===null?null:monthLabel(ordinal(period));
 const mapSeries=(periods,sales)=>new Map(periods.map((period,index)=>[normalize(period),valid(sales?.[index])?sales[index]:null]));
 function range(periods,sales,start,end){
  const first=ordinal(start),last=ordinal(end);
  if(first===null||last===null)return{error:'請選擇完整起訖月份'};
  if(first>last)return{error:'起始月份不可晚於結束月份'};
  if(last-first>1199)return{error:'比較期間請限於 100 年內'};
  const source=mapSeries(periods,sales),months=Array.from({length:last-first+1},(_,index)=>monthLabel(first+index));
  const available=months.filter(period=>valid(source.get(period))),values=available.map(period=>source.get(period));
  const total=values.length?values.reduce((sum,value)=>sum+value,0):null;
  return{error:null,start:monthLabel(first),end:monthLabel(last),months,available,count:values.length,length:months.length,total,average:values.length?total/values.length:null,complete:values.length===months.length};
 }
 function compareRanges(periods,sales,ranges){
  const a=range(periods,sales,ranges.aStart,ranges.aEnd),b=range(periods,sales,ranges.bStart,ranges.bEnd);
  if(a.error||b.error)return{error:a.error||b.error,a,b};
  const unequal=a.length!==b.length,partial=!a.complete||!b.complete;
  const samePeriod=!unequal&&shift(a.start,-12)===b.start&&shift(a.end,-12)===b.end;
  const difference=valid(a.total)&&valid(b.total)?a.total-b.total:null;
  const rate=phase1.change(a.total,b.total);
  const warnings=[];
  if(unequal)warnings.push('比較期間長度不同');
  if(partial)warnings.push('資料未完整；差異僅依有效月份加總，不代表完整同期。');
  return{error:null,a,b,difference,rate,unequal,partial,samePeriod,warnings,rateLabel:unequal?'期間差異（非同期）':partial?'有效資料差異（非完整期間）':samePeriod?'同期成長率':'期間變化率'};
 }
 function monthDetails(periods,sales){
  const source=mapSeries(periods,sales);
  return [...source].filter(([period])=>period).sort((a,b)=>ordinal(b[0])-ordinal(a[0])).map(([period,value])=>({period,value,mom:phase1.change(value,source.get(shift(period,-1))),yoy:phase1.change(value,source.get(shift(period,-12)))}));
 }
 function extrema(periods,sales){
  const details=monthDetails(periods,sales).filter(row=>valid(row.value));
  if(!details.length)return{complete12:false,high:null,low:null,highMonths:[],lowMonths:[],start:null,end:null,count:0};
  const latest=details[0].period,window=range(periods,sales,shift(latest,-11),latest);
  const selected=window.complete?details.filter(row=>ordinal(row.period)>=ordinal(window.start)):details;
  const high=Math.max(...selected.map(row=>row.value)),low=Math.min(...selected.map(row=>row.value));
  return{complete12:window.complete,high,low,highMonths:selected.filter(row=>row.value===high).map(row=>row.period).sort(),lowMonths:selected.filter(row=>row.value===low).map(row=>row.period).sort(),start:selected.at(-1).period,end:latest,count:selected.length};
 }
 function preset(latest,kind){
  const end=normalize(latest);if(!end)return{aStart:'',aEnd:'',bStart:'',bEnd:''};
  const start=kind==='three'?shift(end,-2):kind==='six'?shift(end,-5):`${end.slice(0,4)}/01`;
  return{aStart:start,aEnd:end,bStart:shift(start,-12),bEnd:shift(end,-12)};
 }
 function yearly(periods,sales){
  const latest=phase1.analyze(periods,sales).latestMonth;if(!latest)return null;
  const year=Number(latest.slice(0,4)),source=mapSeries(periods,sales);
  return[year,year-1].map(year=>({year,values:Array.from({length:12},(_,i)=>source.get(`${year}/${String(i+1).padStart(2,'0')}`)??null)}));
 }
 function multi(periods,data,names,ranges,sort='total'){
  const rows=[...new Set(names)].map(name=>({name,comparison:compareRanges(periods,data[name]?.sales,ranges),latest:phase1.analyze(periods,data[name]?.sales)}));
  const value=row=>sort==='difference'?row.comparison.difference:sort==='growth'?row.comparison.rate?.value:row.comparison.a?.total;
  return rows.sort((a,b)=>{const x=value(a),y=value(b);return valid(x)&&valid(y)?y-x||a.name.localeCompare(b.name,'zh-TW'):valid(x)?-1:valid(y)?1:a.name.localeCompare(b.name,'zh-TW')});
 }
 const api=Object.freeze({valid,ordinal,normalize,shift,range,compareRanges,monthDetails,extrema,preset,yearly,multi});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else global.PX_SALES_EXPLORER=api;
})(typeof window==='object'?window:globalThis);
