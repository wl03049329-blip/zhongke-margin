/* Read-only presentation of the three results rendered by the existing calcS(). */
(()=>{
 const result=document.getElementById('scenarioResults'),names=['A','B','C'];
 const metric=(card,label)=>[...card.querySelectorAll('.scenario-metric')].find(row=>row.querySelector('span')?.textContent.trim()===label)?.querySelector('b')?.textContent.trim()||'';
 const numeric=(text,suffix)=>{const match=text.match(new RegExp('(-?\\d[\\d,]*(?:\\.\\d+)?)\\s*'+suffix));return match?Number(match[1].replaceAll(',','')):null};
 const rate=text=>numeric(text,'%'),price=text=>numeric(text,'元');
 const displayedRate=value=>value===null?'資料不足':`${Number.isInteger(value*10)?value.toFixed(1):value.toFixed(2)}%`;
 const money=value=>value===null?'資料不足':`$${value.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 const pointDelta=(base,value)=>{if(base===null||value===null)return null;const delta=Math.round((value-base)*100)/100,amount=Math.abs(delta);return `${delta>0?'+':delta<0?'−':''}${Number.isInteger(amount*10)?amount.toFixed(1):amount.toFixed(2)} 個百分點`};
 const priceDelta=(base,value)=>base===null||value===null?'資料不足':`${value-base>=0?'+':'−'}${money(Math.abs(value-base))}`;
 function snapshot(){
  const cards=[...result.querySelectorAll('.scenario-card')];
  return names.map(name=>{
   const card=cards.find(item=>item.querySelector('h3')?.textContent.trim()===`方案 ${name}`);
   if(!card)return{name,margin:null,front:null,price:null,cost:null,reached:null,highest:false};
   const state=card.querySelector('.scenario-state'),classes=state?.classList,margin=rate(metric(card,'中科毛利率（費用後）'));
   return{name,margin,front:rate(metric(card,'全聯毛利率（前毛）')),price:price(metric(card,'售價')),cost:price(metric(card,'商品成本')),reached:margin===null?null:classes?.contains('excellent')||classes?.contains('target')?true:classes?.contains('optimize')||classes?.contains('low')?false:null,highest:margin!==null&&[...card.querySelectorAll('.best-badge')].some(badge=>badge.textContent.trim()==='毛利率最高')};
  });
 }
 function statusText(plans){
  const groups=[{items:plans.filter(plan=>plan.reached===true),label:'已達門檻'},{items:plans.filter(plan=>plan.reached===false),label:'尚未達門檻'},{items:plans.filter(plan=>plan.reached===null),label:'資料不足'}];
  return groups.filter(group=>group.items.length).map(group=>`${group.items.map(plan=>plan.name).join('、')} ${group.label}`).join('；')+'。';
 }
 function summary(plans){
  const [a,b,c]=plans,highest=plans.filter(plan=>plan.highest),top=highest.length?`最高中科毛利率：${highest.map(plan=>plan.name).join('、')} ${displayedRate(highest[0].margin)}`:'最高中科毛利率：資料不足';
  const difference=plan=>{const points=pointDelta(a.margin,plan.margin);if(points===null)return'較 A 資料不足';if(plan.margin>a.margin)return`較 A ${points}｜較 A 方案改善`;if(plan.margin<a.margin)return`較 A ${points}｜低於 A 方案`;return`較 A ${points}｜與 A 方案持平`};
  const sameFront=plans.every(plan=>plan.front!==null&&plan.front===a.front),sameCost=plans.every(plan=>plan.cost!==null&&plan.cost===a.cost);
  const details=[sameFront?`全聯前毛 ${displayedRate(a.front)}（三方案相同）`:null,sameCost?`成本 ${money(a.cost)}（共用）`:null,`售價較 A：B ${priceDelta(a.price,b.price)}、C ${priceDelta(a.price,c.price)}`].filter(Boolean).join('｜');
  return{top,rows:[{name:'A 現況',value:displayedRate(a.margin),detail:''},{name:'B 方案',value:displayedRate(b.margin),detail:difference(b)},{name:'C 方案',value:displayedRate(c.margin),detail:difference(c)}],threshold:`目前設定中科毛利門檻：${thresholdState.targetMin}%｜${statusText(plans)}`,details,copy:[
   '【方案比較】',...(productBindings[2].selected?[`商品：${productBindings[2].selected.name}`]:[]),
   `A 現況：中科毛利率（費用後）${displayedRate(a.margin)}`,
   `B 方案：中科毛利率（費用後）${displayedRate(b.margin)}｜${difference(b)}`,
   `C 方案：中科毛利率（費用後）${displayedRate(c.margin)}｜${difference(c)}`,
   `目前設定中科毛利門檻：${thresholdState.targetMin}%`,statusText(plans),details
  ].join('\n')};
 }
 function render(){
  const view=summary(snapshot()),list=document.getElementById('scenarioSummaryRows');
  document.getElementById('scenarioSummaryHighest').textContent=view.top;
  list.replaceChildren();
  for(const item of view.rows){const row=document.createElement('div'),label=document.createElement('span'),value=document.createElement('strong'),detail=document.createElement('span');row.className='scenario-summary-row';row.dataset.plan=item.name[0];label.textContent=item.name;value.textContent=item.value;detail.textContent=item.detail;row.append(label,value,detail);list.appendChild(row)}
  document.getElementById('scenarioSummaryThreshold').textContent=view.threshold;
  document.getElementById('scenarioSummaryDetails').textContent=view.details;
 }
 document.getElementById('copyScenarioSummary').addEventListener('click',async()=>{
  const feedback=document.getElementById('scenarioSummaryFeedback'),text=summary(snapshot()).copy;let copied=false;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true}}catch(e){}
  if(!copied)try{copied=fallbackCopyText(text)}catch(e){}
  feedback.textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限';
  setTimeout(()=>{feedback.textContent=''},3000);
 });
 new MutationObserver(render).observe(result,{childList:true});
 render();
})();
