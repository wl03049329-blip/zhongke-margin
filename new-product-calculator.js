/* Calculator-only draft mode. The official model(), calcC() and thresholds stay unchanged. */
(()=>{
 'use strict';
 const panel=$('calc'),binding=productBindings[0],picker=$('cProduct').closest('.full'),front=$('cPx').parentElement,costNote=panel.querySelector('.cost-override-note');
 const officialCalculate=calcC,officialSelect=selectProduct,officialCopy=buildCalcResultText,officialSave=save;
 const ids=['cProduct','cPrice','cCost','cFee'];
 let active=false,snapshot=null,result=null;
 const entry=document.createElement('button');entry.type='button';entry.id='developNewProduct';entry.className='new-product-entry';entry.textContent='＋ 開發新品';
 const pickerRow=document.createElement('div');pickerRow.className='new-product-picker-row';const productPicker=picker.querySelector('.product-picker');productPicker.before(pickerRow);pickerRow.append(productPicker,entry);
 const mode=document.createElement('div');mode.id='newProductMode';mode.className='new-product-mode';mode.hidden=true;
 mode.innerHTML='<div><b>新品開發試算</b><small>未套用既有商品資料</small></div><button type="button" class="new-product-return">選擇既有商品</button>';
 panel.querySelector('.grid').before(mode);
 const fields=document.createElement('div');fields.className='new-product-fields';fields.hidden=true;
 fields.innerHTML='<div class="full"><label for="cNewName">商品名稱（選填）</label><input id="cNewName" type="text" autocomplete="off" placeholder="自行輸入新品名稱"></div><div><label for="cNewBarcode">商品條碼（選填）</label><input id="cNewBarcode" type="text" inputmode="numeric" autocomplete="off" placeholder="未填寫"></div><div><label for="cNewPurchase">PX 進價（未稅）</label><div class="wrap"><input id="cNewPurchase" type="number" inputmode="decimal" step="any" min="0"><span class="unit">元</span></div></div>';
 picker.after(fields);
 const empty=document.createElement('div');empty.id='cNewEmpty';empty.className='new-product-empty';empty.hidden=true;empty.setAttribute('role','status');empty.innerHTML='<b>尚未計算</b><p>請輸入新品試算資料。</p>';$('cResult').before(empty);
 const feeNote=document.createElement('small');feeNote.className='fixed-note';feeNote.textContent='公司費用依 PX 進價 × 公司費用率計算';feeNote.hidden=true;$('cFee').closest('div.wrap').after(feeNote);
 function read(id){const raw=$(id).value.trim();return raw!==''&&Number.isFinite(Number(raw))?Number(raw):null}
 function displayMode(enabled){mode.hidden=!enabled;fields.hidden=!enabled;picker.hidden=enabled;front.hidden=enabled;costNote.hidden=enabled;feeNote.hidden=!enabled;panel.dataset.calculatorMode=enabled?'new':'existing'}
 function calculate(){
  if(!active){officialCalculate();return}
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
  active=true;binding.selected=null;closeProductOptions(binding);ids.forEach(id=>$(id).value='');['cNewName','cNewBarcode','cNewPurchase'].forEach(id=>$(id).value='');
  syncFixedFrontMargin(binding,null);$('cPx').value='';$('cPx').textContent='';updateProductCostNote(binding);renderProductInsights(binding);$('copyFeedback').textContent='';displayMode(true);calculate();$('cNewName').focus();
 }
 function leave(){
  if(!active)return;
  active=false;result=null;displayMode(false);empty.hidden=true;$('cResult').hidden=false;$('cDetail').hidden=false;
  ['cNewName','cNewBarcode','cNewPurchase'].forEach(id=>$(id).value='');
  ids.forEach(id=>$(id).value=snapshot?.values[id]??'');binding.selected=snapshot?.product||null;
  syncFixedFrontMargin(binding,binding.selected);updateProductCostNote(binding);renderProductInsights(binding);$('copyFeedback').textContent='';officialCalculate();snapshot=null;
 }
 calcC=calculate;binding.calculate=calculate;
 selectProduct=function(target,product){if(target===binding&&active)leave();officialSelect(target,product)};
 buildCalcResultText=function(){
  if(!active)return officialCopy();
  if(!result)return '新品開發試算\n尚未計算\n請輸入新品試算資料。';
  return ['【新品開發試算｜未套用既有商品資料】',$('cNewName').value.trim()||'未命名新品',`條碼：${$('cNewBarcode').value.trim()||'未填寫'}`,`售價（含稅）：$${m2(result.price)}`,`PX 進價（未稅）：$${m2(result.ship)}`,`成本：$${m2(read('cCost'))}`,`公司費用率：${read('cFee')}%`,`公司費用：$${m2(result.feeAmt)}`,`中科毛利額：$${m2(result.profit)}`,`中科毛利率（費用後）：${pc(result.margin)}`].join('\n');
 };
 save=function(){
  if(!active){officialSave();return}
  // Temporary new-product values are never stored as an existing-product calculation.
  try{localStorage.setItem('opMarginV3',JSON.stringify(Object.fromEntries(storeIds.map(id=>[id,ids.includes(id)?snapshot.values[id]:$(id).value]))))}catch(error){}
 };
 panel.addEventListener('input',event=>{
  if(!active||!['cPrice','cCost','cFee','cNewName','cNewBarcode','cNewPurchase'].includes(event.target.id))return;
  event.stopImmediatePropagation();$('copyFeedback').textContent='';calculate();
 },true);
 panel.addEventListener('click',event=>{
  if(active&&event.target.closest('#clearCalculation')){event.stopImmediatePropagation();$('cPrice').value='';calculate();$('copyFeedback').textContent='已清除新品售價，其他新品試算資料已保留'}
 },true);
 entry.addEventListener('click',enter);mode.querySelector('button').addEventListener('click',()=>{leave();$('cProduct').focus()});
 displayMode(false);
})();
