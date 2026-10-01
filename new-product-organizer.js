/* Text-only workflow. Every field comes from this draft; no product or replacement matching. */
((global)=>{
 const CHANNELS=['PX','大 PX','PX＋大 PX'],TYPES=['新品','替換'],MISSING='待確認';
 const value=text=>String(text??'').trim();
 const show=text=>value(text)||MISSING;
 function inspect(item){
  const channel=CHANNELS.includes(item.channel)?item.channel:'',type=TYPES.includes(item.type)?item.type:'';
  const newName=value(item.newName),newBarcode=value(item.newBarcode),oldName=value(item.oldName),oldBarcode=value(item.oldBarcode),reportPeriod=value(item.reportPeriod),launchPeriod=value(item.launchPeriod),note=value(item.note);
  const missing=[];
  if(!channel)missing.push('通路');if(!type)missing.push('提報類型');if(!newName)missing.push('新品名稱');if(!newBarcode)missing.push('新品條碼');
  if(type==='替換'){if(!oldName)missing.push('被替換商品名稱');if(!oldBarcode)missing.push('被替換商品條碼')}
  if(!reportPeriod)missing.push('提報時間');if(!launchPeriod)missing.push('預計上架時間');
  return{channel,type,newName,newBarcode,oldName,oldBarcode,reportPeriod,launchPeriod,note,missing,incompleteReplacement:type==='替換'&&(!oldName||!oldBarcode)};
 }
 const typeLabel=type=>type==='新品'?'新品提報':type==='替換'?'替換提報':'提報類型待確認';
 function ordered(items){return items.map((item,index)=>({item,index,view:inspect(item)})).sort((a,b)=>{
  const rank=(list,key)=>{const index=list.indexOf(key);return index<0?list.length:index};
  return rank(CHANNELS,a.view.channel)-rank(CHANNELS,b.view.channel)||rank(TYPES,a.view.type)-rank(TYPES,b.view.type)||a.index-b.index;
 });}
 const replacement=view=>view.type==='新品'?'不適用（新品提報）':view.type==='替換'?`${show(view.newName)} 新品 → 替換 ${show(view.oldName)} 舊品（被替換條碼：${show(view.oldBarcode)}）`:MISSING;
 function makeOutputs(items){
  if(!items.length)return{tracking:'尚無品項，請先新增。',manager:'尚無品項，請先新增。',agent:'尚無品項，請先新增。'};
  const sorted=ordered(items),warning=view=>view.incompleteReplacement?['替換資訊未完整']:[];
  const tracking=['【自己追蹤版】',...sorted.flatMap(({view},index)=>['',`${index+1}. ${show(view.channel)}｜${typeLabel(view.type)}`,`新品名稱：${show(view.newName)}`,`新品條碼：${show(view.newBarcode)}`,`被替換商品名稱：${view.type==='新品'?'不適用（新品）':show(view.oldName)}`,`被替換商品條碼：${view.type==='新品'?'不適用（新品）':show(view.oldBarcode)}`,`提報時間：${show(view.reportPeriod)}`,`預計上架：${show(view.launchPeriod)}`,`備註：${show(view.note)}`,...warning(view)])].join('\n');
  const manager=['【新品提報摘要】',...sorted.flatMap(({view},index)=>['',`${index+1}. ${show(view.channel)}｜${typeLabel(view.type)}`,`通路：${show(view.channel)}`,`類型：${typeLabel(view.type)}`,`品項：${show(view.newName)}（新品條碼：${show(view.newBarcode)}）`,`替換關係：${replacement(view)}`,`提報時間：${show(view.reportPeriod)}`,`預計上架：${show(view.launchPeriod)}`,`重點備註：${show(view.note)}`,...warning(view)])].join('\n');
  const agent=['【代理商通知】',...sorted.flatMap(({view},index)=>['',`${index+1}. 通路：${show(view.channel)}`,`提報類型：${typeLabel(view.type)}`,`新品：${show(view.newName)}`,`新品條碼：${show(view.newBarcode)}`,...(view.type==='替換'?[`被替換商品：${show(view.oldName)}`,`被替換商品條碼：${show(view.oldBarcode)}`]:[]),`提報時間：${show(view.reportPeriod)}`,`預計上架：${show(view.launchPeriod)}`,`備註：${show(view.note)}`,...warning(view),...(view.missing.length?[`待確認事項：${view.missing.join('、')}`]:[])])].join('\n');
  return{tracking,manager,agent};
 }
 const api=Object.freeze({CHANNELS,TYPES,inspect,ordered,makeOutputs});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(!global.document)return;
 global.PX_PRODUCT_ORGANIZER=api;
 const document=global.document,root=document.getElementById('organizer');if(!root)return;
 const list=document.getElementById('organizerItems'),preview=document.getElementById('organizerPreview'),feedback=document.getElementById('organizerFeedback');
 let items=[],nextId=1,mode='tracking';
 const blank=()=>({id:nextId++,channel:'',type:'',newBarcode:'',newName:'',oldName:'',oldBarcode:'',reportPeriod:'',launchPeriod:'',note:''});
 const outputItems=()=>items.filter(item=>Object.entries(item).some(([field,content])=>field!=='id'&&value(content)));
 const hasMeaningfulItem=()=>outputItems().some(item=>{const view=inspect(item);return view.channel&&view.type&&view.newName});
 function refreshCard(card,item,index){
  const view=inspect(item),summary=card.querySelector('summary'),title=document.createElement('span'),status=document.createElement('small');
  title.textContent=`${index+1}｜${show(view.channel)}｜${view.type||MISSING}｜${show(view.newName)}`;
  status.className='organizer-summary-status';status.textContent=view.incompleteReplacement?'替換資訊未完整':view.missing.length?'待補資料':'資料完整';
  status.classList.toggle('incomplete',view.incompleteReplacement);const content=document.createElement('span');content.append(title,status);summary.replaceChildren(content);
  card.querySelector('.organizer-replacement').hidden=view.type!=='替換';card.querySelector('.organizer-warning').hidden=!view.incompleteReplacement;
 }
 function renderCards(openId){
  list.replaceChildren();
  if(!items.length){const empty=document.createElement('p');empty.className='organizer-empty';empty.textContent='尚無品項，點「新增品項」開始。';list.appendChild(empty);return}
  items.forEach((item,index)=>{
   const card=document.createElement('div');card.className='organizer-item';card.dataset.itemId=String(item.id);
   card.innerHTML='<details><summary></summary><div class="organizer-fields"><label>通路<select data-field="channel"><option value="">請選擇通路</option><option value="PX">PX</option><option value="大 PX">大 PX</option><option value="PX＋大 PX">PX＋大 PX</option></select></label><label>提報類型<select data-field="type"><option value="">請選擇類型</option><option value="新品">新品</option><option value="替換">替換</option></select></label><label>新品名稱<input data-field="newName" type="text" maxlength="160" placeholder="輸入新品名稱"></label><label>新品條碼<input data-field="newBarcode" type="text" inputmode="numeric" maxlength="64" placeholder="輸入新品條碼"></label><div class="organizer-replacement"><label>被替換商品名稱<input data-field="oldName" type="text" maxlength="160" placeholder="輸入舊品名稱"></label><label>被替換商品條碼<input data-field="oldBarcode" type="text" inputmode="numeric" maxlength="64" placeholder="輸入舊品條碼"></label></div><label>提報月份／檔期<input data-field="reportPeriod" type="text" maxlength="80" placeholder="例：12 月新品／12-1"></label><label>預計上架月份／檔期<input data-field="launchPeriod" type="text" maxlength="80" placeholder="例：1 月／1-1"></label><label class="wide">備註<textarea data-field="note" maxlength="500" placeholder="可留空；缺值會顯示待確認"></textarea></label><button class="organizer-done" type="button">完成編輯，收合品項</button></div></details><button class="organizer-delete" type="button" aria-label="刪除這筆品項">刪除</button><span class="organizer-warning" hidden>替換資訊未完整</span>';
   for(const field of card.querySelectorAll('[data-field]'))field.value=item[field.dataset.field];
   card.querySelector('details').open=item.id===openId;refreshCard(card,item,index);list.appendChild(card);
  });
 }
 const copyButtons={tracking:document.getElementById('organizerCopyTracking'),manager:document.getElementById('organizerCopyManager'),agent:document.getElementById('organizerCopyAgent')};
 function renderOutputs(){const ready=hasMeaningfulItem();preview.classList.toggle('is-empty',!ready);preview.textContent=ready?makeOutputs(outputItems())[mode]:'尚未有完整品項資料\n請先填寫通路、提報類型與新品名稱';for(const [kind,button] of Object.entries(copyButtons)){button.hidden=kind!==mode;button.disabled=!ready}}
 list.addEventListener('input',event=>{const field=event.target.dataset.field,card=event.target.closest('.organizer-item');if(!field||!card)return;const item=items.find(item=>item.id===Number(card.dataset.itemId));if(!item)return;item[field]=event.target.value;refreshCard(card,item,items.indexOf(item));renderOutputs();feedback.textContent=''});
 list.addEventListener('change',event=>{if(event.target.matches('select[data-field]'))event.target.dispatchEvent(new Event('input',{bubbles:true}))});
 list.addEventListener('click',event=>{if(event.target.classList.contains('organizer-done')){const details=event.target.closest('details');details.open=false;details.querySelector('summary').focus();return}if(!event.target.classList.contains('organizer-delete'))return;const id=Number(event.target.closest('.organizer-item').dataset.itemId);items=items.filter(item=>item.id!==id);renderCards(items[0]?.id);renderOutputs();feedback.textContent=''});
 document.getElementById('organizerAdd').addEventListener('click',()=>{const item=blank();items.push(item);renderCards(item.id);renderOutputs();list.lastElementChild?.querySelector('select[data-field="channel"]')?.focus();feedback.textContent=''});
 document.getElementById('organizerClear').addEventListener('click',()=>{if(!items.length||!global.confirm('確定清空本批品項？'))return;items=[];renderCards(null);renderOutputs();feedback.textContent='本批品項已清空'});
 root.querySelectorAll('[data-organizer-view]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.organizerView;root.querySelectorAll('[data-organizer-view]').forEach(other=>{const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active))});renderOutputs()}));
 async function copy(kind){if(kind!==mode||!hasMeaningfulItem())return;const text=preview.textContent;let copied=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true}}catch(error){}if(!copied)try{copied=fallbackCopyText(text)}catch(error){}feedback.textContent=copied?'已複製，可貼到 LINE 或 Email':'無法自動複製，請確認瀏覽器權限'}
 for(const [kind,button] of Object.entries(copyButtons))button.addEventListener('click',()=>copy(kind));
 const first=blank();items.push(first);renderCards(first.id);renderOutputs();
})(typeof window==='object'?window:globalThis);
