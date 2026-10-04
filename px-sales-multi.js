/* Sales 2.2 comparison center: only existing comparison results are presented. */
((global)=>{
 'use strict';
 const core=global.PX_SALES_EXPLORER,searchCore=global.PX_SALES_DASHBOARD_CORE,view=global.PX_SALES_MULTI_VIEW,periods=global.PX_SALES_PERIODS,data=global.PX_SALES_DATA,products=PX_PRODUCT_MASTER,index=searchCore.searchIndex(products),states=new Map();
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sorts={total:'銷量最高',growth:'成長最快',difference:'增加支數最多'};
 const meta=product=>[product.code?'PX 品號：'+product.code:'',product.barcode?'條碼：'+product.barcode:''].filter(Boolean).join('｜');
 function mount(pane,binding){
  if(!pane||pane.dataset.multiReady)return;pane.dataset.multiReady='true';pane.classList.add('sales22');
  let state=states.get(binding.productId);
  if(!state){state={names:binding.selected?[binding.selected.name]:[],ranges:core.preset(periods.at(-1),'ytd'),preset:'ytd',sort:'total',rows:[],presentation:null};states.set(binding.productId,state)}
  else if(!state.names.length&&!state.touched&&binding.selected)state.names=[binding.selected.name];
  const fields=(prefix,label)=>`<fieldset><legend>${label}</legend><label>起始月份<input type="month" data-range="${prefix}Start" aria-label="${label} 起始月份"></label><label>結束月份<input type="month" data-range="${prefix}End" aria-label="${label} 結束月份"></label></fieldset>`;
  pane.innerHTML=`<section class="sales22-selection"><h3>比較商品</h3><div class="sales22-search"><label>新增商品<input class="sales-multi-search" type="search" role="combobox" aria-expanded="false" autocomplete="off" placeholder="商品名稱、條碼、PX 品號" aria-label="搜尋比較商品"></label><div class="sales-search-results" role="listbox" hidden></div></div><div class="sales-selected" aria-label="已選商品"></div><p class="sales-selection-status" aria-live="polite"></p></section><section class="sales22-period"><h3>比較期間</h3><div class="sales22-presets" role="group" aria-label="多品比較期間"><button type="button" data-multi-preset="ytd">今年 YTD vs 去年同期</button><button type="button" data-multi-preset="three">近 3 月 vs 去年同期</button><button type="button" data-multi-preset="six">近 6 月 vs 去年同期</button><button type="button" data-multi-preset="custom">自訂</button></div><div class="sales22-custom" hidden><div class="sales-range-controls">${fields('a','期間 A（本期）')}${fields('b','期間 B（對比期）')}</div><button type="button" class="sales-prior-year">快速帶入去年同期</button></div><p class="sales22-period-note"></p><p class="sales22-note">各商品使用相同 A／B 期間；缺值不補 0，最新月依各商品自身資料顯示。</p></section><div class="sales-multi-results" aria-live="polite"></div><div class="sales22-copy-row"><button type="button" class="sales-multi-copy">複製多商品比較</button><span class="sales-feedback" role="status"></span></div>`;
  const search=pane.querySelector('.sales-multi-search'),results=pane.querySelector('.sales-search-results'),output=pane.querySelector('.sales-multi-results'),copy=pane.querySelector('.sales-multi-copy');
  function options(){
   const matches=searchCore.search(index,search.value).filter(product=>!state.names.includes(product.name));
   results.hidden=!search.value.trim();search.setAttribute('aria-expanded',String(!results.hidden));
   results.innerHTML=state.names.length>=5?'<p>已選滿 5 支，請先移除商品。</p>':matches.length?matches.slice(0,6).map(product=>`<button type="button" role="option" data-add="${escape(product.name)}"><b>${escape(product.name)}</b><small>${escape(meta(product))||'主檔未提供品號／條碼'}</small></button>`).join('')+(matches.length>6?`<p>另有 ${matches.length-6} 支符合</p>`:''):'<p>找不到符合的商品</p>';
  }
  function covered(c){
   return c.partial?`<details class="sales22-coverage"><summary>部分月份資料不足</summary><p>${view.coverage(c)}</p><p>A：${searchCore.monthSpans(c.a.available)||'無有效月份'}<br>B：${searchCore.monthSpans(c.b.available)||'無有效月份'}</p></details>`:`<small class="sales22-coverage-full">${view.coverage(c)}</small>`;
  }
  function kpi(title,leader,suffix){
   const names=leader.names,display=names.length?names[0]+(names.length>1?` 等 ${names.length} 支並列`:''):'資料不足';
   return`<article><span>${title}</span><h4 title="${escape(names.join('、'))}">${escape(display)}</h4><strong>${names.length?suffix(leader.value):'資料不足'}</strong><small>${leader.partial?'部分月份資料不足':title==='本期銷量最高'?'依本期有效月份':title==='增加支數最多'||title==='差異支數最高'?'依兩期有效月份':'僅完整可比資料'}</small></article>`;
  }
  function badge(row){
   const c=row.comparison,s=view.status(c.rate?.status==='comparable'?c.rate.value:null);
   return`<span class="sales2-badge ${s.tone}">${s.label}</span>`;
  }
  function volumeChart(rows){
   const maximum=Math.max(1,...rows.flatMap(row=>[row.comparison.a.total,row.comparison.b.total]).filter(core.valid));
   const bar=(label,value,klass)=>`<div class="sales22-volume-line"><span>${label}</span><div class="sales22-volume-track">${core.valid(value)?`<i class="${klass}" style="width:${Math.max(0,value)/maximum*100}%"></i>`:''}</div><b>${view.units(value)}</b></div>`;
   return`<section class="sales22-volume"><h3>本期 vs 對比期</h3><p class="sales22-note">依目前選定排序；兩期使用相同刻度。</p>${rows.map(row=>`<article data-volume-product="${escape(row.name)}"><h4>${escape(row.name)}</h4>${bar('本期',row.comparison.a.total,'current')}${bar('對比期',row.comparison.b.total,'previous')}${covered(row.comparison)}</article>`).join('')}</section>`;
  }
  function growthChart(yearly){
   const ranked=core.multi(periods,data,state.names,state.ranges,'growth'),maximum=Math.max(1,...ranked.map(row=>row.comparison.rate?.value).filter(core.valid).map(Math.abs));
   return`<section class="sales22-growth"><h3>${yearly?'同期成長率':'期間變化率'}排名</h3><p class="sales22-note">中央基準 0%；部分月份僅呈現有效資料差異，非完整 YoY。</p>${ranked.map(row=>{const c=row.comparison,value=c.rate?.status==='comparable'?c.rate.value:null,width=core.valid(value)?Math.abs(value)/maximum*50:0;
    return`<article data-growth-product="${escape(row.name)}"><h4>${escape(row.name)}</h4><div class="sales22-growth-heading">${badge(row)}<b class="${value>0?'positive':value<0?'negative':'neutral'}">${view.rate(c)}</b></div><div class="sales22-growth-track" aria-label="${escape(row.name)}：${view.rate(c)}"><span class="sales22-zero">0%</span>${core.valid(value)?`<i class="${value<0?'negative':'positive'}" style="left:${value<0?50-width:50}%;width:${width}%"></i>`:''}</div>${c.partial?'<p class="sales22-note">部分月份資料不足｜有效資料差異</p>':''}${!c.samePeriod?`<p class="sales22-note">${c.rateLabel}，非 YoY</p>`:''}</article>`;
   }).join('')}</section>`;
  }
  function table(rows,yearly){
   return`<section class="sales22-table"><h3>比較明細</h3><div class="sales22-table-scroll" tabindex="0" aria-label="比較明細，可橫向捲動"><table class="sales-multi-table"><thead><tr><th>排名</th><th>商品</th><th>本期銷量</th><th>${yearly?'去年同期':'對比期'}</th><th>增減支數</th><th>${yearly?'YoY':'期間變化率'}</th><th>最新月銷量</th><th>有效月份</th></tr></thead><tbody>${rows.map((row,i)=>{const c=row.comparison;return`<tr data-product="${escape(row.name)}"><td>${i+1}</td><td><b>${escape(row.name)}</b>${badge(row)}</td><td>${view.units(c.a.total)}<small>月平均 ${PX_SALES_ANALYSIS.formatAverage(c.a.average)}</small></td><td>${view.units(c.b.total)}<small>月平均 ${PX_SALES_ANALYSIS.formatAverage(c.b.average)}</small></td><td>${view.signed(c.difference)}</td><td>${view.rate(c)}<small>${c.rateLabel}</small></td><td>${view.units(row.latest.latest)}<small>${row.latest.latestMonth||'資料不足'}</small></td><td>${view.coverage(c)}${c.partial?'<small>部分月份資料不足</small>':''}</td></tr>`}).join('')}</tbody></table></div></section>`;
  }
  function render(){
   pane.querySelector('.sales-selected').innerHTML=state.names.map((name,i)=>`<span class="sales22-chip"><span>${escape(name)}</span><button type="button" data-remove="${i}" aria-label="移除 ${escape(name)}">×</button></span>`).join('');
   pane.querySelector('.sales-selection-status').textContent=`已選 ${state.names.length} / 5 支${state.names.length===5?'；已達上限。':''}`;
   pane.querySelectorAll('[data-range]').forEach(input=>input.value=(state.ranges[input.dataset.range]||'').replace('/','-'));
   pane.querySelectorAll('[data-multi-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.multiPreset===state.preset)));
   pane.querySelector('.sales22-custom').hidden=state.preset!=='custom';
   pane.querySelector('.sales22-period-note').textContent=`A：${state.ranges.aStart||'待選擇'}～${state.ranges.aEnd||'待選擇'}　vs　B：${state.ranges.bStart||'待選擇'}～${state.ranges.bEnd||'待選擇'}`;
   pane.querySelector('.sales-feedback').textContent='';copy.disabled=true;state.rows=[];state.presentation=null;
   if(state.names.length<2){output.innerHTML='<p class="sales2-empty">請選擇至少 2 支商品進行比較。</p>';return}
   const rows=core.multi(periods,data,state.names,state.ranges,state.sort),error=rows.find(row=>row.comparison.error);
   if(error){output.innerHTML=`<p class="sales-error" role="alert">${escape(error.comparison.error)}</p>`;return}
   state.rows=rows;state.presentation=view.describe(rows);copy.disabled=false;const p=state.presentation;
   output.innerHTML=`<section class="sales22-kpis" aria-label="多品比較摘要">${kpi('本期銷量最高',p.volume,view.units)}${kpi(p.yearly?'成長率最高':'期間變化最高',p.growth,v=>(v>0?'+':'')+v.toFixed(1)+'%')}${kpi(p.difference.value>0?'增加支數最多':'差異支數最高',p.difference,view.signed)}${kpi(p.weakLabel,p.weak,v=>(v>0?'+':'')+v.toFixed(1)+'%')}</section><label class="sales22-sort">排序<select class="sales-sort"><option value="total">銷量最高</option><option value="growth">成長最快</option><option value="difference">增加支數最多</option></select></label>${rows.some(row=>row.comparison.partial)?'<p class="sales22-note">部分月份資料不足；成長摘要僅採完整可比資料，各商品覆蓋詳列於圖表與明細。</p>':''}${rows[0].comparison.unequal?'<p class="sales-warning">比較期間長度不同；百分比為期間差異，非同期。</p>':''}<div class="sales22-charts">${volumeChart(rows)}${growthChart(p.yearly)}</div><section class="sales22-summary"><h3>比較重點</h3>${p.summary.map(text=>`<p>${escape(text)}</p>`).join('')}</section>${table(rows,p.yearly)}<p class="sales22-note">非即時銷售資料；最新有效月份依各商品顯示。原始實銷資料唯讀。</p>`;
   output.querySelector('.sales-sort').value=state.sort;
  }
  search.addEventListener('input',options);search.addEventListener('focus',()=>{if(search.value.trim())options()});
  results.addEventListener('mousedown',event=>event.preventDefault());
  search.addEventListener('blur',()=>setTimeout(()=>{results.hidden=true;search.setAttribute('aria-expanded','false')},120));
  search.addEventListener('keydown',event=>{const buttons=[...results.querySelectorAll('[data-add]')],current=buttons.findIndex(b=>b.classList.contains('active'));if(event.key==='Escape'){results.hidden=true;search.setAttribute('aria-expanded','false')}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const next=Math.max(0,Math.min(buttons.length-1,current+(event.key==='ArrowDown'?1:-1)));buttons.forEach(b=>b.classList.remove('active'));buttons[next]?.classList.add('active');buttons[next]?.scrollIntoView({block:'nearest'})}else if(event.key==='Enter'&&current>=0){event.preventDefault();buttons[current].click()}});
  pane.addEventListener('input',event=>{const field=event.target.closest('[data-range]');if(field){state.ranges[field.dataset.range]=core.normalize(field.value)||'';render()}});
  pane.addEventListener('change',event=>{if(event.target.matches('.sales-sort')){state.sort=event.target.value;render()}});
  pane.addEventListener('click',async event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.add&&state.names.length<5&&!state.names.includes(button.dataset.add)&&products.some(p=>p.name===button.dataset.add)){state.touched=true;state.names.push(button.dataset.add);search.value='';options();render();search.focus()}
   else if(button.dataset.remove!==undefined){state.touched=true;state.names.splice(Number(button.dataset.remove),1);render();options()}
   else if(button.dataset.multiPreset){state.preset=button.dataset.multiPreset;if(state.preset!=='custom')state.ranges=core.preset(periods.at(-1),state.preset);render()}
   else if(button.classList.contains('sales-prior-year')){state.ranges.bStart=core.shift(state.ranges.aStart,-12)||'';state.ranges.bEnd=core.shift(state.ranges.aEnd,-12)||'';render()}
   else if(button.classList.contains('sales-multi-copy')&&state.presentation){const text=view.copyText(state.rows,state.presentation,sorts[state.sort]);let copied=false;try{await navigator.clipboard.writeText(text);copied=true}catch(error){try{copied=fallbackCopyText(text)}catch(error){}}pane.querySelector('.sales-feedback').textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限'}
  });
  render();
 }
 global.PX_SALES_MULTI=Object.freeze({mount});
 for(const binding of productBindings.filter(b=>b.salesId))mount(document.querySelector('#'+binding.salesId+' .sales22-multi-pane'),binding);
})(window);
