/* Presentation only: consume PX_SALES_EXPLORER.multi() results; never recalculate sales. */
((global)=>{
 'use strict';
 const dashboard=typeof module==='object'&&module.exports?require('./px-sales-dashboard-core.js'):global.PX_SALES_DASHBOARD_CORE;
 const valid=dashboard.valid,nf=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0});
 const units=value=>valid(value)?nf.format(value)+' 支':'資料不足';
 const signed=value=>valid(value)?(value>0?'+':'')+units(value):'資料不足';
 const rate=c=>c.rate?.status==='zero-baseline'?'基準為 0':c.rate?.status==='comparable'&&valid(c.rate.value)?(c.rate.value>0?'+':'')+c.rate.value.toFixed(1)+'%':'資料不足';
 const coverage=c=>`A ${c.a.count}/${c.a.length}｜B ${c.b.count}/${c.b.length}`;
 function leaders(rows,value,lowest=false){
  const available=rows.filter(row=>valid(value(row)));
  if(!available.length)return{names:[],value:null,partial:false};
  const peak=(lowest?Math.min:Math.max)(...available.map(value)),winners=available.filter(row=>value(row)===peak);
  return{names:winners.map(row=>row.name).sort((a,b)=>a.localeCompare(b,'zh-TW')),value:peak,partial:winners.some(row=>row.comparison.partial)};
 }
 function describe(rows){
  const full=rows.filter(row=>!row.comparison.partial&&row.comparison.rate?.status==='comparable'&&valid(row.comparison.rate.value));
  const volume=leaders(rows,row=>row.comparison.a.total),growth=leaders(full,row=>row.comparison.rate.value),difference=leaders(rows,row=>row.comparison.difference),weak=leaders(full,row=>row.comparison.rate.value,true);
  const yearly=rows.every(row=>row.comparison.samePeriod),allPositive=full.length>0&&full.every(row=>row.comparison.rate.value>0);
  const labelGrowth=yearly?'同期成長率':'期間變化率',summary=[];
  if(volume.names.length)summary.push(`本期 ${rows.length} 支商品中，${volume.names.join('、')}${volume.names.length>1?'並列':''}${volume.partial?'現有有效月份':''}銷量最高，共 ${units(volume.value)}。`);
  else summary.push('本期沒有足夠有效銷量資料。');
  if(growth.names.length)summary.push(`完整可比資料中，${growth.names.join('、')}${growth.names.length>1?'並列':''}${labelGrowth}最高，${growth.value>0?'+':''}${growth.value.toFixed(1)}%。`);
  const decreasing=full.filter(row=>row.comparison.rate.value<0).length;
  if(decreasing)summary.push(`完整可比商品中，${decreasing} 支較對比期減少。`);
  else if(full.length)summary.push(`完整可比商品中，${full.filter(row=>row.comparison.rate.value>0).length} 支增加、${full.filter(row=>row.comparison.rate.value===0).length} 支持平。`);
  else summary.push('同期或期間基準資料不足，暫不判讀完整成長率。');
  return{volume,growth,difference,weak,yearly,labelGrowth,weakLabel:allPositive?'成長較低':weak.names.length?'表現最弱':'資料不足',summary:summary.slice(0,3)};
 }
 function copyText(rows,view,sortLabel){
  const first=rows[0].comparison,lines=['【PX 多商品銷售比較】','',`期間 A（本期）：${first.a.start}～${first.a.end}`,`期間 B（對比期）：${first.b.start}～${first.b.end}`,`排序：${sortLabel}`,''];
  rows.forEach((row,i)=>{const c=row.comparison;lines.push(`${i+1}. ${row.name}`,`本期：${units(c.a.total)}`,`對比期：${units(c.b.total)}`,`增減：${signed(c.difference)}`,`${c.rateLabel}：${rate(c)}`,`最新月：${units(row.latest.latest)}（${row.latest.latestMonth||'資料不足'}）`,`有效月份：${coverage(c)}`);
   if(c.partial)lines.push('部分月份資料不足；非完整同期／期間。',`A 實際計入：${dashboard.monthSpans(c.a.available)||'無有效月份'}`,`B 實際計入：${dashboard.monthSpans(c.b.available)||'無有效月份'}`);
   if(c.unequal)lines.push('比較期間長度不同，非同期。');lines.push('');
  });
  lines.push('【比較重點】',...view.summary,'','※ 非即時銷售資料');return lines.join('\n');
 }
 const api=Object.freeze({units,signed,rate,coverage,describe,copyText,status:dashboard.status});
 if(typeof module==='object'&&module.exports)module.exports=api;else global.PX_SALES_MULTI_VIEW=api;
})(typeof window==='object'?window:globalThis);
