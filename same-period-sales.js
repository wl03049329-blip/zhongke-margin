/* Read-only same-month comparison of the existing PX monthly unit-sales series. */
((global)=>{
 const valid=value=>typeof value==='number'&&Number.isFinite(value);
 const parsePeriod=value=>{const match=/^(\d{4})\/(0[1-9]|1[0-2])$/.exec(value||'');return match?{year:Number(match[1]),month:Number(match[2]),label:value}:null};
 const number=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0});
 const month=value=>String(value).padStart(2,'0');
 function periodSpan(year,months){
  if(!months.length)return'同期資料不足';
  const consecutive=months.every((value,index)=>index===0||value===months[index-1]+1);
  return`${year}/${month(months[0])}${months.length===1?'':consecutive?`～${month(months.at(-1))}`:`、${months.slice(1).map(month).join('、')}`}`;
 }
 function compare(periods,sales){
  const records=Array.isArray(periods)?periods.map((label,index)=>({period:parsePeriod(label),value:Array.isArray(sales)?sales[index]:null})).filter(item=>item.period):[];
  const actual=records.filter(item=>valid(item.value)).sort((a,b)=>a.period.year-b.period.year||a.period.month-b.period.month);
  const latest=actual.at(-1)?.period||null;
  const empty={status:'insufficient',months:[],period:'同期資料不足',partial:false,previous:null,current:null,difference:null,percentage:null,yoy:'去年同期無有效比較基準',latest:latest?.label||'資料不足',description:'去年同期資料不足，暫不計算成長率。'};
  if(!latest)return empty;
  const byYear=new Map(records.filter(item=>valid(item.value)).map(item=>[`${item.period.year}/${item.period.month}`,item.value]));
  const months=[];for(let value=1;value<=latest.month;value++)if(byYear.has(`${latest.year}/${value}`)&&byYear.has(`${latest.year-1}/${value}`))months.push(value);
  if(!months.length)return empty;
  const previous=months.reduce((sum,value)=>sum+byYear.get(`${latest.year-1}/${value}`),0),current=months.reduce((sum,value)=>sum+byYear.get(`${latest.year}/${value}`),0),difference=current-previous,percentage=previous===0?null:difference/previous*100;
  const period=`${periodSpan(latest.year-1,months)} vs ${periodSpan(latest.year,months)}`;
  const yoy=previous===0?'去年同期為 0，無法計算百分比':`${difference>0?'+':difference<0?'-':''}${Math.abs(percentage).toFixed(1)}%`;
  const description=previous===0?'去年同期為 0，無法計算百分比。':difference>0?`本期累計銷量較去年同期增加 ${Math.abs(percentage).toFixed(1)}%。`:difference<0?`本期累計銷量較去年同期減少 ${Math.abs(percentage).toFixed(1)}%。`:'本期與去年同期銷量持平。';
  return{status:previous===0?'zero-baseline':'comparable',months,period,partial:months.length!==latest.month,previous,current,difference,percentage,yoy,latest:latest.label,description};
 }
 const formatUnits=value=>value===null?'資料不足':`${number.format(value)} 支`;
 const formatDifference=value=>value===null?'資料不足':`${value>0?'+':''}${number.format(value)} 支`;
 const api=Object.freeze({compare,periodSpan,formatUnits,formatDifference});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(!global.document)return;
 global.PX_SAME_PERIOD_SALES=api;
 const document=global.document;
 function render(container,binding){
  const card=container.querySelector('.px-sales-card');
  if(!card||card.querySelector('.same-period-summary')||!binding.selected)return;
  const product=binding.selected.name,view=compare(global.PX_SALES_PERIODS,global.PX_SALES_DATA?.[product]?.sales);
  const section=document.createElement('section');section.className='same-period-summary';section.setAttribute('aria-label','同期銷售摘要');section.dataset.productName=product;
  section.innerHTML='<div class="same-period-head"><h3>同期銷售摘要</h3><div><small>同比變化</small><strong class="same-period-yoy"></strong></div></div><p class="same-period-period"></p><p class="same-period-scope-note" hidden>僅計入兩年度皆有資料之共同可比月份</p><div class="same-period-stats"><div><span>去年同期銷量</span><b class="same-period-previous"></b></div><div><span>今年同期銷量</span><b class="same-period-current"></b></div><div><span>銷量差異</span><b class="same-period-difference"></b></div></div><p class="same-period-description"></p><div class="same-period-foot"><span>最新實銷資料：<b class="same-period-latest"></b> · 非即時銷售資料</span><button class="same-period-copy secondary-action" type="button">複製同期摘要</button></div><span class="same-period-feedback" role="status" aria-live="polite"></span>';
  const put=(selector,value)=>{section.querySelector(selector).textContent=value};
  put('.same-period-yoy',view.yoy);put('.same-period-period',`比較期間：${view.period}`);section.querySelector('.same-period-scope-note').hidden=!view.partial;put('.same-period-previous',formatUnits(view.previous));put('.same-period-current',formatUnits(view.current));put('.same-period-difference',formatDifference(view.difference));put('.same-period-description',view.description);put('.same-period-latest',view.latest);
  card.querySelector('.px-section-head')?.after(section);
 }
 const bindings=productBindings.filter(binding=>binding.salesId);
 for(const binding of bindings){const container=document.getElementById(binding.salesId);if(!container)continue;new MutationObserver(()=>render(container,binding)).observe(container,{childList:true});render(container,binding)}
 document.addEventListener('click',async event=>{
  const button=event.target.closest('.same-period-copy');if(!button)return;
  const section=button.closest('.same-period-summary'),read=selector=>section.querySelector(selector).textContent.trim(),feedback=section.querySelector('.same-period-feedback');
  const scopeNote=section.querySelector('.same-period-scope-note');
  const text=['【PX 同期銷售摘要】',`商品：${section.dataset.productName}`,'',read('.same-period-period'),...(scopeNote.hidden?[]:[scopeNote.textContent.trim()]),`去年同期：${read('.same-period-previous')}`,`今年同期：${read('.same-period-current')}`,`差異：${read('.same-period-difference')}`,`同比：${read('.same-period-yoy')}`,'',`最新實銷資料：${read('.same-period-latest')}`,'※ 非即時銷售資料'].join('\n');
  let copied=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true}}catch(error){}
  if(!copied)try{copied=fallbackCopyText(text)}catch(error){}
  feedback.textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限';
  setTimeout(()=>{if(feedback.isConnected)feedback.textContent=''},3000);
 });
})(typeof window==='object'?window:globalThis);
