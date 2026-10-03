/* Presentation only. All prices, units and differences come from existing cores. */
(()=>{
 'use strict';
 const panel=$('campaign'),search=$('campaignSearch'),results=$('competitorResults');
 const originalRender=renderCompetitorSearch,escape=competitorEscape,money=competitorMoney;
 function searchable(){
  const entries=new Map(PX_CATALOG_CONFIG.products.map(p=>[p.id,p]));
  return [...PX_PRODUCT_MASTER.map(p=>{const meta=entries.get(p.code||p.barcode);return {id:'px:'+(p.code||p.barcode||p.name),name:p.name,code:p.code,barcode:p.barcode,brand:meta?.brand,category:catalogSearch.category(p)||'OTHER',kind:'PX 商品',query:p.code||p.barcode||p.name,fields:catalogSearch.ownFields(p)};}),
   ...COMPETITOR_DATA.records.map(p=>({id:'public:'+p.competitorProductId,name:p.productName,code:p.retailerProductId,barcode:p.barcode,brand:p.brand,category:p.category||'OTHER',kind:p.retailer+' 公開商品',query:p.retailerProductId||p.productName,fields:catalogSearch.marketFields(p)}))];
 }
 const button=document.createElement('button');button.type='button';button.id='campaignSearchableProducts';button.textContent='查看可搜尋商品';button.setAttribute('aria-haspopup','dialog');
 panel.querySelector('.campaign-browse-actions').prepend(button);
 const drawer=document.createElement('dialog');drawer.id='campaignProductDrawer';drawer.className='campaign-product-drawer';drawer.setAttribute('aria-labelledby','campaignProductDrawerTitle');
 drawer.innerHTML='<div class="lookup-drawer-head"><div><h2 id="campaignProductDrawerTitle">可搜尋商品</h2><p id="campaignProductCount"></p></div><button type="button" data-lookup-close aria-label="關閉商品清單">關閉</button></div><label for="campaignProductListSearch">搜尋清單內商品</label><input id="campaignProductListSearch" type="search" placeholder="商品名稱、品牌、品號或條碼" autocomplete="off"><div id="campaignProductList" class="lookup-product-list"></div>';
 document.body.append(drawer);
 function renderList(){
  const all=searchable(),query=$('campaignProductListSearch').value.trim(),visible=all.filter(p=>!query||catalogSearch.matches(query,p.fields));
  $('campaignProductCount').textContent=`目前共 ${all.length} 項 · PX 商品 ${PX_PRODUCT_MASTER.length}／公開商品 ${COMPETITOR_DATA.records.length}${query?' · 符合 '+visible.length+' 項':''}`;
  const groups=[...new Set(visible.map(p=>p.category))];
  $('campaignProductList').innerHTML=groups.map(category=>`<section><h3>${escape(catalogSearch.label(category)==='OTHER'?'其他':catalogSearch.label(category))}</h3>${visible.filter(p=>p.category===category).map(p=>`<button type="button" class="lookup-product-option" data-lookup-id="${escape(p.id)}"><b>${escape(p.name)}</b><small>${escape(p.kind)}${p.brand?' · 品牌：'+escape(p.brand):''} · 分類：${escape(catalogSearch.label(category))}</small>${p.code?`<small>品號：${escape(p.code)}</small>`:''}${p.barcode?`<small>條碼：${escape(p.barcode)}</small>`:''}</button>`).join('')}</section>`).join('')||'<p class="campaign-empty">找不到符合的已收錄商品</p>';
 }
 button.addEventListener('click',()=>{$('campaignProductListSearch').value='';renderList();drawer.showModal();$('campaignProductListSearch').focus()});
 $('campaignProductListSearch').addEventListener('input',renderList);
 drawer.addEventListener('click',event=>{
  if(event.target.closest('[data-lookup-close]'))drawer.close();
  const option=event.target.closest('[data-lookup-id]');if(option){const product=searchable().find(p=>p.id===option.dataset.lookupId);if(product){drawer.close();campaignBrowseCategory=null;search.value=product.query;search.dispatchEvent(new Event('input',{bubbles:true}));results.scrollIntoView({block:'start',behavior:'smooth'})}}
  if(event.target===drawer){const rect=drawer.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)drawer.close()}
 });
 drawer.addEventListener('close',()=>button.focus());
 function basis(c){return c.metric==='AREA'?'依每平方公尺比較':c.metric==='LENGTH'?'依每 10m 比較':'規格不足，無法公平換算'}
 function unit(c){return c.metric==='AREA'?'㎡':'10m'}
 function price(value){return value===null||!Number.isFinite(value)?'目前無有效價格':'$'+money(value)}
 function conclusion(c){
  if(c.direction==='UNAVAILABLE')return `<div class="lookup-conclusion unavailable" data-lookup-direction="UNAVAILABLE"><b>${['PX_PRICE_MISSING','COMPETITOR_PRICE_MISSING'].includes(c.reason)?'目前無有效價格':'規格不足，無法公平換算'}</b><small>${c.reason==='PX_PRICE_MISSING'?'OP 本檔尚無有效均價':c.reason==='COMPETITOR_PRICE_MISSING'?'競品目前無有效價格':'暫無法計算與 OP 差額'}</small></div>`;
  if(c.direction==='SAME')return '<div class="lookup-conclusion same" data-lookup-direction="SAME"><b>價格接近</b><small>換算價格相同</small></div>';
  // Existing core defines competitor minus OP, with OP as the percentage denominator.
  // Invert only the presentation sign to describe OP; never recompute/round the source values.
  const cheaper=c.direction==='HIGHER',sign=cheaper?'−':'+';
  return `<div class="lookup-conclusion ${cheaper?'cheaper':'higher'}" data-lookup-direction="${c.direction}" aria-label="${cheaper?'OP 較便宜':'OP 較高'} ${money(Math.abs(c.difference))} 元／${unit(c)}"><b>${cheaper?'OP 較便宜':'OP 較高'}</b><strong>${sign}$${money(Math.abs(c.difference))}<small>／${unit(c)}</small></strong><span>${sign}${Math.abs(c.percentage).toFixed(2)}%</span><small>價差百分比以 OP 換算價為分母</small></div>`;
 }
 function card(product,benchmark){
  const c=benchmark?CompetitorComparison.comparePxToCompetitor(benchmark,product):null,metrics=c?.competitor||CompetitorComparison.getCompetitorMetrics(product),fresh=CompetitorPrice.freshness(product,competitorRuntime[product.competitorProductId]);
  const source=document.createElement('div');source.innerHTML=competitorCard(product,benchmark);const details=source.querySelector('.competitor-details');details.querySelector('summary').textContent='查看完整資料／資料來源';
  details.querySelector('.competitor-detail-content').insertAdjacentHTML('afterbegin',`${product.barcode?`<p>條碼：${escape(product.barcode)}</p>`:''}<p>品號：${escape(product.retailerProductId||'來源未提供')}</p><p>寬度：${metrics.widthCm===null?'來源未提供':money(metrics.widthCm)+'cm'}｜長度：${metrics.lengthM===null?'來源未提供':money(metrics.lengthM)+'m'}｜入數：${metrics.packQuantity??'來源未提供'}</p><p>原始抓取文字（規格）：${escape(product.sourceSpecText||'來源未提供')}</p>`);
  const comparable=c&&c.direction!=='UNAVAILABLE';
  return `<article class="card competitor-card lookup-comparison-card" data-lookup-competitor="${escape(product.competitorProductId)}" data-competitor-id="${escape(product.competitorProductId)}"${benchmark?` data-lookup-benchmark="${escape(benchmark.productCode)}"`:''}><div class="lookup-card-head"><span>${escape(product.brand)}${CompetitorPrice.key(product.brand)==='op'?' · 自家公開價':''} · ${escape(product.retailer)}</span><h3>${escape(product.productName)}</h3><p>${escape(competitorSpec(metrics)||'規格待確認')}</p></div><div class="lookup-original"><span>原始售價${benchmark?'（每件）':''}</span>${benchmark?`<div><span>OP 基準 <b>${price(benchmark.effectivePrice)}</b></span><span>${escape(product.brand)} <b>${price(product.currentPrice)}</b></span></div>`:`<b>${price(product.currentPrice)}</b>`}${metrics.priceBasis==='PROMOTION_AVERAGE'?`<small>競品換算採可靠促銷均價 ${price(metrics.effectivePrice)}／件</small>`:''}</div>${c?`<div class="lookup-basis"><b>比較基準</b><span>${c.specMismatch?'規格不同｜':''}${basis(c)}</span></div>`:''}${comparable?`<div class="lookup-normalized"><span>同規格換算</span><div><div><small>OP 基準</small><b>$${money(c.pxValue)}<small>／${unit(c)}</small></b></div><div><small>${escape(product.brand)}</small><b>$${money(c.competitorValue)}<small>／${unit(c)}</small></b></div></div></div>`:c?'':`<div class="lookup-market-metric">${metrics.effectivePrice===null?'目前無有效價格':competitorMetricMarkup(metrics)}</div>`}${c?conclusion(c):'<p class="lookup-select-notice">尚未選取 OP 基準；不計算差額。</p>'}${metrics.totalLengthM!==null&&metrics.widthCm===null?'<p class="lookup-caution">寬度未提供｜依既有規則按長度換算。</p>':''}${c?.materialMismatch?'<p class="lookup-caution">材質不同；換算僅比較價格，不代表品質相同。</p>':''}<small class="lookup-updated" data-source-status="${fresh.status}">更新：${fresh.lastSuccessAt?competitorTime(fresh.lastSuccessAt).slice(0,10):'尚未更新'}${['FAILED','STALE','UNSUPPORTED'].includes(fresh.status)?' · 資料待更新':''}</small>${details.outerHTML}</article>`;
 }
 function renderLookup(query,products){
  if(campaignBrowseCategory!==null)return;
  const mapped=products.filter(p=>['CLING_FILM','FOIL','BAKING_PAPER'].includes(catalogSearch.category(p))),selected=mapped.find(p=>p.code===competitorSearchSelection)||(mapped.length===1?mapped[0]:null),benchmark=selected?competitorBenchmark(selected):null;
  let matches=competitorMatches(query,products);if(selected)matches=matches.filter(p=>p.category===catalogSearch.category(selected));
  campaignDetails.hidden=false;if(!query.trim()){results.innerHTML='';campaignDetails.open=true;return}
  if(!matches.length){results.innerHTML='';campaignDetails.open=true;return}campaignDetails.open=false;
  const comparisons=benchmark?matches.map(p=>CompetitorComparison.comparePxToCompetitor(benchmark,p)):[],counts={HIGHER:0,LOWER:0,SAME:0,UNAVAILABLE:0};comparisons.forEach(c=>counts[c.direction]++);
  const summary=benchmark?`OP 換算後價格低於 ${counts.HIGHER} 個公開商品，高於 ${counts.LOWER} 個；${counts.SAME} 個換算價格相同${counts.UNAVAILABLE?'，'+counts.UNAVAILABLE+' 個無法公平比較':''}。`:'';
  const choices=!benchmark&&mapped.length?`<div class="lookup-choices"><p>選擇一支 OP 基準商品；不自動選取第一筆。</p>${mapped.map(p=>`<button type="button" data-px-compare="${escape(p.code)}">${escape(p.name)}</button>`).join('')}</div>`:'';
  const originalSection=document.createElement('div');originalSection.innerHTML=competitorSection(matches,selected);const sort=originalSection.querySelector('.competitor-heading label');
  let benchmarkMarkup='';if(benchmark){const original=document.createElement('div');original.innerHTML=competitorBenchmarkMarkup(benchmark);original.querySelector('.competitor-benchmark-head b').textContent='OP 基準商品';original.querySelector('.competitor-detail-content').insertAdjacentHTML('afterbegin',`<p>品號：${escape(selected.code||'尚未建檔')}｜條碼：${escape(selected.barcode||'尚未建檔')}</p><p>寬度：${benchmark.widthCm??'來源未提供'}cm｜長度：${benchmark.lengthM??'來源未提供'}m｜每件入數：${benchmark.packQuantity??'來源未提供'}</p>`);benchmarkMarkup=original.innerHTML}
  results.innerHTML=`<section class="lookup-results"><div class="lookup-heading"><h2>價格比對</h2>${sort?.outerHTML||''}</div>${choices}${benchmarkMarkup}${summary?`<p class="lookup-summary"><b>本次比價摘要</b>${summary}</p>`:'<p class="competitor-selection-hint">選擇一支 OP 商品即可比較差額；目前僅列公開價格。</p>'}<p class="competitor-disclaimer">公開網購價格，門市價格可能不同；比較僅採 OP 本檔有效價格。</p>${originalSection.querySelector('.competitor-sort-note')?.outerHTML||''}<div class="lookup-comparison-list">${competitorSorted(matches,benchmark).map(p=>card(p,benchmark)).join('')}</div></section>`;
 }
 // Only the campaign result presentation changes; product insight cards retain their existing UI.
 renderCompetitorSearch=function(query,products=[]){originalRender(query,products);document.querySelectorAll('#campaignResults [data-px-compare]').forEach(button=>button.remove());renderLookup(query,products)};
 // Keep full campaign/history output, below the comparison, behind a secondary layer.
 const campaignDetails=document.createElement('details');campaignDetails.className='lookup-campaign-details';campaignDetails.innerHTML='<summary>檔期售價／歷史資料</summary>';
 $('campaignResults').before(campaignDetails);campaignDetails.append($('campaignResults'));campaignDetails.before(results);
 $('campaignBrowseAll').textContent='公開價格清單';$('campaignBrowseAll').addEventListener('click',()=>{campaignDetails.hidden=true});
 const browseNote=panel.querySelector('.campaign-browse-actions small');if(browseNote)browseNote.textContent='已收錄商品可直接點選查價。';
 window.PXLookupUI=Object.freeze({searchable,renderList,renderLookup});
 renderCampaignSearch();
})();
