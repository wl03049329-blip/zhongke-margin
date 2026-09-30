/* Read-only campaign lookup linked to the existing product master. */
const promoDataByName=new Map(PX_PROMO_PRICES.products.map(p=>[p.productName,p]));
const PX_PRODUCT_MASTER=[...PX_Q3_PRODUCTS,...PX_PRODUCT_ADDITIONS];
const promoEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const promoDateRange=p=>`${p.startDate.replaceAll('-','/')} ～ ${p.endDate.replaceAll('-','/')}`;
function promoStatus(){const ctx=PXPromo.context(PX_PROMO_PRICES,PXPromo.today()),p=ctx.preferred;return p?`${ctx.current?'本檔':'下一檔'} ${p.label} · ${promoDateRange(p)}`:'目前無進行中或即將開始檔期';}
function promoPeriodMarkup(period,compact=false,label=''){
 if(!period)return '<p class="campaign-empty">本檔未提供促銷價格</p>';
 return `<div class="campaign-period"><div class="campaign-period-head"><b>${promoEscape(label)} ${period.label}</b><span>${promoEscape(period.campaignType)}</span></div><small>${promoDateRange(period)}</small><div class="campaign-prices${compact?' compact':''}">${period.promotions.map(p=>`<div class="campaign-price"><span>${promoEscape(p.label)}</span><strong>${p.promotionPrice===null?'未提供售價':'$'+PXPromo.money(p.promotionPrice)}</strong><b>${p.averageUnitPrice===null?'均價暫無法計算':'均價 $'+PXPromo.money(p.averageUnitPrice)+'／件'}</b></div>`).join('')}</div></div>`;
}
function promoComparisonMarkup(product,periodId,compact=false){
 const c=PXPromo.comparePeriods(PX_PROMO_PRICES,product,periodId),periodName=c.currentPeriod?.label||'',bestLabel=`${periodName} 最低均價`;
 const best=c.currentBest===null?'均價暫無法計算':`$${PXPromo.money(c.currentBest)}／件`;
 let message='',delta='';
 if(c.status==='CURRENT_UNAVAILABLE')message='本檔無可計算均價，暫無法比較價格變化';
 else if(c.status==='NO_PREVIOUS_PERIOD')message='尚無上一檔，暫無法比較價格變化';
 else if(c.status==='PREVIOUS_MISSING')message=(c.isNew?'新品／上檔無促銷資料':'上檔未提供促銷價格')+'；暫無法比較價格變化';
 else if(c.status==='PREVIOUS_UNAVAILABLE')message='上檔均價暫無法計算；暫無法比較價格變化';
 else if(c.status==='UNCHANGED'){message='最低均價持平';delta=`$${PXPromo.money(c.currentBest)}／件`;}
 else{const up=c.status==='INCREASED';message=up?'較上檔增加':'較上檔降低';delta=`${up?'↑':'↓'} $${PXPromo.money(Math.abs(c.priceDelta))}／件 · ${c.changePercent===null?'暫無法計算百分比':(up?'+':'')+c.changePercent.toFixed(2)+'%'}`;}
 const summary=`<span>${promoEscape(message)}</span>${delta?`<b>${delta}</b>`:''}${c.promotionChange?'<span class="campaign-change-label">促銷方式變更</span>':''}`;
 if(compact)return `<span class="campaign-comparison-brief">最低均價 ${best}<br>${summary}</span>`;
 return `<div class="campaign-comparison" data-period="${promoEscape(periodId)}" data-comparison-status="${c.status}"><div class="campaign-best"><span>${bestLabel}</span><b>${best}</b></div><div class="campaign-delta">${summary}</div>${c.previousBest===null?'':`<small>上檔 ${c.previousPeriod.label} 最低均價 $${PXPromo.money(c.previousBest)}／件</small>`}${c.promotionChange?`<details class="campaign-history"><summary>查看上檔促銷方式</summary>${promoPeriodMarkup(c.previous,true,'上檔')}</details>`:''}</div>`;
}
function promoProductMarkup(product,mode='current',details=true){
 const data=promoDataByName.get(product.name),ctx=PXPromo.context(PX_PROMO_PRICES,PXPromo.today());
 if(!data)return '<p class="campaign-empty">未提供檔期售價；商品原試算功能不受影響。</p>';
 const preferred=mode==='next'?ctx.next:ctx.preferred;
 let result=mode==='all'?Object.values(data.periods).sort((a,b)=>a.startDate.localeCompare(b.startDate)).map(p=>promoPeriodMarkup(p)+promoComparisonMarkup(product,p.id)).join(''):promoPeriodMarkup(preferred?data.periods[preferred.id]:null,false,mode==='next'||!ctx.current?'下一檔':'本檔')+(preferred&&data.periods[preferred.id]?promoComparisonMarkup(product,preferred.id):'');
 if(mode==='current'&&ctx.current&&ctx.next&&data.periods[ctx.next.id])result+=promoPeriodMarkup(data.periods[ctx.next.id],true,'下一檔');
 if(details&&mode!=='all')result+=`<details class="campaign-history"><summary>歷史售價／全部檔期</summary>${Object.values(data.periods).sort((a,b)=>a.startDate.localeCompare(b.startDate)).map(p=>promoPeriodMarkup(p,true)).join('')}</details>`;
 return result;
}
function promoInfoMarkup(product){return `<section class="card campaign-info"><div class="px-section-head"><h2>檔期售價</h2><span class="px-source">資料版本：${promoEscape(PX_PROMO_PRICES.dataVersion)}</span></div><div class="campaign-status">${promoStatus()}</div>${promoProductMarkup(product)}</section>`;}
function promoOptionMarkup(product){const data=promoDataByName.get(product.name),ctx=PXPromo.context(PX_PROMO_PRICES,PXPromo.today()),p=data?.periods[ctx.preferred?.id];return `<span class="campaign-option">${p?`${ctx.current?'本檔':'下一檔'} ${p.label} · ${p.campaignType}<br>`+p.promotions.map(p=>`${promoEscape(p.label)} ${p.promotionPrice===null?'—':'$'+PXPromo.money(p.promotionPrice)}｜${p.averageUnitPrice===null?'均價暫無法計算':'均價 $'+PXPromo.money(p.averageUnitPrice)}`).join('<br>'):'未提供檔期售價'}${p?promoComparisonMarkup(product,p.id,true):''}</span>`;}
function renderCampaignSearch(){
 const query=document.getElementById('campaignSearch').value.trim().toLowerCase(),mode=document.getElementById('campaignFilter').value,results=document.getElementById('campaignResults');
 document.getElementById('campaignStatus').textContent=promoStatus();
 const current=PXPromo.context(PX_PROMO_PRICES,PXPromo.today()).current;document.querySelector('#campaignFilter option[value="current"]').textContent=current?'本檔':'下一檔（最近）';
 if(!query){results.innerHTML='<p class="campaign-empty">輸入名稱、關鍵字、品號或條碼，直接查看售價與均價。</p>';if(typeof renderCompetitorSearch==='function')renderCompetitorSearch('',[]);return;}
 const products=PX_PRODUCT_MASTER.filter(p=>productSearchText(p).includes(query));
 results.innerHTML=products.length?'<h2 class="campaign-own-heading">PX 自家商品</h2>'+products.map(p=>`<article class="card campaign-result" data-product-name="${promoEscape(p.name)}"><h2>${promoEscape(p.name)}</h2><div class="campaign-identifiers">品號：${p.code||'尚未建檔'}<br>條碼：${p.barcode||'尚未建檔'}</div>${promoProductMarkup(p,mode)}</article>`).join(''):'<p class="campaign-empty">沒有符合的 PX 商品</p>';
 if(typeof renderCompetitorSearch==='function')renderCompetitorSearch(query,products);
}
document.getElementById('campaignSearch').addEventListener('input',renderCampaignSearch);
document.getElementById('campaignFilter').addEventListener('change',renderCampaignSearch);
renderCampaignSearch();
productBindings.forEach(binding=>{if(binding.selected)renderProductInsights(binding)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderCampaignSearch();productBindings.forEach(binding=>{if(binding.selected)renderProductInsights(binding)})}});
