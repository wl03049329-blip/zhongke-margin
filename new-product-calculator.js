/* PX-only, transient calculator drafts. Never reads RSP metadata or writes product masters.
 * Consumer RSP is tax-inclusive; product cost and PX purchase price are tax-exclusive.
 * Both directions delegate all company calculations to the unchanged official model().
 */
(()=>{
 'use strict';
 const panel=$('calc'),binding=productBindings[0],picker=$('cProduct').closest('.full'),front=$('cPx').parentElement,costNote=panel.querySelector('.cost-override-note');
 const officialCalculate=calcC,officialSelect=selectProduct,officialCopy=buildCalcResultText,officialSave=save;
 const ids=['cProduct','cPrice','cCost','cFee'],draftIds=['cNewName','cNewBarcode','cNewPXMargin','cNewCompanyMargin','cNewCompareA','cNewCompareB','cNewCompareC'];
 const priceField=$('cPrice').closest('.wrap').parentElement,priceLabel=priceField.querySelector('label'),originalPriceLabel=priceLabel.textContent;
 const feeField=$('cFee').closest('.wrap').parentElement,feeLabel=feeField.querySelector('label'),originalFeeLabel=feeLabel.textContent;
 let active=false,snapshot=null,result=null,direction='A';
 const entry=document.createElement('button');entry.type='button';entry.id='developNewProduct';entry.className='new-product-entry';entry.textContent='＋ 開發新品';
 const pickerRow=document.createElement('div');pickerRow.className='new-product-picker-row';const productPicker=picker.querySelector('.product-picker');productPicker.before(pickerRow);pickerRow.append(productPicker,entry);
 const mode=document.createElement('div');mode.id='newProductMode';mode.className='new-product-mode';mode.hidden=true;
 mode.innerHTML='<div><b>PX 新品開發試算</b><small>未套用既有商品資料</small></div><button type="button" class="new-product-return">選擇既有商品</button>';
 panel.querySelector('.grid').before(mode);
 const modes=document.createElement('div');modes.className='new-channel-switch';modes.hidden=true;modes.setAttribute('role','group');modes.setAttribute('aria-label','PX 新品計算模式');
 modes.innerHTML='<button type="button" data-new-mode="A" aria-pressed="true">A 指定售價<br><small>反算公司毛利率</small></button><button type="button" data-new-mode="B" aria-pressed="false">B 公司目標毛利率<br><small>回推 PX 建議售價</small></button>';mode.after(modes);
 const help=document.createElement('p');help.className='new-px-help';help.hidden=true;modes.after(help);
 const fields=document.createElement('div');fields.className='new-product-fields';fields.hidden=true;
 fields.innerHTML='<div><label for="cNewName">商品名稱（選填）</label><input id="cNewName" type="text" autocomplete="off" placeholder="自行輸入新品名稱"></div><div><label for="cNewBarcode">商品條碼（選填）</label><input id="cNewBarcode" type="text" inputmode="numeric" autocomplete="off" placeholder="未填寫"></div>';picker.after(fields);
 const pxTarget=document.createElement('div');pxTarget.hidden=true;pxTarget.className='new-px-target';
 pxTarget.innerHTML='<label for="cNewPXMargin">全聯毛利率（前毛）</label><div class="wrap"><input id="cNewPXMargin" type="number" inputmode="decimal" min="0" max="100" step="any"><span class="unit">%</span></div><div class="new-px-quick" role="group" aria-label="全聯前毛快捷值">'+[25.68,26.18,26.68].map(value=>`<button type="button" data-new-px-target="${value}" aria-pressed="false">${value}%</button>`).join('')+'</div>';feeField.before(pxTarget);
 const companyTarget=document.createElement('div');companyTarget.hidden=true;companyTarget.className='new-px-target';
 companyTarget.innerHTML='<label for="cNewCompanyMargin">公司目標毛利率 <small id="cNewTargetHint"></small></label><div class="wrap"><input id="cNewCompanyMargin" type="number" inputmode="decimal" min="0" max="100" step="any"><span class="unit">%</span></div><div class="new-px-quick" role="group" aria-label="公司目標毛利率快捷值">'+[33,35,37,38,40,45,50].map(value=>`<button type="button" data-new-company-target="${value}" aria-pressed="false">${value}%</button>`).join('')+'</div>';feeField.before(companyTarget);
 const empty=document.createElement('div');empty.id='cNewEmpty';empty.className='new-product-empty';empty.hidden=true;empty.setAttribute('role','status');empty.innerHTML='<b>尚未計算</b><p></p>';$('cResult').before(empty);
 const feeNote=document.createElement('small');feeNote.className='fixed-note';feeNote.textContent='未稅成本；公司費用以 PX 未稅進價計算，費用率須自行填寫。';feeNote.hidden=true;feeField.append(feeNote);
 const copyActions=$('cResult').querySelector('.copy-actions'),pxResult=document.createElement('section');pxResult.id='cNewPXResult';pxResult.className='card new-px-result';pxResult.hidden=true;
 pxResult.innerHTML='<div class="new-px-result-head"><h3>全聯新品試算</h3><span id="cNewPXStatus" class="new-target-status" role="status"></span></div><div class="new-px-offer"><span id="cNewPXHeroLabel"></span><strong id="cNewPXOffer"></strong></div><div class="new-px-company"><div><span>消費者售價 RSP（含稅）</span><b id="cNewPXRetail"></b></div><div><span>PX 進價／公司出貨價（未稅）</span><b id="cNewPXPurchase"></b></div><div><span>中科毛利率（費用後）</span><b id="cNewPXCompanyMargin"></b></div><div><span>與公司目標差距</span><b id="cNewPXGap"></b></div><div><span>全聯毛利率（前毛）</span><b id="cNewPXTarget"></b></div><div><span>全聯前毛額（未稅）</span><b id="cNewPXFrontProfit"></b></div><div><span>商品成本（未稅）</span><b id="cNewPXCost"></b></div><div><span>公司費用</span><b id="cNewPXFee"></b></div><div><span>中科毛利額</span><b id="cNewPXProfit"></b></div><div><span>公司目標毛利率</span><b id="cNewPXGoal"></b></div></div><p id="cNewPXFeeNote" class="new-px-fee-note"></p>';$('cResult').before(pxResult);
 const comparison=document.createElement('section');comparison.id='cNewComparison';comparison.className='card new-rsp-comparison';comparison.hidden=true;
 comparison.innerHTML='<h3>三組 RSP 毛利比較</h3><p>共用上方成本、全聯前毛、公司費用率與公司目標；不改寫主試算。</p><div class="new-rsp-grid">'+['A','B','C'].map(key=>`<div class="new-rsp-card"><label for="cNewCompare${key}">RSP ${key}（含稅）</label><div class="wrap"><input id="cNewCompare${key}" type="number" min="0" step="any" inputmode="decimal"><span class="unit">元</span></div><div id="cNewCompareResult${key}" class="new-rsp-output" aria-live="polite"></div></div>`).join('')+'</div>';$('cDetail').after(comparison);
 function read(id){const raw=$(id).value.trim();return raw!==''&&Number.isFinite(Number(raw))?Number(raw):null}
 function inputs(){return {cost:read('cCost'),front:read('cNewPXMargin'),target:read('cNewCompanyMargin'),fee:read('cFee')}}
 // Only the inverse price transformation is new; no second company margin engine.
 function compute(input,mode,price){
  const {cost,front,target,fee}=input;
  if([cost,front,fee,mode==='B'?target:price].some(value=>value===null))return {result:null,error:''};
  if(cost<0||front<0||front>=100||fee<0||fee>100)return {result:null,error:'成本不可為負數；全聯前毛須介於 0%（含）與 100%（不含），公司費用率須介於 0% 與 100%。'};
  if(mode==='B'){
   if(target<0||fee+target>=100)return {result:null,error:'公司目標不可為負數，且公司費用率＋公司目標毛利率必須低於 100%。'};
   if(cost===0)return {result:null,error:'零成本無法以此目標唯一反推正售價，請改用指定售價模式。'};
   price=cost/(1-fee/100-target/100)/(1-front/100)*1.05;
  }
  if(!(price>0))return {result:null,error:'消費者售價 RSP 必須大於 0。'};
  const output=model(price,cost,front/100,fee/100);
  return Object.values(output).every(Number.isFinite)&&output.ship>0?{result:output,error:''}:{result:null,error:'數值超出可計算範圍，請調整輸入。'};
 }
 function targetState(output,target){
  const valid=target!==null&&target>=0&&target<100;
  const gap=valid?Number((output.margin*100-target).toFixed(10)):null;
  // Suppress binary noise at zero only for presentation, never round the model result.
  const loss=Number(output.margin.toFixed(12))<0;
  return {gap,label:loss?'虧損':!valid?'未設定有效公司目標':gap>=0?'達到公司目標':'未達公司目標',tone:loss?'loss':!valid?'neutral':gap>=0?'met':'below'};
 }
 function gapText(gap){return gap===null?'尚未設定有效目標':gap===0?'持平':`${gap>0?'+':''}${gap.toFixed(2)} 個百分點`}
 function displayMode(enabled){
  mode.hidden=fields.hidden=modes.hidden=help.hidden=pxTarget.hidden=companyTarget.hidden=feeNote.hidden=comparison.hidden=!enabled;
  picker.hidden=front.hidden=costNote.hidden=enabled;panel.dataset.calculatorMode=enabled?'new':'existing';
  // Draft status compares to the explicit company target, not unrelated global badge thresholds.
  $('thresholdSettings').hidden=enabled;
  priceField.hidden=enabled&&direction==='B';priceLabel.textContent=enabled?'消費者售價 RSP（含稅）':originalPriceLabel;feeLabel.textContent=enabled?'公司費用率':originalFeeLabel;
  $('cNewTargetHint').textContent=direction==='A'?'（選填，比較用）':'（必填）';
  help.textContent=direction==='A'?'指定全聯架上售價，依前毛條件計算公司毛利。RSP 僅為本次手動試算價格。':'依成本、全聯前毛與公司目標毛利反推售價；不覆寫模式 A 的售價。';
  modes.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.newMode===direction)));
  (enabled?pxResult:$('cResult')).append(copyActions);
  if(!enabled)pxResult.hidden=true;
 }
 function syncTargets(){for(const [container,id,key] of [[pxTarget,'cNewPXMargin','newPxTarget'],[companyTarget,'cNewCompanyMargin','newCompanyTarget']]){const value=read(id);container.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(value!==null&&value===Number(button.dataset[key]))))}}
 function renderComparison(input){
  for(const key of ['A','B','C']){
   const node=$('cNewCompareResult'+key),out=compute(input,'A',read('cNewCompare'+key));
   if(!out.result){node.textContent=out.error||'尚未計算';continue}
   const value=out.result,state=targetState(value,input.target);
   node.innerHTML=`<strong>${pc(value.margin)}</strong><span>中科毛利率（費用後）</span><b class="new-target-status" data-tone="${state.tone}">${state.label}</b><span>與目標：${gapText(state.gap)}</span><span>PX 進價 $${m2(value.ship)}</span><span>中科毛利額 $${m2(value.profit)}</span>`;
  }
 }
 function calculate(){
  if(!active){officialCalculate();return}
  const input=inputs(),out=compute(input,direction,read('cPrice'));result=out.result;
  $('cResult').hidden=true;$('cDetail').hidden=!result;pxResult.hidden=!result;empty.hidden=!!result;syncTargets();renderComparison(input);
  empty.querySelector('b').textContent=out.error?'條件無法成立':'尚未計算';
  empty.querySelector('p').textContent=out.error||(direction==='A'?'請輸入 RSP、未稅成本、全聯前毛與公司費用率。':'請輸入未稅成本、全聯前毛、公司目標毛利率與公司費用率。');
  if(!result){$('cPx').value='';$('cRows').replaceChildren();$('cMargin').textContent=$('cProfit').textContent='—';$('cStatus').textContent='';$('cDetail').open=false;pxResult.querySelectorAll('b,strong').forEach(node=>node.textContent='');$('cNewPXStatus').textContent='';$('cNewPXFeeNote').textContent='';save();return}
  $('cPx').value=String(input.front);$('cRows').innerHTML=rows(result);$('cMargin').textContent=pc(result.margin);$('cProfit').textContent=m2(result.profit)+' 元';
  styleResult($('cResult'),Number(result.margin.toFixed(12)),'cStatus');
  const state=targetState(result,input.target);
  $('cNewPXStatus').textContent=state.label;$('cNewPXStatus').dataset.tone=state.tone;
  $('cNewPXHeroLabel').textContent=direction==='A'?'中科毛利率（費用後）':'PX 建議架售價（含稅）';
  $('cNewPXOffer').textContent=direction==='A'?pc(result.margin):'$'+m2(result.price);
  const text={cNewPXRetail:'$'+m2(result.price),cNewPXPurchase:'$'+m2(result.ship),cNewPXTarget:input.front.toFixed(2)+'%',cNewPXFrontProfit:'$'+m2(result.untaxed-result.ship),cNewPXCost:'$'+m2(input.cost),cNewPXFee:'$'+m2(result.feeAmt),cNewPXProfit:'$'+m2(result.profit),cNewPXCompanyMargin:pc(result.margin),cNewPXGap:gapText(state.gap),cNewPXGoal:state.gap===null?'尚未設定有效目標':input.target.toFixed(2)+'%'};
  Object.entries(text).forEach(([id,value])=>$(id).textContent=value);
  $('cNewPXFeeNote').textContent=`全聯前毛 ${input.front}% 為輸入條件｜公司費用率 ${input.fee}%｜${direction==='B'?'理論回推結果，未做零售定價取整':'RSP 調整會更新進價、前毛額及公司毛利'}`;save();
 }
 function enter(){
  if(!active)snapshot={values:Object.fromEntries(ids.map(id=>[id,$(id).value])),product:binding.selected||null};
  active=true;direction='A';binding.selected=null;closeProductOptions(binding);[...ids,...draftIds].forEach(id=>$(id).value='');
  syncFixedFrontMargin(binding,null);$('cPx').value='';$('cPx').textContent='';updateProductCostNote(binding);renderProductInsights(binding);$('copyFeedback').textContent='';displayMode(true);calculate();$('cNewName').focus();
 }
 function leave(){
  if(!active)return;
  active=false;result=null;direction='A';displayMode(false);empty.hidden=true;$('cResult').hidden=false;$('cDetail').hidden=false;
  draftIds.forEach(id=>$(id).value='');ids.forEach(id=>$(id).value=snapshot?.values[id]??'');binding.selected=snapshot?.product||null;
  syncFixedFrontMargin(binding,binding.selected);updateProductCostNote(binding);renderProductInsights(binding);$('copyFeedback').textContent='';officialCalculate();snapshot=null;
 }
 calcC=calculate;binding.calculate=calculate;
 selectProduct=function(target,product){if(target===binding&&active)leave();officialSelect(target,product)};
 buildCalcResultText=function(){
  if(!active)return officialCopy();
  if(!result)return 'PX 新品開發試算\n尚未計算\n請輸入新品試算資料。';
  return ['【PX 新品開發試算】',direction==='A'?'模式 A｜指定售價 → 公司毛利率':'模式 B｜公司目標 → PX 建議架售價',$('cNewName').value.trim()||'未命名新品',`條碼：${$('cNewBarcode').value.trim()||'未填寫'}`,...['cNewPXRetail','cNewPXPurchase','cNewPXCompanyMargin','cNewPXGap','cNewPXGoal','cNewPXTarget','cNewPXFrontProfit','cNewPXCost','cNewPXFee','cNewPXProfit'].map(id=>`${$(id).previousElementSibling.textContent}：${$(id).textContent}`),$('cNewPXStatus').textContent,$('cNewPXFeeNote').textContent].join('\n');
 };
 save=function(){
  if(!active){officialSave();return}
  // Keep only the original existing-product snapshot in persistence. Drafts never persist.
  try{localStorage.setItem('opMarginV3',JSON.stringify(Object.fromEntries(storeIds.map(id=>[id,ids.includes(id)?snapshot.values[id]:$(id).value]))))}catch(error){}
 };
 panel.addEventListener('input',event=>{
  if(!active||![...ids,...draftIds].includes(event.target.id))return;
  event.stopImmediatePropagation();$('copyFeedback').textContent='';calculate();
 },true);
 modes.addEventListener('click',event=>{
  const button=event.target.closest('[data-new-mode]');if(!button||!active||button.dataset.newMode===direction)return;
  direction=button.dataset.newMode;$('copyFeedback').textContent='';displayMode(true);calculate();
 });
 for(const [container,selector,id,key] of [[pxTarget,'[data-new-px-target]','cNewPXMargin','newPxTarget'],[companyTarget,'[data-new-company-target]','cNewCompanyMargin','newCompanyTarget']])container.addEventListener('click',event=>{const button=event.target.closest(selector);if(button){$(id).value=button.dataset[key];$('copyFeedback').textContent='';calculate()}});
 panel.addEventListener('click',event=>{
  if(active&&event.target.closest('#clearCalculation')){event.stopImmediatePropagation();$(direction==='B'?'cNewCompanyMargin':'cPrice').value='';calculate();$('copyFeedback').textContent='已清除目前模式的主輸入，其他新品試算資料已保留'}
 },true);
 entry.addEventListener('click',enter);mode.querySelector('button').addEventListener('click',()=>{leave();$('cProduct').focus()});displayMode(false);
})();
