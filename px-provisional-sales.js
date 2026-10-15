/* Read-only reference view. Never writes PX_SALES_DATA or PX_SALES_PERIODS. */
(function(){
'use strict';
const d=window.PX_PROVISIONAL_SALES;if(!d)return;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('zh-TW')+' 支':'無資料';
function mount(flow){
 if(flow.querySelector('.px-provisional'))return;
 const panel=document.createElement('details');panel.className='px-provisional';
 panel.innerHTML='<summary>2026/09 待確認銷量｜月份完整性待確認</summary><p>獨立參考檢視，不納入正式 YTD、近 3／6 月、同期成長、雷達或排名。銷額：無資料。</p>';
 if(window.PX_SALES_PERIODS.includes(d.period)){panel.insertAdjacentHTML('beforeend','<p>本月已有正式資料；暫定參考已停用，避免重複計算。</p>');flow.append(panel);return}
 panel.insertAdjacentHTML('beforeend','<p>來源有效銷量加總：'+num(d.totalQuantity)+'；53 筆有值、5 筆空白。月份由使用者暫定，非已核實完整月。</p><label>參考商品（可多選，最多 5 支）<select multiple size="4" aria-label="待確認銷量參考商品">'+d.rows.filter(r=>r.productName).map(r=>'<option value="'+esc(r.productName)+'">'+esc(r.productName)+'</option>').join('')+'</select></label><div class="px-provisional-grid"></div><details><summary>來源與空白紀錄</summary><p>'+esc(d.sourceFile)+'｜'+esc(d.period)+'（暫定）</p><p>以下原始空白未補 0：'+d.rows.filter(r=>r.quantity===null).map(r=>esc(r.sourceName)).join('、')+'</p></details>');
 const select=panel.querySelector('select'),grid=panel.querySelector('.px-provisional-grid');
 function render(){
 const selected=[...select.selectedOptions];if(selected.length>5){selected.slice(5).forEach(o=>o.selected=false)}
 grid.innerHTML=[...select.selectedOptions].map(o=>{
 const row=d.rows.find(r=>r.productName===o.value),series=(window.PX_SALES_DATA[o.value]?.sales||[]).slice(-5),values=[...series,row.quantity],max=Math.max(1,...values.filter(v=>typeof v==='number')),point=(v,i)=>[12+i*53,112-v/max*90];
 let lines='';values.forEach((v,i)=>{if(i&&typeof v==='number'&&typeof values[i-1]==='number'){const a=point(values[i-1],i-1),b=point(v,i);lines+='<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="'+(i===values.length-1?'#9d6c20':'#315b78')+'" stroke-width="2" '+(i===values.length-1?'stroke-dasharray="5 4"':'')+'/>'}});
 return '<article><h4>'+esc(o.value)+'</h4><p>2026/09 待確認銷量</p><strong>'+num(row.quantity)+'</strong><p>銷額：無資料</p><svg viewBox="0 0 300 140" role="img" aria-label="最近正式月份與九月暫定銷量參考趨勢">'+lines+'<text x="12" y="135" font-size="12">正式月份</text><text x="210" y="135" font-size="12">9月待確認</text></svg><p>虛線僅為暫定參考，不作成長率判讀。</p></article>';
 }).join('');
 }
 select.addEventListener('change',render);
 const binding=typeof productBindings!=='undefined'?productBindings.find(b=>document.getElementById(b.salesId)?.contains(flow)):null;
 const initial=binding?.selected?.name||d.rows.find(r=>r.productName)?.productName;
 for(const o of select.options)o.selected=o.value===initial;
 render();flow.querySelector('.sales24-freshness')?.after(panel);
}
function scan(){document.querySelectorAll('.sales2-flow').forEach(mount)}
new MutationObserver(scan).observe(document.querySelector('.app'),{childList:true,subtree:true});scan();
})();
