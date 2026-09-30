/* Read-only competitor presentation. No retailer requests and no PX data writes. */
const competitorRuntime={};
let competitorSort='default';
const competitorEscape=promoEscape;
function competitorTime(value){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replaceAll('-','/'):'尚未更新';}
function competitorMatches(query,products=[]){
 const q=CompetitorPrice.key(query);if(!q)return [];
 const associated=products.some(p=>COMPETITOR_DATA.categoryMap[p.code]==='CLING_FILM');
 const categoryQuery=['保鮮膜','op保鮮膜','cling_film'].includes(q);
 return COMPETITOR_DATA.records.filter(p=>p.category==='CLING_FILM'&&(associated||categoryQuery||CompetitorPrice.key(p.brand+' '+p.productName).includes(q)));
}
function competitorSorted(records){
 const defaultOrder=(a,b)=>a.retailer.localeCompare(b.retailer,'zh-Hant')||a.brand.localeCompare(b.brand,'zh-Hant')||a.productName.localeCompare(b.productName,'zh-Hant');
 const field=competitorSort==='per10m'?'pricePer10M':competitorSort==='area'?'pricePerSquareMeter':null;
 return [...records].sort((a,b)=>field?(a[field]===null)-(b[field]===null)||(a[field]??0)-(b[field]??0)||defaultOrder(a,b):defaultOrder(a,b));
}
function competitorCard(p){
 const f=CompetitorPrice.freshness(p,competitorRuntime[p.competitorProductId]);
 const spec=[p.widthCm===null?'寬度未提供':`${CompetitorPrice.money(p.widthCm)}cm`,p.lengthM===null?'長度未提供':`${CompetitorPrice.money(p.lengthM)}m`,p.packQuantity===null?'入數未提供':`${p.packQuantity}入`].join(' × ');
 const unit=(value,suffix)=>value===null?'暫無法計算':'$'+CompetitorPrice.money(value)+suffix;
 const unavailable=/HTTP[_ ](?:404|410)/.test(competitorRuntime[p.competitorProductId]?.reason||'')?'來源頁目前無法開啟；保留最後正常價格。':'';
 return `<article class="card competitor-card" data-competitor-id="${competitorEscape(p.competitorProductId)}"><div class="competitor-brand">${competitorEscape(p.brand)}${p.material?`<span class="competitor-material">${competitorEscape(p.material)}</span>`:''}</div><h3>${competitorEscape(p.productName)}</h3><div class="competitor-price"><span>目前公開價格</span><strong>$${CompetitorPrice.money(p.currentPrice)}</strong>${p.originalPrice===null?'':`<small>原價 $${CompetitorPrice.money(p.originalPrice)}</small>`}</div><p class="competitor-spec">${competitorEscape(spec)}</p><details class="competitor-source-spec"><summary>來源規格原文</summary><p>${competitorEscape(p.sourceSpecText||p.specText)}</p></details><div class="competitor-units"><div><span>每10m</span><b>${unit(p.pricePer10M,'')}</b></div><div><span>每㎡</span><b>${unit(p.pricePerSquareMeter,'')}</b></div><div><span>每卷</span><b>${unit(p.pricePerPiece,'')}</b></div></div><div class="competitor-retailer">通路：${competitorEscape(p.retailer)} · ${p.availability==='InStock'?'有貨':p.availability==='OutOfStock'?'缺貨':'庫存未提供'}</div>${p.promotionText?`<details class="competitor-promotion"><summary>來源促銷與條件</summary><p>${competitorEscape(p.promotionText)}</p><small>${p.effectiveAverageUnitPrice===null?'促銷均價暫無法計算；上述換算依目前公開價格，不扣滿額券。':'促銷均價 $'+CompetitorPrice.money(p.effectiveAverageUnitPrice)+'／件'}</small></details>`:''}<div class="competitor-freshness" data-source-status="${f.status}"><span>${competitorEscape(f.label)}</span><small>最後成功更新：${competitorTime(f.lastSuccessAt)}（台北）</small>${unavailable?`<small>${unavailable}</small>`:''}</div>${CompetitorPrice.safeUrl(p.sourceUrl)?`<a class="competitor-source-link" href="${competitorEscape(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看來源 ↗</a>`:''}</article>`;
}
function competitorSection(records){
 if(!records.length)return '';
 return `<section class="competitor-section"><div class="competitor-heading"><h2>競品價格</h2><label>排序<select data-competitor-sort aria-label="競品排序">${[['default','預設'],['per10m','每10m'],['area','每㎡']].map(([value,label])=>`<option value="${value}"${competitorSort===value?' selected':''}>${label}</option>`).join('')}</select></label></div><p class="competitor-disclaimer">保鮮膜 · 公開網購價格，不代表門市同步價格。規格與優惠條件請以來源頁為準。</p><div class="competitor-grid">${competitorSorted(records).map(competitorCard).join('')}</div></section>`;
}
function renderCompetitorSearch(query,products=[]){document.getElementById('competitorResults').innerHTML=competitorSection(competitorMatches(query,products));}
function competitorInfoMarkup(product){return COMPETITOR_DATA.categoryMap[product.code]==='CLING_FILM'?competitorSection(COMPETITOR_DATA.records.filter(p=>p.category==='CLING_FILM')):'';}
function refreshCompetitors(){renderCampaignSearch();productBindings.forEach(binding=>{if(binding.selected)renderProductInsights(binding)});}
document.addEventListener('change',event=>{if(event.target.matches('[data-competitor-sort]')){competitorSort=event.target.value;refreshCompetitors();}});
// Same-origin static runtime only; the browser never fetches a retailer.
fetch('competitor-runtime.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(runtime=>{if(runtime&&typeof runtime==='object'&&!Array.isArray(runtime)){for(const p of COMPETITOR_DATA.records){const row=runtime[p.competitorProductId];if(row&&['FRESH','STALE','FAILED','MANUAL','UNSUPPORTED'].includes(row.sourceStatus)&&Number.isFinite(Date.parse(row.lastSuccessAt)))competitorRuntime[p.competitorProductId]=row;}}refreshCompetitors();}).catch(()=>refreshCompetitors());
refreshCompetitors();
