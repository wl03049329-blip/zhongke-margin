/* Phase 2 presentation; all sales inputs come from the read-only PX source. */
((global)=>{
 'use strict';
 const core=global.PX_SALES_EXPLORER,phase1=global.PX_SALES_ANALYSIS,periods=global.PX_SALES_PERIODS,data=global.PX_SALES_DATA;
 const number=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0});
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const units=phase1.formatUnits,average=phase1.formatAverage,percent=value=>phase1.formatChange(value,'基準為 0，無法計算百分比');
 const signed=value=>core.valid(value)?`${value>0?'+':''}${number.format(value)} 支`:'資料不足';
 const span=view=>`${view.start} ～ ${view.end}`;
 const states=new Map();
 const coverage=view=>`有效月份 ${view.count} / ${view.length}`;
 async function copy(text,feedback){
  let copied=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true}}catch(error){}
  if(!copied)try{copied=fallbackCopyText(text)}catch(error){}
  feedback.textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限';
 }
 function chartMarkup(series){
  const width=620,height=200,left=45,right=13,top=18,bottom=30;
  const maximum=Math.max(1,...series.flatMap(item=>item.values).filter(core.valid));
  const x=index=>left+index*(width-left-right)/11,y=value=>top+(height-top-bottom)*(1-value/maximum);
  const lines=series.map((item,seriesIndex)=>{
   let drawing=false,path='';
   item.values.forEach((value,index)=>{if(!core.valid(value)){drawing=false;return}path+=`${drawing?' L':' M'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`;drawing=true});
   const color=seriesIndex?'#71578e':'#176a73';
   return `<path class="sales-year-line" data-year="${item.year}" d="${path.trim()}" fill="none" stroke="${color}" stroke-width="2.5"${seriesIndex?' stroke-dasharray="5 4"':''}/>`+item.values.map((value,index)=>core.valid(value)?`<circle class="sales-year-dot" cx="${x(index)}" cy="${y(value)}" r="3" fill="white" stroke="${color}"><title>${item.year}/${String(index+1).padStart(2,'0')}：${number.format(value)} 支</title></circle>`:'').join('');
  }).join('');
  return `<svg class="sales-year-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${series[0].year} 與 ${series[1].year} 月銷量比較"><line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" stroke="#dce8eb"/><text x="${left-5}" y="${top+3}" text-anchor="end" class="trend-axis">${number.format(maximum)}</text><text x="${left-5}" y="${height-bottom}" text-anchor="end" class="trend-axis">0</text>${lines}${Array.from({length:12},(_,i)=>`<text x="${x(i)}" y="${height-9}" text-anchor="middle" class="trend-axis">${i+1}月</text>`).join('')}</svg>`;
 }
 function setupChart(card,product,state){
  const wrap=card.querySelector('.trend-wrap'),original=wrap?.querySelector('.trend-svg');if(!original)return;
  const modes=document.createElement('div');modes.className='sales-chart-modes';
  modes.innerHTML='<button type="button" data-mode="long">長期趨勢</button><button type="button" data-mode="year">同期比較</button>';wrap.prepend(modes);
  const panel=document.createElement('div');panel.className='sales-year-panel';
  const series=core.yearly(periods,data[product]?.sales);
  if(series)panel.innerHTML=`<div class="sales-year-legend"><span>實線 ${series[0].year}</span><span>虛線 ${series[1].year}</span></div>${chartMarkup(series)}<p class="sales-year-note">${series.map(item=>`${item.year}：${item.values.filter(core.valid).length} / 12 個月有效`).join('；')}。${series.some(item=>item.values.some(value=>!core.valid(value)))?'資料不完整，未提供月份保留空白。':''}</p>`;
  else panel.textContent='資料不足';
  wrap.append(panel);
  const update=()=>{const yearly=state.mode==='year';original.toggleAttribute('hidden',yearly);panel.hidden=!yearly;modes.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode)))};
  modes.addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(button){state.mode=button.dataset.mode;update()}});update();
 }
 function setupMonths(card,product){
  const details=card.querySelector('.monthly-details');if(!details)return;
  details.classList.add('sales-month-details');details.querySelector('summary').textContent='查看月份明細';
  details.querySelector('.monthly-grid').innerHTML='<div class="sales-month-heading"><span>月份</span><span>銷量（支）</span><span>MoM</span><span>YoY</span></div>'+core.monthDetails(periods,data[product]?.sales).map(row=>`<div class="month-row"><span>${row.period}</span><b>${core.valid(row.value)?number.format(row.value):'無資料'}</b><span>${escape(percent(row.mom))}</span><span>${escape(percent(row.yoy))}</span></div>`).join('');
 }
 function setupExtrema(card,product){
  const view=core.extrema(periods,data[product]?.sales),section=document.createElement('section');section.className='sales-extrema';section.setAttribute('aria-label','銷量高低點');
  section.innerHTML=`<div><span>${view.complete12?'近 12 月最高':'現有期間高點'}</span><b>${units(view.high)}</b><small>${view.highMonths.join('、')||'資料不足'}</small></div><div><span>${view.complete12?'近 12 月最低':'現有期間低點'}</span><b>${units(view.low)}</b><small>${view.lowMonths.join('、')||'資料不足'}</small></div><p class="sales-extrema-note">${view.start?`涵蓋：${view.start} ～ ${view.end}；${view.count} 個有效月份。`:'資料不足。'}同值月份全數列出。</p>`;
  (card.querySelector('.sales-averages')||card.querySelector('.same-period-summary')).after(section);
 }
 function controlsMarkup(){
  const inputs=(prefix,title)=>`<fieldset><legend>${title}</legend><label>起始月份<input type="month" data-range="${prefix}Start" aria-label="${title} 起始月份"></label><label>結束月份<input type="month" data-range="${prefix}End" aria-label="${title} 結束月份"></label></fieldset>`;
  return `<p class="sales-explorer-help">A 為本期、B 為對比期。兩個比較區共用此月份設定；差異＝A − B。來源涵蓋 ${periods[0]} ～ ${periods.at(-1)}，範圍外不補值。</p><div class="sales-presets"><button type="button" data-preset="ytd">今年 YTD vs 去年同期</button><button type="button" data-preset="three">近 3 個月 vs 去年同期</button><button type="button" data-preset="six">近 6 個月 vs 去年同期</button></div><div class="sales-range-controls">${inputs('a','期間 A')}${inputs('b','期間 B')}</div><button type="button" class="sales-prior-year">快速帶入去年同期（依 A 設定 B）</button>`;
 }
 function periodMarkup(view){
  if(view.error)return `<p class="sales-error" role="alert">${escape(view.error)}</p>`;
  const column=(label,result)=>`<article><h4>${label}</h4><p>${span(result)}</p><strong>${units(result.total)}</strong><p>${coverage(result)}</p><p>月平均 ${average(result.average)}</p>${!result.complete?`<p>實際計入：${result.available.join('、')||'無有效月份'}</p>`:''}</article>`;
  return `${view.warnings.map(text=>`<p class="sales-warning">${text}</p>`).join('')}<div class="sales-period-columns">${column('期間 A',view.a)}${column('期間 B',view.b)}</div><p class="sales-comparison-difference">銷量差：<b>${signed(view.difference)}</b><br>${view.rateLabel}：<b>${percent(view.rate)}</b></p>`;
 }
 function mount(container,binding){
  const card=container.querySelector('.px-sales-card');if(!card||card.dataset.salesExplorer||!binding.selected)return;
  const product=binding.selected.name,analysis=phase1.analyze(periods,data[product]?.sales);
  card.dataset.salesExplorer='ready';card.querySelector('.px-section-head h2').textContent='PX 銷售分析';
  card.classList.toggle('sales-empty-comparison',analysis.comparison?.status!=='comparable');
  let state=states.get(binding.productId);
  if(!state||state.product!==product){state={product,ranges:core.preset(analysis.latestMonth||periods.at(-1),'ytd'),names:[product],sort:'total',mode:'long'};states.set(binding.productId,state)}
  if(!global.PX_SALES_DASHBOARD){setupExtrema(card,product);setupChart(card,product,state);setupMonths(card,product)}
  const root=document.createElement('div');root.className='sales-explorer';
  root.innerHTML=`<details class="sales-advanced sales-custom"><summary>自訂期間比較</summary>${controlsMarkup()}<div class="sales-period-results" aria-live="polite"></div><button type="button" class="sales-copy-action sales-period-copy">複製期間比較</button><span class="sales-feedback" role="status"></span></details><details class="sales-advanced sales-multi"><summary>多商品比較（2～5 支）</summary><p class="sales-explorer-help">各商品使用相同 A／B 期間。請同時查看有效月份覆蓋，部分資料不能直接視為完整同期。</p>${controlsMarkup()}<label class="sales-multi-label">新增比較商品（名稱／PX 品號／條碼）<input class="sales-multi-search" type="search" autocomplete="off" placeholder="搜尋商品" aria-label="搜尋比較商品"></label><div class="sales-search-results" hidden></div><div class="sales-selected"></div><p class="sales-multi-note sales-selection-status" aria-live="polite"></p><label class="sales-sort-label">排序<select class="sales-sort"><option value="total">依本期銷量（高至低）</option><option value="difference">依差異支數（高至低）</option><option value="growth">依成長率（高至低）</option></select></label><div class="sales-multi-results" aria-live="polite"></div><button type="button" class="sales-copy-action sales-multi-copy">複製多商品比較</button><span class="sales-feedback" role="status"></span></details>`;
  const anchor=card.querySelector('.monthly-details')||card.querySelector('.sales-extrema');if(anchor)anchor.after(root);else card.append(root);
  const custom=root.querySelector('.sales-custom'),multiple=root.querySelector('.sales-multi'),customOutput=custom.querySelector('.sales-period-results'),multiOutput=multiple.querySelector('.sales-multi-results');
  const selected=multiple.querySelector('.sales-selected'),search=multiple.querySelector('.sales-multi-search'),options=multiple.querySelector('.sales-search-results'),status=multiple.querySelector('.sales-selection-status');
  function renderMulti(){
   selected.innerHTML=state.names.map((name,index)=>`<button type="button" data-remove="${index}" aria-label="移除 ${escape(name)}">${escape(name)} ×</button>`).join('');
   status.textContent=`已選 ${state.names.length} / 5 支${state.names.length===5?'；已達上限，移除後可新增。':''}`;
   multiple.querySelector('.sales-multi-copy').disabled=state.names.length<2;
   if(state.names.length<2){multiOutput.innerHTML='<p class="sales-explorer-help">請選擇至少 2 支商品進行比較。</p>';return}
   const rows=core.multi(periods,data,state.names,state.ranges,state.sort),first=rows[0].comparison;
   if(first.error){multiOutput.innerHTML=`<p class="sales-error" role="alert">${escape(first.error)}</p>`;multiple.querySelector('.sales-multi-copy').disabled=true;return}
   const cell=(label,content)=>`<td data-label="${label}">${content}</td>`;
   multiOutput.innerHTML=`<p class="sales-multi-note">A：${span(first.a)}<br>B：${span(first.b)}</p>${first.unequal?'<p class="sales-warning">比較期間長度不同；百分比為期間差異（非同期）。</p>':''}${rows.some(row=>row.comparison.partial)?'<p class="sales-warning">部分商品資料未完整；各列差異僅依有效月份，不代表完整同期。</p>':''}<table class="sales-multi-table"><thead><tr><th>商品</th><th>本期銷量</th><th>對比期銷量</th><th>差異支數</th><th>成長／差異率</th><th>有效月份</th></tr></thead><tbody>${rows.map(row=>{const c=row.comparison;return `<tr data-product="${escape(row.name)}">${cell('商品',escape(row.name))}${cell('本期銷量',`${units(c.a.total)}<small>月平均 ${average(c.a.average)}</small>`)}${cell('對比期銷量',`${units(c.b.total)}<small>月平均 ${average(c.b.average)}</small>`)}${cell('差異支數',signed(c.difference))}${cell(c.rateLabel,`${percent(c.rate)}<small>${c.rateLabel}</small>`)}${cell('有效月份',`A ${c.a.count} / ${c.a.length}；B ${c.b.count} / ${c.b.length}<small>最新有效月 ${row.latest.latestMonth||'資料不足'}：${units(row.latest.latest)}</small>`)}</tr>`}).join('')}</tbody></table><p class="sales-multi-note">非即時銷售資料；最新有效月份依各商品顯示。</p>`;
  }
  function refresh(){
   root.querySelectorAll('[data-range]').forEach(input=>{input.value=(state.ranges[input.dataset.range]||'').replace('/','-')});
   const view=core.compareRanges(periods,data[product]?.sales,state.ranges);customOutput.innerHTML=periodMarkup(view)+`<p class="sales-multi-note">最新實銷資料：${analysis.latestMonth||'資料不足'}<br>※ 非即時銷售資料</p>`;
   custom.querySelector('.sales-period-copy').disabled=!!view.error;renderMulti();root.querySelectorAll('.sales-feedback').forEach(node=>node.textContent='');
  }
  function searchResults(){
   const query=search.value.trim().toLocaleLowerCase('zh-TW');options.hidden=!query;if(!query){options.replaceChildren();return}
   const matches=PX_Q3_PRODUCTS.filter(item=>!state.names.includes(item.name)&&productSearchText(item).includes(query));
   options.innerHTML=state.names.length>=5?'<p>已選滿 5 支，請先移除商品。</p>':matches.length?matches.map(item=>`<button type="button" data-add="${escape(item.name)}">${escape(item.name)}</button>`).join(''):'<p>找不到符合的商品</p>';
  }
  search.addEventListener('input',searchResults);
  root.addEventListener('input',event=>{const input=event.target.closest('[data-range]');if(input){state.ranges[input.dataset.range]=core.normalize(input.value)||'';refresh()}});
  root.addEventListener('change',event=>{if(event.target.matches('.sales-sort')){state.sort=event.target.value;renderMulti()}});
  root.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.preset){state.ranges=core.preset(analysis.latestMonth||periods.at(-1),button.dataset.preset);refresh()}
   else if(button.classList.contains('sales-prior-year')){state.ranges.bStart=core.shift(state.ranges.aStart,-12)||'';state.ranges.bEnd=core.shift(state.ranges.aEnd,-12)||'';refresh()}
   else if(button.dataset.add){if(state.names.length<5&&!state.names.includes(button.dataset.add)){state.names.push(button.dataset.add);search.value='';searchResults();refresh()}}
   else if(button.dataset.remove!==undefined){state.names.splice(Number(button.dataset.remove),1);refresh();searchResults()}
   else if(button.classList.contains('sales-period-copy'))copy(`【PX 銷售期間比較】\n商品：${product}\n\n${customOutput.innerText}`,custom.querySelector('.sales-feedback'));
   else if(button.classList.contains('sales-multi-copy')){
    const rows=[...multiOutput.querySelectorAll('tbody tr')].map(row=>[...row.querySelectorAll('td')].map(cell=>`${cell.dataset.label}：${cell.innerText.replace(/\n/g,'；')}`).join('\n'));
    const notes=[...multiOutput.querySelectorAll('.sales-multi-note,.sales-warning')].map(node=>node.innerText);
    copy(`【PX 多商品銷售比較】\n\n${notes.join('\n')}\n\n${rows.join('\n\n')}`,multiple.querySelector('.sales-feedback'));
   }
  });
  multiple.querySelector('.sales-sort').value=state.sort;refresh();
  global.PX_SALES_DASHBOARD?.mount(card,binding);
 }
 for(const binding of productBindings.filter(item=>item.salesId)){
  const container=document.getElementById(binding.salesId);if(!container)continue;
  new MutationObserver(()=>mount(container,binding)).observe(container,{childList:true});mount(container,binding);
 }
})(window);
