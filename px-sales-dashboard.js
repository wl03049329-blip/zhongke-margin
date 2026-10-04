/* Unified sales presentation. Source master and calculation modules stay read-only. */
((global)=>{
 'use strict';
 const core=global.PX_SALES_DASHBOARD_CORE,monthly=global.PX_SALES_ANALYSIS,periods=global.PX_SALES_PERIODS,data=global.PX_SALES_DATA;
 const products=PX_PRODUCT_MASTER,index=core.searchIndex(products),states=new Map(),storage='pxSalesRecentlyViewedV2';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nf=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0}),num=value=>core.valid(value)?nf.format(value):'資料不足',units=value=>core.valid(value)?num(value)+' 支':'資料不足';
 const signed=value=>core.valid(value)?(value>0?'+':'')+nf.format(value)+' 支':'資料不足';
 const percentage=rate=>rate.status==='zero-baseline'?'去年同期為 0，無法計算百分比':rate.status==='comparable'?`${rate.value>0?'+':''}${rate.value.toFixed(1)}%`:'資料不足';
 const meta=product=>[product.barcode?`條碼：${product.barcode}`:'',product.code?`PX 品號：${product.code}`:''].filter(Boolean).join('｜');
 let recent=[];try{const saved=JSON.parse(localStorage.getItem(storage)||'[]');if(Array.isArray(saved))recent=[...new Set(saved)].filter(name=>products.some(p=>p.name===name)).slice(0,5)}catch(error){}
 function remember(product){recent=[product.name,...recent.filter(name=>name!==product.name)].slice(0,5);try{localStorage.setItem(storage,JSON.stringify(recent))}catch(error){}}
 function chart(view,chartWidth=Math.max(260,Math.min(1050,global.innerWidth-60)),height=global.innerWidth>800?320:260){
  if(!core.valid(view.total))return'<p class="sales2-empty">此期間沒有銷售資料</p>';
  const p=core.paths(view.rows,chartWidth,height),trend=core.recentTrend(view.rows),latest=view.rows.findLastIndex(row=>core.valid(row.current));
  const step=Math.max(1,Math.ceil(view.rows.length/Math.max(2,Math.floor(chartWidth/90))));
  const labels=new Set([0,view.rows.length-1]);
  for(let i=step;i<view.rows.length-step;i+=step)labels.add(i);
  if(chartWidth>800&&view.rows.length>12)for(let i=1;i<view.rows.length;i++)if(view.rows[i].period.endsWith('/01')){
   for(const tick of labels)if(tick!==0&&tick!==view.rows.length-1&&Math.abs(tick-i)<step)labels.delete(tick);
   labels.add(i);
  }
  const dots=(field,klass)=>view.rows.map((row,i)=>core.valid(row[field])?`<circle class="sales2-point ${klass}" data-point="${i}" cx="${p.x(i)}" cy="${p.y(row[field])}" r="${field==='current'&&i===latest?4:2.5}"/>`:'').join('');
  const last=view.rows[latest],labelWidth=num(last.current).length*7+18,labelX=Math.max(p.left,Math.min(p.width-p.right-labelWidth,p.x(latest)-labelWidth/2)),labelY=p.y(last.current)-27;
  const refLabel=trend?(PX_SALES_EXPLORER.shift(trend.months[0],2)===trend.months[2]?'近 3 月平均':'近 3 個有效月平均'):'';
  const grid=p.ticks.map(value=>`<line x1="${p.left}" y1="${p.y(value)}" x2="${p.width-p.right}" y2="${p.y(value)}" class="sales2-grid"/><text x="${p.left-8}" y="${p.y(value)+4}" text-anchor="end" class="sales2-axis sales2-y-tick">${num(value)}</text>`).join('');
  return `<div class="sales2-legend"><span><i></i>實線 — 本期</span>${view.hasPrevious?'<span><i class="previous"></i>虛線 — 去年同期</span>':''}</div><div class="sales2-chart-stage"><svg class="sales2-chart" viewBox="0 0 ${chartWidth} ${height}" role="img" aria-label="銷量趨勢；月粒度；缺值斷線"><text x="${p.left}" y="14" class="sales2-axis">銷量（支）</text><path class="sales2-area" d="${p.area}"/>${grid}${trend?`<line class="sales2-reference-line" data-average="${trend.average}" x1="${p.left}" x2="${p.width-p.right}" y1="${p.y(trend.average)}" y2="${p.y(trend.average)}"/>`:''}<path class="sales2-line" data-series="current" d="${p.current}"/>${view.hasPrevious?`<path class="sales2-line previous" data-series="previous" d="${p.previous}"/>`:''}<circle class="sales2-latest-halo" cx="${p.x(latest)}" cy="${p.y(last.current)}" r="9"/>${dots('current','current')}${view.hasPrevious?dots('previous','previous'):''}<g class="sales2-latest-label" data-latest-period="${last.period}"><rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="21" rx="5"/><text x="${labelX+labelWidth/2}" y="${labelY+14}" text-anchor="middle">${num(last.current)}</text></g>${[...labels].sort((a,b)=>a-b).map(i=>`<text x="${p.x(i)}" y="${height-10}" text-anchor="middle" class="sales2-axis sales2-x-tick">${chartWidth>800&&view.rows.length>12&&i>0&&!view.rows[i].period.endsWith('/01')?view.rows[i].period.slice(-2):view.rows[i].period}</text>`).join('')}<line class="sales2-crosshair" y1="${p.top}" y2="${height-p.bottom}" hidden/>${view.rows.map((row,i)=>{const half=Math.max(8,(chartWidth-p.left-p.right)/Math.max(2,view.rows.length)/2),x=Math.max(p.left,p.x(i)-half),right=Math.min(chartWidth-p.right,p.x(i)+half);return`<rect class="sales2-hit" data-point="${i}" x="${x}" y="${p.top}" width="${right-x}" height="${height-p.top-p.bottom}" tabindex="0" role="button" aria-label="${row.period}；本期 ${units(row.current)}；去年同期 ${units(row.previous)}"/>`}).join('')}</svg><div class="sales2-tooltip" role="status" hidden></div></div>${trend?`<p class="sales2-average-note">${refLabel} ${monthly.formatAverage(trend.average)}｜${core.monthSpans(trend.months)}</p>`:''}<p class="sales2-chart-note">資料粒度：月｜缺值保留空白並斷線；點選或移到圖表可查看數值。</p>`;
 }
 function trendMarkup(view,width){
  const trend=core.recentTrend(view.rows);
  return `<div class="sales2-trend-heading"><h3>銷量趨勢</h3>${trend?`<span class="sales2-trend-chip ${trend.direction}">${trend.label}</span>`:''}</div><p class="sales2-subtitle">${escape(view.period)}</p>${chart(view,width)}`;
 }
 function comparison(view){
  if(!view.pairs.length)return'<p class="sales2-empty">目前沒有足夠同期資料</p>';
  const maximum=Math.max(1,view.previous,view.pairedCurrent);
  const bar=(label,value,klass)=>`<div class="sales2-bar-row"><span>${label}</span><b>${units(value)}</b><div class="sales2-bar-track"><i class="${klass}" style="width:${value/maximum*100}%"></i></div></div>`;
  return `<p class="sales2-pair-period">${core.monthSpans(view.previousMonths)} vs ${core.monthSpans(view.currentMonths)}</p>${view.partial?'<p class="sales2-scope-note">僅計入兩年度皆有資料之共同可比月份；不代表完整自然月同期。</p>':''}${bar('去年同期',view.previous,'previous')}${bar(view.partial?'本期（共同月份）':'本期',view.pairedCurrent,'current')}<p class="sales2-comparison-result"><span>${signed(view.difference)}</span><b>${percentage(view.rate)}</b></p>`;
 }
 function mount(card,binding){
  if(card.dataset.sales2)return;card.dataset.sales2='ready';card.classList.add('sales2');
  let state=states.get(binding.productId);const selected=binding.selected;if(selected)remember(selected);
  if(!state||state.name!==selected?.name){state={name:selected?.name||null,condition:{mode:'same'},view:null};states.set(binding.productId,state)}
  const advanced=card.querySelector('.sales-explorer');
  card.querySelectorAll('.px-section-head,.sales-analysis-hero,.same-period-summary,.sales-averages,.sales-secondary,.trend-wrap,.monthly-details,.sales-extrema,.px-data-note,.px-empty').forEach(e=>e.remove());
  const ui=document.createElement('div');ui.className='sales2-flow';
  ui.innerHTML=`<div class="sales2-heading"><h2>PX 銷售分析</h2><span>銷售分析 2.1</span></div><div class="sales2-controls"><div class="sales2-search"><label>商品搜尋<input class="sales2-search-input" type="search" autocomplete="off" role="combobox" aria-expanded="false" placeholder="搜尋商品名稱、條碼、PX 品號"></label><div class="sales2-search-results" role="listbox" hidden></div></div><label class="sales2-period-label">分析期間<select class="sales2-period"><option value="same">同期比較（今年累計）</option><option value="latest">最近一期</option><option value="all">全部資料</option><option value="custom">自訂期間</option></select></label></div><div class="sales2-custom" hidden><label>起始月份<input type="month" class="sales2-start"></label><label>結束月份<input type="month" class="sales2-end"></label></div><div class="sales2-body" aria-live="polite"></div>`;
  card.prepend(ui);if(advanced){const details=document.createElement('details');details.className='sales2-advanced';details.innerHTML='<summary>進階工具：自訂對比期／多商品比較</summary>';advanced.before(details);details.append(advanced)}
  const latestView=selected?monthly.analyze(periods,data[selected.name]?.sales):null;
  const body=ui.querySelector('.sales2-body'),search=ui.querySelector('.sales2-search-input'),results=ui.querySelector('.sales2-search-results'),period=ui.querySelector('.sales2-period');
  function references(){
   const view=monthly.analyze(periods,data[selected.name]?.sales),ext=PX_SALES_EXPLORER.extrema(periods,data[selected.name]?.sales);
   const item=(label,text)=>`<div><span>${label}</span><b>${escape(text)}</b></div>`;
   const average=(size,key)=>{const r=view.averages[key];return item(r.count===size?`近 ${size} 月平均`:r.count?`現有 ${r.count} 個月平均（近 ${size} 月）`:`近 ${size} 月資料不足`,monthly.formatAverage(r.value))};
   return `<section class="sales2-reference"><h3>月銷參考指標</h3><div class="sales2-reference-grid">${item('最新月銷量',`${units(view.latest)}（${view.latestMonth||'資料不足'}）`)}${item('MoM・較上月',monthly.formatChange(view.mom,'上月為 0，無法計算百分比'))}${item('YoY・較去年同月',monthly.formatChange(view.yoy,'去年同月為 0，無法計算百分比'))}${item(view.ytd.year?`${view.ytd.year} ${view.ytd.full?'YTD':'現有月份累計'}`:'累計資料不足',units(view.ytd.value))}${average(3,'three')}${average(6,'six')}</div>${!view.ytd.full&&view.ytd.months.length?`<p class="sales2-chart-note">累計實際計入：${core.monthSpans(view.ytd.months)}</p>`:''}<div class="sales-extrema"><div><span>${ext.complete12?'近 12 月最高':'現有期間高點'}</span><b>${units(ext.high)}</b><small>${ext.highMonths.join('、')||'資料不足'}</small></div><div><span>${ext.complete12?'近 12 月最低':'現有期間低點'}</span><b>${units(ext.low)}</b><small>${ext.lowMonths.join('、')||'資料不足'}</small></div></div></section>`;
  }
  search.value=selected?.name||'';period.value=state.condition.mode;
  function render(){
   if(!selected){body.innerHTML='<p class="sales2-empty">搜尋商品，查看銷量趨勢與同期表現</p>';period.disabled=true;return}
   const view=core.analyze(periods,data[selected.name]?.sales,state.condition);state.view=view;state.summary=core.conciseSummary(view,core.recentTrend(view.rows));
   const primaryNote=view.range.error?'資料不足':view.range.complete?view.period:`現有 ${view.range.count} / ${view.range.length} 個月；計入：${core.monthSpans(view.range.available)}`;
   body.innerHTML=`<header class="sales2-product"><div><h3>${escape(selected.name)}</h3><p>${escape(meta(selected))}</p><p>最新實銷資料：<b class="sales2-latest">${view.latest||'資料不足'}</b>｜非即時銷售資料</p></div><span class="sales2-badge ${view.status.tone}">${view.status.label}</span></header>${view.range.error?`<p class="sales2-error">${escape(view.summary[0])}</p>`:''}<section class="sales2-kpis" aria-label="銷量摘要"><article class="sales2-primary"><span>本期銷量</span><strong class="sales2-total">${num(view.total)}</strong><small>支｜${escape(primaryNote)}</small></article><article><span>同期增減</span><strong class="sales2-delta ${view.status.tone}">${signed(view.difference)}</strong><small>較去年同期${view.partial?'｜僅共同月份':''}</small></article><article><span>同期成長率</span><strong class="sales2-rate ${view.status.tone}">${percentage(view.rate)}</strong><small>YoY${view.partial?'｜僅共同月份':''}</small></article><article><span>最新月銷量</span><strong class="sales2-latest-value">${num(latestView.latest)}</strong><small>支｜${latestView.latestMonth||'資料不足'}</small></article></section><section class="sales2-trend">${trendMarkup(view)}</section><section class="sales2-comparison"><h3>同期表現</h3>${comparison(view)}</section><section class="sales2-summary"><h3>銷售判讀</h3>${state.summary.map(text=>`<p>${escape(text)}</p>`).join('')}<button type="button" class="secondary-action sales2-copy">複製銷售摘要</button><span class="sales2-copy-feedback" role="status"></span></section><details class="sales2-details"><summary>查看銷售明細</summary><div class="sales2-table-scroll" tabindex="0" aria-label="月銷明細，可橫向捲動"><table><thead><tr><th>期間</th><th>銷量（支）</th>${view.hasPrevious?'<th>同期銷量（支）</th><th>增減（支）</th><th>YoY</th>':''}</tr></thead><tbody>${view.rows.map(row=>`<tr><td>${row.period}</td><td>${core.valid(row.current)?num(row.current):'無資料'}</td>${view.hasPrevious?`<td>${core.valid(row.previous)?num(row.previous):'無資料'}</td><td>${core.valid(row.difference)?(row.difference>0?'+':'')+num(row.difference):'—'}</td><td>${row.rate.status==='comparable'?percentage(row.rate):row.rate.status==='zero-baseline'?'基準為 0':'—'}</td>`:''}</tr>`).join('')}</tbody></table></div><p class="sales2-chart-note">資料來源：@PX實銷_0902(1).xls／px-sales-data.js。null 為無有效資料，真實 0 保留。</p></details>`;
  }
  const originalRender=render;
  function refreshReferences(){if(selected)body.querySelector('.sales2-details')?.insertAdjacentHTML('beforeend',references())}
  // Keep auxiliary monthly indicators available, without duplicating the primary KPI layer.
  const renderWithReferences=()=>{originalRender();refreshReferences()};
  function options(){
   const query=search.value.trim(),matches=query?core.search(index,query):recent.map(name=>products.find(p=>p.name===name));
   results.hidden=false;search.setAttribute('aria-expanded','true');
   results.innerHTML=`${!query&&matches.length?'<p>最近查看</p>':''}${matches.length?matches.slice(0,6).map(p=>`<button type="button" role="option" data-sales-product="${escape(p.name)}" data-sales-index="${products.indexOf(p)}"><b>${escape(p.name)}</b><small>${escape(meta(p))||'商品主檔未提供條碼／PX 品號'}</small></button>`).join(''):`<p>${query?'找不到符合的商品':'輸入關鍵字搜尋商品'}</p>`}${matches.length>6?`<p class="sales2-search-more">另有 ${matches.length-6} 支符合</p>`:''}`;
  }
  const close=()=>{results.hidden=true;search.setAttribute('aria-expanded','false')};
  search.addEventListener('focus',()=>{search.select();search.value='';options()});search.addEventListener('input',options);
  search.addEventListener('blur',()=>setTimeout(close,120));
  search.addEventListener('keydown',event=>{const buttons=[...results.querySelectorAll('button')],active=buttons.findIndex(b=>b.classList.contains('active'));if(event.key==='Escape'){close();search.value=selected?.name||''}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const next=Math.max(0,Math.min(buttons.length-1,active+(event.key==='ArrowDown'?1:-1)));buttons.forEach(b=>b.classList.remove('active'));buttons[next]?.classList.add('active');buttons[next]?.scrollIntoView({block:'nearest'})}else if(event.key==='Enter'&&active>=0){event.preventDefault();buttons[active].click()}});
  results.addEventListener('mousedown',event=>event.preventDefault());
  results.addEventListener('click',event=>{const button=event.target.closest('[data-sales-product]');if(!button)return;const product=products[Number(button.dataset.salesIndex)];if(!product)return;remember(product);close();selectProduct(binding,product)});
  period.addEventListener('change',()=>{state.condition.mode=period.value;const custom=period.value==='custom';ui.querySelector('.sales2-custom').hidden=!custom;if(custom&&!state.condition.start){const preset=PX_SALES_EXPLORER.preset(state.view.latest,'ytd');state.condition.start=preset.aStart;state.condition.end=preset.aEnd}ui.querySelector('.sales2-start').value=(state.condition.start||'').replace('/','-');ui.querySelector('.sales2-end').value=(state.condition.end||'').replace('/','-');renderWithReferences()});
  for(const [selector,field] of [['.sales2-start','start'],['.sales2-end','end']])ui.querySelector(selector).addEventListener('input',event=>{state.condition[field]=PX_SALES_EXPLORER.normalize(event.target.value);renderWithReferences()});
  function tooltip(event){
   const target=event.target.closest('[data-point]');if(!target)return;const row=state.view.rows[Number(target.dataset.point)],tip=body.querySelector('.sales2-tooltip');
   const detail=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
   tip.innerHTML=`<strong class="sales2-tooltip-date">${row.period}</strong><dl>${core.valid(row.current)?detail('本期',units(row.current)):''}${core.valid(row.previous)?detail('去年同期',units(row.previous)):''}</dl>${core.valid(row.difference)?`<div class="sales2-tooltip-difference"><span>差異</span><b>${signed(row.difference)}</b>${row.rate.status==='comparable'?`<small>${percentage(row.rate)}</small>`:''}</div>`:''}`;tip.hidden=false;
   const stage=tip.parentElement,bounds=stage.getBoundingClientRect(),box=body.querySelector('.sales2-chart').viewBox.baseVal,width=box.width,coords=core.paths(state.view.rows,width,box.height),point=coords.x(Number(target.dataset.point))/width*bounds.width;
   tip.style.left=Math.max(4,Math.min(bounds.width-tip.offsetWidth-4,point-tip.offsetWidth/2))+'px';
   const cross=body.querySelector('.sales2-crosshair');cross.removeAttribute('hidden');cross.setAttribute('x1',String(coords.x(Number(target.dataset.point))));cross.setAttribute('x2',cross.getAttribute('x1'));
   body.querySelectorAll('.sales2-point').forEach(dot=>dot.classList.toggle('highlight',dot.dataset.point===target.dataset.point));
  }
  body.addEventListener('pointerover',tooltip);body.addEventListener('focusin',tooltip);body.addEventListener('click',event=>{if(event.target.closest('[data-point]'))tooltip(event)});
  body.addEventListener('pointerout',event=>{if(!event.relatedTarget?.closest('.sales2-chart-stage')){body.querySelector('.sales2-tooltip')?.setAttribute('hidden','');body.querySelector('.sales2-crosshair')?.setAttribute('hidden','')}});
  body.addEventListener('keydown',event=>{if(event.key==='Escape'){body.querySelector('.sales2-tooltip')?.setAttribute('hidden','');body.querySelector('.sales2-crosshair')?.setAttribute('hidden','')}});
  body.addEventListener('click',async event=>{if(!event.target.closest('.sales2-copy'))return;const view=state.view,lines=['【PX 銷售摘要】',`商品：${selected.name}`,meta(selected),'',`本期：${view.period}`,`本期銷量：${units(view.total)}`,`同期增減：${signed(view.difference)}`,`同期成長率：${percentage(view.rate)}`,`最新月銷量：${units(latestView.latest)}（${latestView.latestMonth||'資料不足'}）`];
   if(view.pairs.length)lines.push(`比較期間：${core.monthSpans(view.previousMonths)} vs ${core.monthSpans(view.currentMonths)}`,`本期可比月份：${units(view.pairedCurrent)}`,`去年同期：${units(view.previous)}`);
   if(view.partial)lines.push('僅計入兩年度皆有資料之共同可比月份；不代表完整自然月同期。');
   if(view.range.available&&!view.range.complete)lines.push(`本期實際計入：${core.monthSpans(view.range.available)||'無有效月份'}`);
   lines.push('',...state.summary,'',`最新實銷資料：${view.latest||'資料不足'}`,'※ 非即時銷售資料');let copied=false;try{await navigator.clipboard.writeText(lines.filter(line=>line!==undefined).join('\n'));copied=true}catch(error){try{copied=fallbackCopyText(lines.join('\n'))}catch(error){}}body.querySelector('.sales2-copy-feedback').textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限';
  });
  ui.querySelector('.sales2-custom').hidden=state.condition.mode!=='custom';ui.querySelector('.sales2-start').value=(state.condition.start||'').replace('/','-');ui.querySelector('.sales2-end').value=(state.condition.end||'').replace('/','-');renderWithReferences();
  let chartWidth=0;const resize=new ResizeObserver(()=>{if(!card.isConnected){resize.disconnect();return}const width=Math.max(260,Math.round(ui.clientWidth));if(width===chartWidth||!state.view||!ui.clientWidth)return;chartWidth=width;const trend=body.querySelector('.sales2-trend');if(trend){trend.innerHTML=trendMarkup(state.view,width)}});resize.observe(ui);
 }
 global.PX_SALES_DASHBOARD=Object.freeze({mount});
 // Empty entry still permits a search; existing selected cards mount after advanced tools.
 for(const binding of productBindings.filter(b=>b.salesId)){const container=document.getElementById(binding.salesId);const empty=()=>{if(binding.selected||container.querySelector('.px-sales-card')||(binding.productId==='cProduct'&&document.querySelector('#calc[data-calculator-mode="new"]')))return;const card=document.createElement('section');card.className='card px-sales-card';container.prepend(card);mount(card,binding)};new MutationObserver(empty).observe(container,{childList:true});empty()}
})(window);
