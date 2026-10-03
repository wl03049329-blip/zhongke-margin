/* Calculator-only draft mode. The official model(), calcC() and thresholds stay unchanged. */
(()=>{
 'use strict';
 const panel=$('calc'),binding=productBindings[0],picker=$('cProduct').closest('.full'),front=$('cPx').parentElement,costNote=panel.querySelector('.cost-override-note');
 const officialCalculate=calcC,officialSelect=selectProduct,officialCopy=buildCalcResultText,officialSave=save;
 const ids=['cProduct','cPrice','cCost','cFee'];
 let active=false,snapshot=null,result=null,channel='general',drafts={};
 const entry=document.createElement('button');entry.type='button';entry.id='developNewProduct';entry.className='new-product-entry';entry.textContent='＋ 開發新品';
 const pickerRow=document.createElement('div');pickerRow.className='new-product-picker-row';const productPicker=picker.querySelector('.product-picker');productPicker.before(pickerRow);pickerRow.append(productPicker,entry);
 const mode=document.createElement('div');mode.id='newProductMode';mode.className='new-product-mode';mode.hidden=true;
 mode.innerHTML='<div><b>新品開發試算</b><small>未套用既有商品資料</small></div><button type="button" class="new-product-return">選擇既有商品</button>';
 panel.querySelector('.grid').before(mode);
 const channels=document.createElement('div');channels.className='new-channel-switch';channels.hidden=true;channels.setAttribute('role','group');channels.setAttribute('aria-label','新品試算通路');
 channels.innerHTML='<button type="button" data-new-channel="general" aria-pressed="true">一般通路</button><button type="button" data-new-channel="px" aria-pressed="false">全聯 PX</button>';
 mode.after(channels);
 const pxHelp=document.createElement('p');pxHelp.className='new-px-help';pxHelp.hidden=true;pxHelp.textContent='依商品成本、全聯前毛與公司目標毛利，自動反推建議架售價。';channels.after(pxHelp);
 const fields=document.createElement('div');fields.className='new-product-fields';fields.hidden=true;
 fields.innerHTML='<div class="full"><label for="cNewName">商品名稱（選填）</label><input id="cNewName" type="text" autocomplete="off" placeholder="自行輸入新品名稱"></div><div><label for="cNewBarcode">商品條碼（選填）</label><input id="cNewBarcode" type="text" inputmode="numeric" autocomplete="off" placeholder="未填寫"></div><div><label for="cNewPurchase">PX 進價（未稅）</label><div class="wrap"><input id="cNewPurchase" type="number" inputmode="decimal" step="any" min="0"><span class="unit">元</span></div></div>';
 picker.after(fields);
 const pxTarget=document.createElement('div');pxTarget.hidden=true;pxTarget.className='new-px-target';
 pxTarget.innerHTML='<label for="cNewPXMargin">全聯毛利率（前毛）</label><div class="wrap"><input id="cNewPXMargin" type="number" inputmode="decimal" min="0" max="100" step="any"><span class="unit">%</span></div>';
 const feeField=$('cFee').closest('.wrap').parentElement,feeLabel=feeField.querySelector('label'),generalFeeLabel=feeLabel.textContent;feeField.before(pxTarget);
 const quick=document.createElement('div');quick.className='new-px-quick';quick.hidden=true;quick.setAttribute('role','group');quick.setAttribute('aria-label','目標全聯毛利率快捷值');
 quick.innerHTML=[33,35,37,38,40,45,50].map(value=>`<button type="button" data-new-px-target="${value}" aria-pressed="false">${value}%</button>`).join('');pxTarget.append(quick);
 const companyTarget=document.createElement('div');companyTarget.hidden=true;companyTarget.className='new-px-target';companyTarget.innerHTML='<label for="cNewCompanyMargin">公司目標毛利率</label><div class="wrap"><input id="cNewCompanyMargin" type="number" inputmode="decimal" min="0" max="100" step="any"><span class="unit">%</span></div><div class="new-px-quick" role="group" aria-label="公司目標毛利率快捷值">'+[33,35,37,38,40,45,50].map(value=>`<button type="button" data-new-company-target="${value}" aria-pressed="false">${value}%</button>`).join('')+'</div>';feeField.before(companyTarget);
 const empty=document.createElement('div');empty.id='cNewEmpty';empty.className='new-product-empty';empty.hidden=true;empty.setAttribute('role','status');empty.innerHTML='<b>尚未計算</b><p>請輸入新品試算資料。</p>';$('cResult').before(empty);
 const feeNote=document.createElement('small');feeNote.className='fixed-note';feeNote.textContent='公司費用依 PX 進價 × 公司費用率計算';feeNote.hidden=true;$('cFee').closest('div.wrap').after(feeNote);
 const copyActions=$('cResult').querySelector('.copy-actions'),pxResult=document.createElement('section');pxResult.id='cNewPXResult';pxResult.className='card new-px-result';pxResult.hidden=true;
 pxResult.innerHTML='<div class="new-px-result-head"><h3>全聯新品試算</h3><span id="cNewPXStatus" class="margin-status"></span></div><div class="new-px-terms"><div><span>售價（含稅）</span><b id="cNewPXRetail"></b></div><div><span>全聯目標毛利率</span><b id="cNewPXTarget"></b></div></div><div class="new-px-offer"><span>PX 建議進價（未稅）</span><strong id="cNewPXOffer"></strong></div><div class="new-px-company"><div><span>商品成本</span><b id="cNewPXCost"></b></div><div><span>公司費用</span><b id="cNewPXFee"></b></div><div><span>中科毛利額</span><b id="cNewPXProfit"></b></div><div><span>中科毛利率（費用後）</span><b id="cNewPXCompanyMargin"></b></div></div><p id="cNewPXFeeNote" class="new-px-fee-note"></p>';$('cResult').before(pxResult);
 function read(id){const raw=$(id).value.trim();return raw!==''&&Number.isFinite(Number(raw))?Number(raw):null}
 pxResult.querySelector('.new-px-offer span').textContent='建議架售價（含稅）';
 pxResult.querySelector('.new-px-terms span').textContent='PX 未稅進價';
 $('cNewPXTarget').previousElementSibling.textContent='全聯毛利率（前毛）';
 function displayMode(enabled){
  const px=enabled&&channel==='px';mode.hidden=!enabled;fields.hidden=!enabled;picker.hidden=enabled;front.hidden=enabled;costNote.hidden=enabled;feeNote.hidden=!enabled;panel.dataset.calculatorMode=enabled?'new':'existing';
  channels.hidden=!enabled;pxHelp.hidden=!px;pxTarget.hidden=!px;quick.hidden=!px;companyTarget.hidden=!px;$('cPrice').closest('div.wrap').parentElement.hidden=px;$('cNewPurchase').closest('div.wrap').parentElement.hidden=px;
  mode.querySelector('small').textContent=px?'全聯新品開發':'未套用既有商品資料';feeLabel.textContent=px?'公司費用率':generalFeeLabel;
  feeNote.textContent=px?'未填費用率時，未計公司費用':'公司費用依 PX 進價 × 公司費用率計算';
  channels.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.newChannel===channel)));
  (px?pxResult:$('cResult')).append(copyActions);pxResult.hidden=true;
 }
 function syncPXTargets(){for(const [container,id,key] of [[quick,'cNewPXMargin','newPxTarget'],[companyTarget,'cNewCompanyMargin','newCompanyTarget']]){const value=read(id);container.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(value!==null&&value===Number(button.dataset[key]))))}}
 function calculatePX(){
  const cost=read('cCost'),target=read('cNewPXMargin'),company=read('cNewCompanyMargin'),fee=read('cFee');
  feeNote.textContent='公司費用依 PX 進價 × 公司費用率計算';
  const complete=[cost,target,company,fee].every(value=>value!==null);
  const invalid=complete&&(cost<=0||target<0||target>=100||company<0||fee<0||fee+company>=100);
  empty.querySelector('b').textContent=invalid?'條件無法成立':'尚未計算';
  empty.querySelector('p').textContent=invalid?(fee+company>=100?'公司費用率＋公司目標毛利率必須低於 100%。':'成本必須大於 0，全聯前毛須介於 0%（含）與 100%（不含），公司條件不可為負數。'):'請輸入成本、全聯前毛及公司毛利條件。';
  // Invert the existing definitions without rounding, then verify company results with model().
  const purchase=complete&&!invalid?cost/(1-fee/100-company/100):null;
  const price=purchase!==null?purchase/(1-target/100)*1.05:null;
  result=price!==null&&Number.isFinite(price)?model(price,cost,target/100,fee/100):null;
  const usable=!!result&&Object.values(result).every(Number.isFinite)&&result.ship>0;
  $('cResult').hidden=true;$('cDetail').hidden=!usable;pxResult.hidden=!usable;empty.hidden=usable;syncPXTargets();
  if(!usable){result=null;$('cPrice').value='';$('cPx').value='';$('cRows').replaceChildren();$('cMargin').textContent='—';$('cProfit').textContent='—';$('cStatus').textContent='';$('cDetail').open=false;pxResult.querySelectorAll('b,strong').forEach(node=>node.textContent='');$('cNewPXStatus').textContent='';$('cNewPXFeeNote').textContent='';return}
  // Reuse all official company-side results; cPrice is only a derived value in PX mode.
  $('cPrice').value=String(result.price);
  $('cPx').value=String(target);$('cRows').innerHTML=rows(result);$('cMargin').textContent=pc(result.margin);styleResult($('cResult'),Number(result.margin.toFixed(12)),'cStatus');
  $('cNewPXRetail').textContent='$'+m2(result.ship);$('cNewPXTarget').textContent=target.toFixed(2)+'%';$('cNewPXOffer').textContent='$'+m2(result.price);
  $('cNewPXCost').textContent='$'+m2(cost);$('cNewPXFee').textContent='$'+m2(result.feeAmt);$('cNewPXProfit').textContent='$'+m2(result.profit);$('cNewPXCompanyMargin').textContent=pc(result.margin);
  $('cNewPXStatus').textContent=$('cStatus').textContent;$('cNewPXStatus').className=$('cStatus').className;
  $('cNewPXFeeNote').textContent=`依全聯前毛 ${target}%／公司目標毛利 ${company}% 反推｜公司費用率 ${fee.toFixed(2)}%`;
  save();
 }
 function calculate(){
  if(!active){officialCalculate();return}
  if(channel==='px'){calculatePX();return}
  empty.querySelector('b').textContent='尚未計算';empty.querySelector('p').textContent='請輸入新品試算資料。';
  const price=read('cPrice'),cost=read('cCost'),purchase=read('cNewPurchase'),fee=read('cFee');
  const valid=price!==null&&price>0&&cost!==null&&cost>=0&&purchase!==null&&purchase>0&&fee!==null&&fee>=0&&fee<=100;
  result=null;$('cResult').hidden=!valid;$('cDetail').hidden=!valid;empty.hidden=valid;
  if(!valid){$('cPx').value='';$('cPx').textContent='';$('cRows').replaceChildren();$('cMargin').textContent='—';$('cProfit').textContent='—';$('cStatus').textContent='';$('cDetail').open=false;$('copyFeedback').textContent='';return}
  // Convert the user's untaxed PX purchase price to the existing model's front-margin input.
  // Keep full precision in .value; this is input conversion, not a second margin formula.
  const px=1-purchase/(price/1.05);$('cPx').value=String(px*100);
  officialCalculate();result=model(price,cost,px,fee/100);
  // Remove binary rounding noise only for the badge boundary; calculated values stay untouched.
  styleResult($('cResult'),Number(result.margin.toFixed(12)),'cStatus');
 }
 function enter(){
  if(!active)snapshot={values:Object.fromEntries(ids.map(id=>[id,$(id).value])),product:binding.selected||null};
  active=true;channel='general';drafts={};binding.selected=null;closeProductOptions(binding);ids.forEach(id=>$(id).value='');['cNewName','cNewBarcode','cNewPurchase','cNewPXMargin','cNewCompanyMargin'].forEach(id=>$(id).value='');
  syncFixedFrontMargin(binding,null);$('cPx').value='';$('cPx').textContent='';updateProductCostNote(binding);renderProductInsights(binding);$('copyFeedback').textContent='';displayMode(true);calculate();$('cNewName').focus();
 }
 function leave(){
  if(!active)return;
  active=false;result=null;channel='general';drafts={};displayMode(false);empty.hidden=true;$('cResult').hidden=false;$('cDetail').hidden=false;
  ['cNewName','cNewBarcode','cNewPurchase','cNewPXMargin','cNewCompanyMargin'].forEach(id=>$(id).value='');
  ids.forEach(id=>$(id).value=snapshot?.values[id]??'');binding.selected=snapshot?.product||null;
  syncFixedFrontMargin(binding,binding.selected);updateProductCostNote(binding);renderProductInsights(binding);$('copyFeedback').textContent='';officialCalculate();snapshot=null;
 }
 calcC=calculate;binding.calculate=calculate;
 selectProduct=function(target,product){if(target===binding&&active)leave();officialSelect(target,product)};
 buildCalcResultText=function(){
  if(!active)return officialCopy();
  if(!result)return '新品開發試算\n尚未計算\n請輸入新品試算資料。';
  if(channel==='px')return ['【全聯新品試算】',$('cNewName').value.trim()||'未命名新品',`條碼：${$('cNewBarcode').value.trim()||'未填寫'}`,`建議架售價（含稅）：$${m2(result.price)}`,`全聯毛利率（前毛）：${read('cNewPXMargin').toFixed(2)}%`,`公司目標毛利率：${read('cNewCompanyMargin').toFixed(2)}%`,`PX 未稅進價：$${m2(result.ship)}`,`商品成本：$${m2(read('cCost'))}`,`公司費用：$${m2(result.feeAmt)}`,`中科毛利額：$${m2(result.profit)}`,`中科毛利率（費用後）：${pc(result.margin)}`,$('cNewPXFeeNote').textContent].join('\n');
  return ['【新品開發試算｜未套用既有商品資料】',$('cNewName').value.trim()||'未命名新品',`條碼：${$('cNewBarcode').value.trim()||'未填寫'}`,`售價（含稅）：$${m2(result.price)}`,`PX 進價（未稅）：$${m2(result.ship)}`,`成本：$${m2(read('cCost'))}`,`公司費用率：${read('cFee')}%`,`公司費用：$${m2(result.feeAmt)}`,`中科毛利額：$${m2(result.profit)}`,`中科毛利率（費用後）：${pc(result.margin)}`].join('\n');
 };
 save=function(){
  if(!active){officialSave();return}
  // Temporary new-product values are never stored as an existing-product calculation.
  try{localStorage.setItem('opMarginV3',JSON.stringify(Object.fromEntries(storeIds.map(id=>[id,ids.includes(id)?snapshot.values[id]:$(id).value]))))}catch(error){}
 };
 panel.addEventListener('input',event=>{
  if(!active||!['cPrice','cCost','cFee','cNewName','cNewBarcode','cNewPurchase','cNewPXMargin','cNewCompanyMargin'].includes(event.target.id))return;
  event.stopImmediatePropagation();$('copyFeedback').textContent='';calculate();
 },true);
 channels.addEventListener('click',event=>{
  const button=event.target.closest('[data-new-channel]');if(!button||!active||button.dataset.newChannel===channel)return;
  const fields=['cPrice','cCost','cFee','cNewName','cNewBarcode','cNewPurchase','cNewPXMargin','cNewCompanyMargin'];drafts[channel]=Object.fromEntries(fields.map(id=>[id,$(id).value]));channel=button.dataset.newChannel;
  fields.forEach(id=>$(id).value=drafts[channel]?.[id]??'');$('copyFeedback').textContent='';$('cDetail').open=false;displayMode(true);calculate();
 });
 quick.addEventListener('click',event=>{const button=event.target.closest('[data-new-px-target]');if(button){$('cNewPXMargin').value=button.dataset.newPxTarget;$('copyFeedback').textContent='';calculate()}});
 companyTarget.addEventListener('click',event=>{const button=event.target.closest('[data-new-company-target]');if(button){$('cNewCompanyMargin').value=button.dataset.newCompanyTarget;$('copyFeedback').textContent='';calculate()}});
 panel.addEventListener('click',event=>{
  if(active&&event.target.closest('#clearCalculation')){event.stopImmediatePropagation();$(channel==='px'?'cNewCompanyMargin':'cPrice').value='';calculate();$('copyFeedback').textContent=channel==='px'?'已清除公司目標毛利，其他新品試算資料已保留':'已清除新品售價，其他新品試算資料已保留'}
 },true);
 entry.addEventListener('click',enter);mode.querySelector('button').addEventListener('click',()=>{leave();$('cProduct').focus()});
 displayMode(false);
})();
