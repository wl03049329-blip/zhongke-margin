/* Read-only monthly unit-sales analysis. Missing months never become zero. */
((global)=>{
 const valid=value=>typeof value==='number'&&Number.isFinite(value);
 const units=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0});
 const averageNumber=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:1});
 const month=value=>String(value).padStart(2,'0');
 const label=(year,number)=>`${year}/${month(number)}`;
 const shift=(year,number,offset)=>{const date=new Date(Date.UTC(year,number-1+offset,1));return label(date.getUTCFullYear(),date.getUTCMonth()+1)};
 const compare=typeof module==='object'&&module.exports?require('./same-period-sales.js').compare:global.PX_SAME_PERIOD_SALES?.compare;
 function change(current,previous){
  if(!valid(current)||!valid(previous))return{status:'insufficient',value:null};
  if(previous===0)return{status:'zero-baseline',value:null};
  return{status:'comparable',value:(current-previous)/previous*100};
 }
 function analyze(periods,sales){
  const byMonth=new Map(Array.isArray(periods)?periods.map((period,index)=>[period,Array.isArray(sales)?sales[index]:null]):[]);
  const actual=Array.isArray(periods)?periods.map((period,index)=>({period,value:Array.isArray(sales)?sales[index]:null})).filter(item=>/^\d{4}\/(0[1-9]|1[0-2])$/.test(item.period)&&valid(item.value)):[];
  const latest=actual.at(-1),comparison=compare?.(periods,sales)||null;
  if(!latest)return{latest:null,latestMonth:null,mom:change(null,null),yoy:change(null,null),ytd:{year:null,value:null,full:false,months:[]},averages:{three:{count:0,value:null},six:{count:0,value:null}},comparison};
  const year=Number(latest.period.slice(0,4)),number=Number(latest.period.slice(5));
  const ytdMonths=Array.from({length:number},(_,index)=>label(year,index+1)),present=ytdMonths.filter(period=>valid(byMonth.get(period)));
  const rolling=size=>{const values=Array.from({length:size},(_,index)=>byMonth.get(shift(year,number,index-size+1))).filter(valid);return{count:values.length,value:values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null}};
  return{latest:latest.value,latestMonth:latest.period,mom:change(latest.value,byMonth.get(shift(year,number,-1))),yoy:change(latest.value,byMonth.get(label(year-1,number))),ytd:{year,value:present.length?present.reduce((sum,period)=>sum+byMonth.get(period),0):null,full:present.length===number,months:present},averages:{three:rolling(3),six:rolling(6)},comparison};
 }
 const formatUnits=value=>valid(value)?`${units.format(value)} 支`:'資料不足';
 const formatAverage=value=>valid(value)?`${averageNumber.format(value)} 支`:'資料不足';
 const formatChange=(result,zeroText)=>result.status==='zero-baseline'?zeroText:result.status==='comparable'?`${result.value>0?'+':''}${result.value.toFixed(1)}%`:'資料不足';
 function includedMonths(months){
  const spans=[];let start=null,end=null;
  for(const period of months){const number=Number(period.slice(5));if(start&&number===end+1){end=number;continue}if(start)spans.push(start===end?label(Number(period.slice(0,4)),start):`${period.slice(0,4)}/${month(start)}～${month(end)}`);start=end=number}
  if(start)spans.push(start===end?label(Number(months.at(-1).slice(0,4)),start):`${months.at(-1).slice(0,4)}/${month(start)}～${month(end)}`);
  return spans.join('、');
 }
 const api=Object.freeze({analyze,change,formatUnits,formatAverage,formatChange});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(!global.document)return;
 global.PX_SALES_ANALYSIS=api;
 const document=global.document;
 function render(container,binding){
  const card=container.querySelector('.px-sales-card');
  if(!card||card.querySelector('.sales-analysis-hero')||!binding.selected)return;
  const product=binding.selected.name,view=analyze(global.PX_SALES_PERIODS,global.PX_SALES_DATA?.[product]?.sales);
  const hero=document.createElement('section');hero.className='sales-analysis-hero';hero.dataset.productName=product;hero.setAttribute('aria-label','單品月銷分析');
  hero.innerHTML='<h3>單品月銷分析</h3><div class="sales-hero-grid"><div class="sales-hero-primary"><span>最新月銷量</span><strong class="sales-latest"></strong><small class="sales-latest-month"></small></div><div><span>MoM・較上月</span><strong class="sales-mom"></strong></div><div><span>YoY・較去年同月</span><strong class="sales-yoy"></strong></div><div><span class="sales-ytd-label"></span><strong class="sales-ytd"></strong><small class="sales-ytd-note"></small></div></div><p class="sales-mom-description"></p>';
  const put=(root,selector,text)=>{root.querySelector(selector).textContent=text};
  put(hero,'.sales-latest',formatUnits(view.latest));put(hero,'.sales-latest-month',view.latestMonth||'資料不足');
  put(hero,'.sales-mom',formatChange(view.mom,'上月為 0，無法計算百分比'));
  put(hero,'.sales-yoy',formatChange(view.yoy,'去年同月為 0，無法計算百分比'));
  put(hero,'.sales-ytd-label',view.ytd.year?`${view.ytd.year} ${view.ytd.full?'YTD':'現有月份累計'}`:'YTD 累計');
  put(hero,'.sales-ytd',formatUnits(view.ytd.value));
  put(hero,'.sales-ytd-note',view.ytd.year&&!view.ytd.full?`計入：${includedMonths(view.ytd.months)}`:'');
  put(hero,'.sales-mom-description',!view.latestMonth?'月銷資料不足，暫不計算 MoM。':view.mom.status==='comparable'?view.mom.value>0?`本月較上月增加 ${view.mom.value.toFixed(1)}%。`:view.mom.value<0?`本月較上月減少 ${Math.abs(view.mom.value).toFixed(1)}%。`:'本月與上月銷量持平。':view.mom.status==='zero-baseline'?'上月銷量為 0，暫不計算 MoM 百分比。':'上月資料不足，暫不計算 MoM。');
  card.querySelector('.px-section-head').after(hero);
  const averages=document.createElement('section');averages.className='sales-averages';averages.setAttribute('aria-label','短期月銷平均');
  averages.innerHTML='<div class="sales-average-grid"><div><span class="sales-three-label"></span><b class="sales-three"></b></div><div><span class="sales-six-label"></span><b class="sales-six"></b></div></div><div class="sales-analysis-actions"><button class="sales-copy secondary-action" type="button">複製銷售摘要</button><span class="sales-copy-feedback" role="status" aria-live="polite"></span></div>';
  const averageLabel=(size,result)=>result.count===size?`近 ${size} 月平均`:result.count&&!(size===6&&result.count<3)?`現有 ${result.count} 個月平均（近 ${size} 月）`:`近 ${size} 月資料不足`;
  put(averages,'.sales-three-label',averageLabel(3,view.averages.three));put(averages,'.sales-three',formatAverage(view.averages.three.value));
  put(averages,'.sales-six-label',averageLabel(6,view.averages.six));put(averages,'.sales-six',formatAverage(view.averages.six.count<3?null:view.averages.six.value));
  (card.querySelector('.same-period-summary')||hero).after(averages);
 }
 for(const binding of productBindings.filter(item=>item.salesId)){
  const container=document.getElementById(binding.salesId);if(!container)continue;
  new MutationObserver(()=>render(container,binding)).observe(container,{childList:true});render(container,binding);
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('.sales-copy');if(!button)return;
  const card=button.closest('.px-sales-card'),hero=card.querySelector('.sales-analysis-hero'),average=card.querySelector('.sales-averages'),period=card.querySelector('.same-period-summary'),read=(root,selector)=>root?.querySelector(selector)?.textContent.trim()||'資料不足';
  const lines=['【PX 銷售摘要】',`商品：${hero.dataset.productName}`,'',`最新月：${read(hero,'.sales-latest')}（${read(hero,'.sales-latest-month')}）`,`MoM：${read(hero,'.sales-mom')}`,`YoY：${read(hero,'.sales-yoy')}`,`${read(hero,'.sales-ytd-label')}：${read(hero,'.sales-ytd')}`];
  const note=read(hero,'.sales-ytd-note');if(note!=='資料不足')lines.push(note);
  lines.push('',read(period,'.same-period-period'));const scope=period?.querySelector('.same-period-scope-note');if(scope&&!scope.hidden)lines.push(scope.textContent.trim());
  lines.push(`今年同期：${read(period,'.same-period-current')}`,`去年同期：${read(period,'.same-period-previous')}`,`差異：${read(period,'.same-period-difference')}`,`同比：${read(period,'.same-period-yoy')}`,'',`${read(average,'.sales-three-label')}：${read(average,'.sales-three')}`,`${read(average,'.sales-six-label')}：${read(average,'.sales-six')}`,'',`最新實銷資料：${read(period,'.same-period-latest')}`,'※ 非即時銷售資料');
  const text=lines.join('\n'),feedback=average.querySelector('.sales-copy-feedback');let copied=false;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true}}catch(error){}
  if(!copied)try{copied=fallbackCopyText(text)}catch(error){}
  feedback.textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限';
 });
})(typeof window==='object'?window:globalThis);
