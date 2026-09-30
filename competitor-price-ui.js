/* Read-only comparison presentation. Retailer/source/PX data are never modified. */
const competitorRuntime={};
let competitorSort='default',competitorSearchQuery='',competitorSearchSelection=null;
const competitorEscape=promoEscape,competitorMoney=CompetitorPrice.money;
function competitorTime(value){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replaceAll('-','/'):'尚未更新';}
function competitorFreshnessLabel(p){
 const f=CompetitorPrice.freshness(p,competitorRuntime[p.competitorProductId]);
 if(['FAILED','STALE','UNSUPPORTED'].includes(f.status))return '資料待更新';
 const day=competitorTime(f.lastSuccessAt).slice(0,10),today=competitorTime(new Date().toISOString()).slice(0,10),yesterday=competitorTime(new Date(Date.now()-86400000).toISOString()).slice(0,10);
 return day===today?'今日更新':day===yesterday?'昨天更新':'資料待更新';
}
function competitorMatches(query,products=[]){
 const q=CompetitorPrice.key(query);if(!q)return [];
 const associated=products.some(p=>COMPETITOR_DATA.categoryMap[p.code]==='CLING_FILM');
 const categoryQuery=['保鮮膜','op保鮮膜','cling_film'].includes(q);
 return COMPETITOR_DATA.records.filter(p=>p.category==='CLING_FILM'&&(associated||categoryQuery||CompetitorPrice.key(p.brand+' '+p.productName).includes(q)));
}
function competitorSorted(records,benchmark=null){return CompetitorComparison.sortCompetitors(records,!benchmark&&competitorSort==='difference'?'default':competitorSort,benchmark);}
function competitorBenchmark(product){
 const ctx=PXPromo.context(PX_PROMO_PRICES,PXPromo.today()),period=ctx.current?promoDataByName.get(product.name)?.periods[ctx.current.id]||null:null;
 // Never silently substitute a future, prior, or cheapest historical campaign.
 // 360尺 (20入) is a carton count; user confirmed PX price is for one roll, 2026-10-01.
 const source={...(PX_SALES[product.name]||{}),pxImperialFeet:true,packQuantity:1};
 return {...CompetitorComparison.getPxBenchmark(product,period,source),scheduledPeriod:ctx.current};
}
function competitorSpec(metrics){return [metrics.widthCm!==null?competitorMoney(metrics.widthCm)+'cm':'',metrics.lengthM!==null?competitorMoney(metrics.lengthM)+'m':''].filter(Boolean).join(' × ')+(metrics.packQuantity>1?' · '+metrics.packQuantity+'入':'');}
function competitorMetric(metrics,preferred=null){
 const metric=preferred||(metrics.pricePerSquareMeter!==null?'AREA':metrics.pricePer10M!==null?'LENGTH':null),field=metric==='AREA'?'pricePerSquareMeter':'pricePer10M';
 return {metric,value:metric?metrics[field]:null,label:metric==='AREA'?'按面積換算':'按長度換算',unit:metric==='AREA'?'㎡':'10m'};
}
function competitorMetricMarkup(metrics,preferred=null){
 const primary=competitorMetric(metrics,preferred);if(primary.value===null)return '<div class="competitor-primary-metric metric-unavailable">規格不足，暫無法換算</div>';
 const secondary=primary.metric==='AREA'&&metrics.pricePer10M!==null?`每10m $${competitorMoney(metrics.pricePer10M)}`:primary.metric==='LENGTH'&&metrics.pricePerSquareMeter!==null?`每㎡ $${competitorMoney(metrics.pricePerSquareMeter)}`:'';
 return `<div class="competitor-primary-metric"><span>${primary.label}</span><b>$${competitorMoney(primary.value)}<small>／${primary.unit}</small></b>${secondary?`<small class="competitor-secondary-metrics">${secondary}</small>`:''}</div>`;
}
function competitorComparisonMarkup(c){
 const reason={PX_PRICE_MISSING:'OP 本檔尚無有效均價',PX_LENGTH_MISSING:'OP 每件規格尚未確認',COMPETITOR_LENGTH_MISSING:'競品長度尚未確認',COMPETITOR_PRICE_MISSING:'競品價格資料不足',UNRELIABLE_SPEC:'規格資料不足',INVALID_VALUE:'資料不足'}[c.reason]||'規格資料不足';
 if(c.direction==='UNAVAILABLE')return `<div class="competitor-comparison-strip unavailable" data-direction="UNAVAILABLE"><span>${reason}</span><small>暫無法計算與 OP 差額</small></div>`;
 const unit=c.metric==='AREA'?'㎡':'10m';
 if(c.direction==='SAME')return `<div class="competitor-comparison-strip same" data-direction="SAME" aria-label="與 OP 相同，每${unit==='㎡'?'平方公尺':'10公尺'} ${competitorMoney(c.competitorValue)} 元"><span>與 OP 相同</span><b>$${competitorMoney(c.competitorValue)}<small>／${unit}</small></b></div>`;
 const higher=c.direction==='HIGHER',text=higher?'競品較 OP 高':'競品較 OP 低',amount=competitorMoney(Math.abs(c.difference)),percentage=(higher?'+':'')+c.percentage.toFixed(2)+'%';
 return `<div class="competitor-comparison-strip ${higher?'higher':'lower'}" data-direction="${c.direction}" aria-label="${text} ${amount} 元每${unit==='㎡'?'平方公尺':'10公尺'}，${percentage}"><span>${higher?'↑':'↓'} ${text}</span><div><b>$${amount}<small>／${unit}</small></b><strong>${percentage}</strong></div></div>`;
}
function competitorBenchmarkMarkup(b){
 const priced=b.effectivePrice!==null,spec=competitorSpec(b),winning=b.winningPromotions.map(p=>`${p.label} $${competitorMoney(p.promotionPrice)}`).join('／');
 const cartonNote=b.productCode==='86210115'?'<p>20入為箱裝數；PX 檔期售價每件為1卷，單件總長度不乘以20。</p>':'';
 const periodText=b.scheduledPeriod?'PX 本檔 '+b.scheduledPeriod.label:'目前無進行中檔期';
 return `<article class="card competitor-benchmark" data-px-benchmark="${competitorEscape(b.productCode)}"><div class="competitor-benchmark-head"><b>我的商品</b><span>OP</span><small>${periodText}</small></div><h3>${competitorEscape(b.productName)}</h3><div class="competitor-benchmark-main"><div class="competitor-benchmark-price"><span>本檔最低均價</span>${priced?`<strong>$${competitorMoney(b.effectivePrice)}<small>／件</small></strong>`:'<b class="benchmark-price-missing">本檔未提供有效均價</b>'}${winning?`<small>${competitorEscape(winning)}</small>`:''}</div>${priced?competitorMetricMarkup(b):''}</div>${spec?`<p class="competitor-spec">${competitorEscape(spec)}</p>`:''}${!b.totalLengthM?'<p class="competitor-benchmark-notice">規格不足，暫無法換算競品差額</p>':''}<details class="competitor-details benchmark-details"><summary>查看商品與促銷資料</summary><div class="competitor-detail-content"><p>規格來源：${competitorEscape(b.sourceText)}</p>${/尺/.test(b.sourceText)?'<p>依使用者確認：尺為英尺，1英尺＝0.3048m；換算保留原精度。</p>':''}${cartonNote}${b.packQuantity===null?'<p>每件卷數尚未確認，未將箱入數當作單件卷數。</p>':''}${b.material?`<p>材質標示：${competitorEscape(b.material)}</p>`:''}${b.promotions.filter(p=>p.promotionPrice!==null).map(p=>`<p>${competitorEscape(p.label)} $${competitorMoney(p.promotionPrice)}${p.averageUnitPrice!==null?'｜均價 $'+competitorMoney(p.averageUnitPrice)+'／件':''}</p>`).join('')}<p>價格基準：僅使用 PX 本檔最低有效均價，不使用成本、手動試算售價或其他檔期。</p></div></details></article>`;
}
function competitorCard(p,benchmark=null){
 const c=benchmark?CompetitorComparison.comparePxToCompetitor(benchmark,p):null,metrics=c?.competitor||CompetitorComparison.getCompetitorMetrics(p),f=CompetitorPrice.freshness(p,competitorRuntime[p.competitorProductId]);
 const spec=competitorSpec(metrics),widthNote=metrics.widthCm===null?'寬度未提供｜按長度換算':c?.metric==='AREA'&&c.specMismatch?'規格不同｜按面積換算':'';
 const sourceUnavailable=/HTTP[_ ](?:404|410)/.test(competitorRuntime[p.competitorProductId]?.reason||'');
 const basis=metrics.priceBasis==='PROMOTION_AVERAGE'?'目前公開促銷均價':'目前公開售價';
 const unitDetails=[['每10m',metrics.pricePer10M],['每㎡',metrics.pricePerSquareMeter],['每卷',metrics.pricePerPiece]].filter(([,v])=>v!==null).map(([label,v])=>`<div><dt>${label}</dt><dd>$${competitorMoney(v)}</dd></div>`).join('');
 return `<article class="card competitor-card" data-competitor-id="${competitorEscape(p.competitorProductId)}"><div class="competitor-product-head"><div><span class="competitor-brand">${competitorEscape(p.brand)}</span><h3>${competitorEscape(p.productName)}</h3></div><span class="competitor-retailer">${competitorEscape(p.retailer)}</span></div><div class="competitor-card-main"><div class="competitor-price"><span>目前公開價格</span><strong>$${competitorMoney(p.currentPrice)}</strong>${spec?`<p class="competitor-spec">${competitorEscape(spec)}</p>`:''}</div>${competitorMetricMarkup(metrics,c?.metric)}</div><div class="competitor-badges">${widthNote?`<span>${widthNote}</span>`:''}${c?.materialMismatch?'<span>材質不同</span>':''}</div>${c?competitorComparisonMarkup(c):''}<div class="competitor-meta" data-source-status="${f.status}">${competitorFreshnessLabel(p)}</div><details class="competitor-details"><summary>查看詳細資料</summary><div class="competitor-detail-content"><p>來源商品：${competitorEscape(p.productName)}</p><p>來源規格：${competitorEscape(p.sourceSpecText||p.specText)}</p><p>完整規格：${competitorEscape(p.specText)}</p><p>換算基準：${basis} $${competitorMoney(metrics.effectivePrice)}${metrics.priceBasis==='PROMOTION_AVERAGE'?'／件':''}</p>${p.material?`<p>材質標示：${competitorEscape(p.material)}</p>`:''}<dl class="competitor-detail-units">${unitDetails}</dl>${p.originalPrice===null?'':`<p>原價 $${competitorMoney(p.originalPrice)}</p>`}${p.promotionText?`<p class="competitor-promotion-text">促銷條件：${competitorEscape(p.promotionText)}</p>`:''}${p.effectiveAverageUnitPrice===null&&p.promotionText?'<p>促銷均價暫無法計算；換算不扣滿額券。</p>':''}<p>庫存：${p.availability==='InStock'?'有貨':p.availability==='OutOfStock'?'缺貨':'來源未提供'}</p><p>最後成功更新：${competitorTime(f.lastSuccessAt)}（台北）</p>${['FAILED','STALE','UNSUPPORTED'].includes(f.status)?`<p>${competitorEscape(f.label)}，保留最後正常價格。</p>`:''}${sourceUnavailable?'<p>來源頁目前無法開啟；保留最後正常價格。</p>':''}<p>單位換算僅比較價格，不表示材質或品質相同。</p>${CompetitorPrice.safeUrl(p.sourceUrl)?`<a class="competitor-source-link" href="${competitorEscape(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看來源 ↗</a>`:''}</div></details></article>`;
}
function competitorSection(records,product=null){
 if(!records.length)return '';
 const benchmark=product?competitorBenchmark(product):null,retailers=[...new Set(records.map(p=>p.retailer))].join('／'),effectiveSort=!benchmark&&competitorSort==='difference'?'default':competitorSort;
 return `<section class="competitor-section" data-comparison-mode="${benchmark?'selected':'market'}"><div class="competitor-heading"><div><h2>${benchmark?'OP vs 競品':'競品比較'}</h2><span>保鮮膜 · ${records.length} 支競品｜${competitorEscape(retailers)}</span></div><label>排序<select data-competitor-sort aria-label="競品排序">${[['default','預設'],['difference','與OP差額'],['per10m','每10m'],['area','每㎡']].map(([value,label])=>`<option value="${value}"${effectiveSort===value?' selected':''}${value==='difference'&&!benchmark?' disabled':''}>${label}</option>`).join('')}</select></label></div><p class="competitor-disclaimer">公開網購價格，門市價格可能不同。</p>${benchmark?competitorBenchmarkMarkup(benchmark):'<p class="competitor-selection-hint">市場競品 · 選擇一支 OP 商品即可比較差額</p>'}${benchmark?'<h3 class="competitor-list-heading">與 OP 比較</h3>':''}${effectiveSort==='difference'?'<p class="competitor-sort-note">面積／長度分組，各組差額由低到高；不可比較資料排最後。</p>':''}<div class="competitor-grid">${competitorSorted(records,benchmark).map(p=>competitorCard(p,benchmark)).join('')}</div></section>`;
}
function renderCompetitorSearch(query,products=[]){
 const q=CompetitorPrice.key(query);if(q!==competitorSearchQuery){competitorSearchSelection=null;competitorSearchQuery=q;}
 const mapped=products.filter(p=>COMPETITOR_DATA.categoryMap[p.code]==='CLING_FILM');
 const selected=mapped.find(p=>p.code===competitorSearchSelection)||(mapped.length===1?mapped[0]:null);
 const matches=competitorMatches(query,products);
 document.getElementById('competitorResults').innerHTML=competitorSection(matches,selected);
 // Generic queries offer an explicit choice; never pick the first PX hit.
 document.querySelectorAll('#campaignResults .campaign-result').forEach(article=>{const p=mapped.find(p=>p.name===article.dataset.productName);if(!p||article.querySelector('[data-px-compare]'))return;const button=document.createElement('button');button.type='button';button.className='competitor-use-benchmark';button.dataset.pxCompare=p.code;button.textContent=selected?.code===p.code?'目前比較基準':'與競品比較';article.appendChild(button);});
}
function competitorInfoMarkup(product){return COMPETITOR_DATA.categoryMap[product.code]==='CLING_FILM'?competitorSection(COMPETITOR_DATA.records.filter(p=>p.category==='CLING_FILM'),product):'';}
function refreshCompetitors(){renderCampaignSearch();productBindings.forEach(binding=>{if(binding.selected)renderProductInsights(binding)});}
document.addEventListener('change',event=>{if(event.target.matches('[data-competitor-sort]')){competitorSort=event.target.value;refreshCompetitors();}});
document.addEventListener('click',event=>{const button=event.target.closest('[data-px-compare]');if(button){competitorSearchSelection=button.dataset.pxCompare;refreshCompetitors();document.getElementById('competitorResults').scrollIntoView({behavior:'smooth',block:'start'});}});
// Same-origin runtime only; existing scraper/history/freshness remain unchanged.
fetch('competitor-runtime.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(runtime=>{if(runtime&&typeof runtime==='object'&&!Array.isArray(runtime)){for(const p of COMPETITOR_DATA.records){const row=runtime[p.competitorProductId];if(row&&['FRESH','STALE','FAILED','MANUAL','UNSUPPORTED'].includes(row.sourceStatus)&&Number.isFinite(Date.parse(row.lastSuccessAt)))competitorRuntime[p.competitorProductId]=row;}}refreshCompetitors();}).catch(()=>refreshCompetitors());
refreshCompetitors();
