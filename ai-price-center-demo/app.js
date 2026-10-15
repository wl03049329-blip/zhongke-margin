(function () {
  'use strict';
  const D=window.PRICE_DEMO_DATA,C=window.PriceDemoCore,$=id=>document.getElementById(id),last=D.periods.at(-1);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fresh=()=>({productId:null,tab:'history',range:6,from:D.periods.at(-2),to:last,basis:'average',pk:[null,null,null],unit:'length',results:[],highlight:-1,guide:false});
  let state=fresh();
  const selected=()=>D.products.find(p=>p.id===state.productId);
  const tone=change=>({UP:'up',DOWN:'down',SAME:'same'}[change.status]||'same');
  const changeLabel=change=>({UP:'較原檔增加',DOWN:'較原檔降低',SAME:'價格持平',NEW:'比較檔新增收錄',REMOVED:'比較檔未收錄',MISSING:'兩檔皆無資料'}[change.status]);
  function options(values, selectedValue, prompt){return (prompt?'<option value="">'+esc(prompt)+'</option>':'')+values.map(v=>`<option value="${esc(v.value)}"${v.value===selectedValue?' selected':''}>${esc(v.label)}</option>`).join('');}
  function closeSearch(){$('searchResults').hidden=true;$('productSearch').setAttribute('aria-expanded','false');$('productSearch').removeAttribute('aria-activedescendant');state.highlight=-1;}
  function search(){
    state.results=C.search(D.products,$('productSearch').value);state.highlight=-1;
    $('searchResults').innerHTML=state.results.length?state.results.map((p,i)=>`<button id="search-option-${i}" class="search-option" role="option" aria-selected="false" data-product="${esc(p.id)}"><span>${esc(p.name)}<small>${esc(p.barcode)} · ${esc(p.spec.label)}</small></span><span class="fictional-tag">示範</span></button>`).join(''):'<p class="search-empty">找不到符合的示範商品。可試試「保鮮膜」或「DEMO-10001」。</p>';
    $('searchResults').hidden=false;$('productSearch').setAttribute('aria-expanded','true');$('productSearch').removeAttribute('aria-activedescendant');
  }
  function renderProduct(){
    const p=selected(),record=C.at(p,last),avg=C.price(record),previous=C.price(C.at(p,D.periods.at(-2))),delta=C.change(previous,avg),priced=record?.listedCents!==null;
    $('productCard').innerHTML=`<div class="product-title"><span class="fictional-tag">虛構商品 · ${esc(last)} 示範檔</span><h2>${esc(p.name)}</h2><p class="product-meta">示範條碼 ${esc(p.barcode)}<br>${esc(p.spec.label)}</p><p class="product-promo">${avg?esc(C.labels[record.promotion.type]):'本檔未收錄有效示範價格'}</p></div><div class="product-metrics"><div class="metric"><span>標示售價</span><strong${!priced?' class="no-price"':''}>${priced?C.money(C.rational(record.listedCents)):'尚無價格'}</strong><small>每件商品</small></div><div class="metric primary-metric"><span>平均單件實付價</span><strong${!avg?' class="no-price"':''}>${avg?C.money(avg):'尚無價格'}</strong><small>依本檔促銷換算／件</small></div><div class="metric delta-metric"><span>較前檔平均實付</span><strong class="${tone(delta)}${!delta.delta?' no-price':''}">${delta.delta?(delta.status==='SAME'?'持平':C.signedMoney(delta.delta)):'無比較基準'}</strong><small>${delta.delta&&delta.status!=='SAME'?esc(C.percent(delta.percent)):'相鄰兩檔・同一基準'}</small></div></div>`;
  }
  function renderHistory(){
    if(!selected()||state.tab!=='history')return;
    const records=selected().history.slice(-state.range),container=$('historyChart'),w=Math.max(270,Math.round(container.clientWidth)),h=Math.round(container.clientHeight),left=w<500?49:63,right=20,top=20,bottom=37,plotW=w-left-right,plotH=h-top-bottom;
    const values=records.flatMap(r=>[C.decimal(C.price(r,'listed')),C.decimal(C.price(r))]).filter(v=>v!==null).map(v=>v/100),ticks=C.ticks(Math.max(0,...values)),max=ticks.at(-1),x=i=>left+i*plotW/Math.max(1,records.length-1),y=v=>top+plotH-v/max*plotH;
    function line(basis){let pen=false;return records.map((r,i)=>{const v=C.decimal(C.price(r,basis));if(v===null){pen=false;return '';}const s=`${pen?'L':'M'}${x(i).toFixed(2)},${y(v/100).toFixed(2)}`;pen=true;return s;}).join(' ');}
    const maxTicks=w<500?3:7,step=Math.max(1,Math.ceil((records.length-1)/(maxTicks-1))),tickIndices=records.map((_,i)=>i).filter(i=>i===0||i===records.length-1||i%step===0);
    container.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(selected().name)}，最近 ${state.range} 個月的虛構價格走勢；缺值處斷線"><title>標示售價與平均單件實付價；虛構示範資料</title>${ticks.map(t=>`<line class="chart-grid" x1="${left}" x2="${w-right}" y1="${y(t)}" y2="${y(t)}"/><text class="chart-axis" text-anchor="end" x="${left-9}" y="${y(t)+4}">${t}</text>`).join('')}<path class="listed-line" d="${line('listed')}"/><path class="average-line" d="${line('average')}"/>${records.map((r,i)=>['listed','average'].map(b=>{const v=C.decimal(C.price(r,b));return v===null?'':`<circle class="${b}-dot" cx="${x(i)}" cy="${y(v/100)}" r="${i===records.length-1?5:3.5}"/>`;}).join('')).join('')}${tickIndices.map(i=>`<text class="chart-axis" text-anchor="${i===0?'start':i===records.length-1?'end':'middle'}" x="${x(i)}" y="${h-10}">${esc(records[i].period)}</text>`).join('')}${records.map((r,i)=>`<rect class="chart-hit" data-history-index="${i}" tabindex="0" role="button" aria-label="查看 ${esc(r.period)} 價格" x="${Math.max(left-12,x(i)-Math.min(22,plotW/records.length/2))}" y="${top}" width="${Math.min(44,plotW/records.length)}" height="${plotH}"/>`).join('')}</svg>`;
    $('historyTable').innerHTML=records.map(r=>`<div class="history-row"><strong>${esc(r.period)}</strong><span>標示 ${C.money(C.price(r,'listed'))}／件</span><span>平均實付 ${C.money(C.price(r))}／件</span><span>${r.promotion?esc(C.labels[r.promotion.type]):'尚無示範價格・未補值'}</span></div>`).join('');
    $('historyReadout').textContent='點選資料點或用鍵盤 Tab 查看各檔價格；缺值月份保留斷線。';
    container.querySelectorAll('[data-history-index]').forEach(el=>{const show=()=>{const r=records[Number(el.dataset.historyIndex)];$('historyReadout').textContent=`${r.period}｜標示售價 ${C.money(C.price(r,'listed'))}｜平均單件實付 ${C.money(C.price(r))}${r.promotion?'｜'+C.labels[r.promotion.type]:'｜尚無示範價格'}`;};el.addEventListener('pointerenter',show);el.addEventListener('focus',show);el.addEventListener('click',show);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});});
  }
  function renderPeriods(){
    const p=selected(),a=C.price(C.at(p,state.from),state.basis),b=C.price(C.at(p,state.to),state.basis),delta=C.change(a,b),basis=state.basis==='average'?'平均單件實付價':'標示售價';
    $('periodResult').innerHTML=`<div class="comparison-grid"><div class="compare-cell"><span>原檔 ${esc(state.from)}</span><strong>${C.money(a)}</strong><small>${esc(basis)}／件</small></div><div class="compare-cell"><span>比較檔 ${esc(state.to)}</span><strong>${C.money(b)}</strong><small>${esc(basis)}／件</small></div><div class="compare-cell conclusion ${tone(delta)}"><b>${changeLabel(delta)}</b>${delta.delta?`<strong>${delta.status==='SAME'?'持平':(delta.status==='UP'?'↑ ':'↓ ')+C.money({n:Math.abs(delta.delta.n),d:delta.delta.d})}</strong><small>${delta.status==='SAME'?'兩檔價格相同':esc(C.percent(delta.percent))}</small>`:'<p>資料不足，暫不計算價差與百分比。</p>'}</div></div><p class="comparison-note">比較基準：兩檔皆為「${esc(basis)}／件」。變動百分比＝（比較檔 − 原檔）÷ 原檔 × 100%。</p>`;
    $('periodCoverage').innerHTML=D.products.map(p=>{const v=C.change(C.price(C.at(p,state.from),state.basis),C.price(C.at(p,state.to),state.basis));return `<div class="coverage-row"><span>${esc(p.name)}</span><strong class="${tone(v)}">${v.status==='NEW'?'新增收錄':v.status==='REMOVED'?'本檔未收錄':v.status==='MISSING'?'兩檔皆缺值':'兩檔皆有資料'}</strong></div>`;}).join('');
  }
  function resetPromotion(){const p=C.at(selected(),last)?.promotion;$('promotionType').value=p?.type||'SINGLE';$('promotionPrice').value=p?(p.priceCents/100).toFixed(2):'';$('bundleQuantity').value=String(p?.quantity&&p.quantity>=2?p.quantity:2);renderPromotion();}
  function renderPromotion(){
    const type=$('promotionType').value,raw=$('promotionPrice').value,price=C.parseCents(raw),quantity=Number($('bundleQuantity').value),result=C.promotion(type,price,quantity);
    $('bundleQuantityLabel').hidden=type!=='BUNDLE';$('promotionPriceLabel').textContent=type==='BUNDLE'?'組合總價':'單件標示售價';
    $('promotionResult').innerHTML=result?`<div class="promo-hero"><span>平均單件實付價</span><strong>${C.money(result.average)}<small>／件</small></strong><div class="promo-totals"><span>取得件數<b>${result.units} 件</b></span><span>總實付<b>${C.money(result.total)}</b></span></div></div><details class="details" open><summary>查看計算過程</summary><ol class="calculation-steps">${result.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`:`<div class="notice"><h3>尚未計算</h3><p>${raw.trim()?'請輸入大於 0 的有效金額（最多兩位小數、上限 $1,000,000），組合件數須為 2～99 的整數。':'請輸入金額與促銷條件，即時計算每件實付價。'}</p></div>`;
  }
  function renderPk(){
    const chosen=state.pk.filter(Boolean).map(id=>D.products.find(p=>p.id===id)),result=C.pk(chosen,last,state.unit);
    ['pkA','pkB','pkC'].forEach((id,i)=>{$(id).innerHTML=options(D.products.filter(p=>!state.pk.includes(p.id)||p.id===state.pk[i]).map(p=>({value:p.id,label:p.name})),state.pk[i],i===0?'選擇 A 商品':'選擇商品（選填）');});
    $('pkStatus').textContent=chosen.length<2?'選擇至少兩支商品，即可比較單位價格。':result.entries.some(e=>!e.unit)?'價格或規格不足，無法公平換算；不標示最低價。':!result.comparable?'用途或單位不同，不能直接比較；不標示最低價。':`同一比較基準：${result.entries[0].unit.label}。最低單位價格已標示；僅比較示範價格。`;
    $('pkCards').innerHTML=state.pk.map((id,i)=>{const e=result.entries.find(e=>e.product.id===id);if(!e)return `<div class="pk-card"><span class="pk-tag">方案 ${'ABC'[i]}</span><p class="muted">尚未選擇商品</p></div>`;const p=e.product,record=C.at(p,last),win=result.winners.includes(id);return `<article class="pk-card${win?' winner':''}" data-pk-product="${esc(id)}"><div class="pk-tag"><b>商品 ${'ABC'[i]}</b>${win?'<span class="winner-tag">最低單位價格</span>':''}</div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.spec.label)}</p><strong class="unit-value">${e.unit?C.money(e.unit.value):'—'}</strong><span class="unit-label">${e.unit?esc(e.unit.label):'規格或價格不足，無法公平換算'}</span><div class="pk-price">標示售價 <b>${C.money(C.price(record,'listed'))}</b><br>平均實付 <b>${C.money(e.average)}／件</b><br>${record?.promotion?esc(C.labels[record.promotion.type]):'本檔未提供價格'}</div></article>`;}).join('');
  }
  function renderSummary(){$('summaryItems').innerHTML=C.summaries(selected(),D.periods).map(row=>`<div class="summary-item"><p>${esc(row.text)}</p><details><summary>查看計算來源</summary><p>${esc(row.source)}</p></details></div>`).join('');}
  function setTab(tab, focus=false){state.tab=tab;document.querySelectorAll('[data-tab]').forEach(el=>{const active=el.dataset.tab===tab;el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1;$('panel-'+el.dataset.tab).hidden=!active;if(active&&focus)el.focus();});if(state.guide)document.querySelectorAll('[data-step]').forEach(el=>{if(el.dataset.step===tab)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});renderHistory();}
  function selectProduct(id){
    const p=D.products.find(p=>p.id===id);if(!p)return;
    state.productId=id;state.pk[0]=id;for(let i=1;i<3;i++)if(state.pk[i]===id)state.pk[i]=null;
    $('productSearch').value=p.name;closeSearch();$('welcome').hidden=true;$('workspace').hidden=false;
    renderProduct();renderPeriods();resetPromotion();renderPk();renderSummary();renderHistory();$('announcement').textContent='已選擇 '+p.name+'。所有價格均為虛構示範。';
  }
  function guide(step){
    document.querySelectorAll('[data-step]').forEach(el=>{if(el.dataset.step===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    if(step==='search'){$('productSearch').focus();$('productSearch').select();$('searchHeading').scrollIntoView({block:'start'});}
    if(step==='history'||step==='promotion'){closeSearch();setTab(step);$('panel-'+step).scrollIntoView({block:'start'});}
    if(step==='pk'){closeSearch();$('pkSection').open=true;$('pkSection').scrollIntoView({block:'start'});}
    if(step==='summary'){closeSearch();$('summarySection').scrollIntoView({block:'start'});}
  }
  function reset(){
    state=fresh();$('productSearch').value='';closeSearch();$('workspace').hidden=true;$('welcome').hidden=false;$('demoGuide').hidden=true;$('pkSection').open=false;
    for(const id of ['productCard','historyChart','historyTable','historyReadout','periodResult','periodCoverage','summaryItems','pkCards','pkStatus','promotionResult','searchResults'])$(id).replaceChildren();
    $('promotionPrice').value='';$('promotionType').value='SINGLE';$('bundleQuantity').value='2';$('pkUnit').value='length';$('compareBasis').value='average';$('compareFrom').value=state.from;$('compareTo').value=state.to;
    document.querySelectorAll('details').forEach(el=>el.open=false);document.querySelectorAll('[data-range]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.range)===6)));setTab('history');$('announcement').textContent='展示已重設，請重新選擇商品。';window.scrollTo(0,0);
  }
  $('compareFrom').innerHTML=options(D.periods.map(p=>({value:p,label:p+' 示範檔'})),state.from);
  $('compareTo').innerHTML=options(D.periods.map(p=>({value:p,label:p+' 示範檔'})),state.to);
  $('channelCards').innerHTML=D.channels.map(c=>`<article class="channel-card"><span class="fictional-tag">公開通路擴充位置</span><h3>${esc(c.name)}</h3><p>尚無可驗證價格</p><small>未載入公開報價；不使用示範價格冒充此通路價格。</small></article>`).join('');
  $('productSearch').addEventListener('input',search);$('productSearch').addEventListener('focus',search);
  $('productSearch').addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeSearch();return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if($('searchResults').hidden)search();if(!state.results.length)return;state.highlight=(state.highlight+(e.key==='ArrowDown'?1:-1)+state.results.length)%state.results.length;document.querySelectorAll('.search-option').forEach((el,i)=>el.setAttribute('aria-selected',String(i===state.highlight)));const el=$('search-option-'+state.highlight);$('productSearch').setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest'});}
    if(e.key==='Enter'&&!$('searchResults').hidden&&state.results.length){e.preventDefault();selectProduct(state.results[Math.max(0,state.highlight)].id);}
  });
  $('searchResults').addEventListener('click',e=>{const el=e.target.closest('[data-product]');if(el)selectProduct(el.dataset.product);});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))closeSearch();});
  $('clearSearch').addEventListener('click',()=>{$('productSearch').value='';$('productSearch').focus();search();});
  document.querySelectorAll('[data-quick]').forEach(el=>el.addEventListener('click',()=>selectProduct(el.dataset.quick)));
  document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>setTab(el.dataset.tab)));
  document.querySelector('.feature-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['history','periods','promotion','channels'],i=tabs.indexOf(state.tab);setTab(e.key==='Home'?tabs[0]:e.key==='End'?tabs[3]:tabs[(i+(e.key==='ArrowRight'?1:3))%4],true);});
  document.querySelectorAll('[data-range]').forEach(el=>el.addEventListener('click',()=>{state.range=Number(el.dataset.range);document.querySelectorAll('[data-range]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));renderHistory();}));
  for(const [id,key]of [['compareFrom','from'],['compareTo','to'],['compareBasis','basis']])$(id).addEventListener('change',()=>{state[key]=$(id).value;renderPeriods();});
  ['promotionType','promotionPrice','bundleQuantity'].forEach(id=>$(id).addEventListener('input',renderPromotion));
  ['pkA','pkB','pkC'].forEach((id,i)=>$(id).addEventListener('change',()=>{state.pk[i]=$(id).value||null;renderPk();}));
  $('pkUnit').addEventListener('change',()=>{state.unit=$('pkUnit').value;renderPk();});
  $('startDemo').addEventListener('click',()=>{reset();state.guide=true;$('demoGuide').hidden=false;selectProduct('demo-film-a');state.pk=['demo-film-a','demo-film-b','demo-film-c'];renderPk();guide('search');closeSearch();$('announcement').textContent='一鍵展示已就緒。示範保鮮膜與商品 PK 已載入。';});
  $('resetDemo').addEventListener('click',reset);document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>guide(el.dataset.step)));
  new ResizeObserver(()=>{if(state.productId&&state.tab==='history')renderHistory();}).observe($('historyChart'));
})();
