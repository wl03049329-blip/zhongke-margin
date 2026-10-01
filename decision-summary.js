/* Decision support reads one rendered A/B/C snapshot; it never calculates margins. */
(()=>{
 const $=id=>document.getElementById(id),missing='資料不足',names=['A','B','C'];
 const source=$('scenarioResults'),comparison=$('scenarioSummaryRows');
 const metric=(card,label)=>card?[...card.querySelectorAll('.scenario-metric')].find(row=>row.querySelector('span')?.textContent.trim()===label)?.querySelector('b')?.textContent.trim()||'':'';
 const percent=text=>/^-?\d+(?:\.\d+)?%$/.test(text)?text:missing;
 const amount=text=>{const match=text.match(/^(-?[\d,]+(?:\.\d+)?)\s*元$/);return match?`$${match[1]}`:missing};
 function read(){
  const selected=productBindings[2].selected,validProduct=selected&&$('sProduct').value===selected.name;
  const cards=[...source.querySelectorAll('.scenario-card')],rows=[...comparison.querySelectorAll('.scenario-summary-row')];
  const complete=validProduct&&cards.length===3&&rows.length===3&&names.every(name=>cards.some(card=>card.querySelector('h3')?.textContent.trim()===`方案 ${name}`)&&rows.some(row=>row.dataset.plan===name));
  const card=name=>complete?cards.find(item=>item.querySelector('h3')?.textContent.trim()===`方案 ${name}`):null;
  const row=name=>complete?rows.find(item=>item.dataset.plan===name):null;
  const a=card('A'),aRow=row('A'),state=a?.querySelector('.scenario-state')?.classList;
  const target=$('scenarioSummaryThreshold').textContent.match(/目前設定中科毛利門檻：([\d.]+%)/)?.[1]||missing;
  const deltas=Object.fromEntries(['B','C'].map(name=>{
   const detail=row(name)?.lastElementChild?.textContent||'';
   return[name,/與 A 方案持平/.test(detail)?'持平':detail.match(/較 A ([+−]?\d+(?:\.\d+)? 個百分點)/)?.[1]||missing];
  }));
  const relation=Object.fromEntries(['B','C'].map(name=>[name,row(name)?.lastElementChild?.textContent||'']));
  return{
   product:complete?selected.name:missing,barcode:complete&&selected.barcode?selected.barcode:missing,
   margin:percent(aRow?.querySelector('strong')?.textContent.trim()||''),front:percent(metric(a,'全聯毛利率（前毛）')),
   price:amount(metric(a,'售價')),cost:amount(metric(a,'商品成本')),
   target:complete?target:missing,deltas,relation,
   reached:state?.contains('excellent')||state?.contains('target')?true:state?.contains('optimize')||state?.contains('low')?false:null
  };
 }
 function describe(data){
  if(data.margin===missing||data.reached===null)return{notices:['目前資料不足，暫不判讀。'],next:'可確認目前商品與試算輸入資料。'};
  const notices=[data.reached?'目前中科毛利率已達設定門檻。':'目前中科毛利率低於設定門檻。'];
  if(data.front===missing)notices.push('全聯毛利率（前毛）資料不足。');
  for(const name of ['B','C']){
   const detail=data.relation[name];
   if(data.deltas[name]===missing)notices.push(`${name} 方案資料不足，暫不判讀。`);
   else if(/較 A 方案改善/.test(detail))notices.push(`${name} 方案較 A 方案改善。`);
   else if(/低於 A 方案/.test(detail))notices.push(`${name} 方案低於 A 方案。`);
   else if(/與 A 方案持平/.test(detail))notices.push(`${name} 方案與 A 方案持平。`);
  }
  const next=data.cost===missing?'可確認目前使用的商品成本版本。':'可進一步比較不同售價／商品成本條件下的結果。';
  return{notices:notices.slice(0,3),next};
 }
 function render(){
  const data=read(),view=describe(data),list=$('decisionNotices');
  $('decisionProduct').textContent=`商品：${data.product}｜條碼：${data.barcode}`;
  $('decisionMargin').textContent=data.margin;$('decisionFrontMargin').textContent=data.front;
  $('decisionDeltaB').textContent=data.deltas.B;$('decisionDeltaC').textContent=data.deltas.C;
  list.replaceChildren(...view.notices.map(text=>{const item=document.createElement('li');item.textContent=text;return item}));
  $('decisionNext').textContent=view.next;
  $('decisionContext').textContent=`A 售價：${data.price}｜商品成本：${data.cost}｜目前設定中科毛利門檻：${data.target}`;
  return{data,view};
 }
 $('copyDecisionSummary').addEventListener('click',async()=>{
  const {data,view}=render(),text=['【PX 商品決策摘要】',`商品：${data.product}`,`條碼：${data.barcode}`,'','目前狀況',`中科毛利率（費用後）：${data.margin}`,`全聯毛利率（前毛）：${data.front}`,'','方案比較',`B vs A：${data.deltas.B}`,`C vs A：${data.deltas.C}`,`目前設定中科毛利門檻：${data.target}`,'','目前需要注意',...view.notices,'','可進一步確認',view.next,`A 售價：${data.price}｜商品成本：${data.cost}`].join('\n');
  let copied=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true}}catch(e){}
  if(!copied)try{copied=fallbackCopyText(text)}catch(e){}
  const feedback=$('decisionFeedback');feedback.textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限';
  setTimeout(()=>{feedback.textContent=''},3000);
 });
 new MutationObserver(render).observe(comparison,{childList:true});
 render();
})();
