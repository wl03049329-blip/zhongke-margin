/* Frontend convenience screen lock only. Not access control or encryption. */
(function(){
'use strict';
const config=window.PX_PIN_CONFIG,KEY='px-screen-session-v1',TTL=6*60*60*1000;
let session=null,busy=false;
const gate=document.createElement('section');gate.id='pxPinGate';gate.setAttribute('aria-label','PX 工作台登入');
gate.innerHTML='<form class="pin-card"><h1>PX 通路工作台</h1><p>請輸入 4 位數 PIN 碼</p><div class="pin-boxes">'+[1,2,3,4].map(n=>'<input type="password" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off" aria-label="第 '+n+' 碼" required>').join('')+'</div><button type="submit">解鎖工作台</button><p class="pin-message" role="status" aria-live="polite"></p></form>';
document.body.prepend(gate);
const fields=[...gate.querySelectorAll('input')],message=gate.querySelector('.pin-message'),app=document.querySelector('.app');
const logout=document.createElement('button');logout.type='button';logout.id='pxPinLogout';logout.textContent='登出';document.querySelector('.brand').append(logout);
function valid(s,now=Date.now()){return !!s&&s.version===config?.version&&Number.isSafeInteger(s.started)&&Number.isSafeInteger(s.seen)&&s.started<=s.seen&&s.seen<=now&&now-s.started<TTL;}
function read(){try{return JSON.parse(localStorage.getItem(KEY))}catch{return null}}
function lock(){session=null;try{localStorage.removeItem(KEY)}catch{}document.documentElement.classList.add('px-locked');app.inert=true;gate.hidden=false;logout.hidden=true;fields.forEach(f=>f.value='');message.textContent='';fields[0].focus();}
function open(s){session=s;document.documentElement.classList.remove('px-locked');app.inert=false;gate.hidden=true;logout.hidden=false;requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));}
function persist(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
function check(){if(!session)return;if(!valid(session)||!valid(read())){lock();return}session.seen=Date.now();persist(session);}
fields.forEach((field,i)=>{
 field.addEventListener('input',()=>{field.value=field.value.replace(/[^0-9]/g,'').slice(-1);if(field.value&&i<3)fields[i+1].focus()});
 field.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!field.value&&i>0)fields[i-1].focus()});
 field.addEventListener('paste',e=>{e.preventDefault();const text=e.clipboardData.getData('text').trim();if(!/^\d{4}$/.test(text)){message.textContent='請輸入 4 位數字';return}fields.forEach((f,j)=>f.value=text[j]);fields[3].focus()});
});
gate.querySelector('form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const pin=fields.map(f=>f.value).join('');
 if(!/^\d{4}$/.test(pin)){message.textContent='請輸入 4 位數字';return}
 busy=true;
 try{if(!config||!crypto.subtle)throw Error('unavailable');const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(config.salt+':'+pin));const digest=[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(digest!==config.digest){message.textContent='PIN 不正確';fields.forEach(f=>f.value='');fields[0].focus();return}
 const now=Date.now(),s={version:config.version,started:now,seen:now};persist(s);open(s);fields.forEach(f=>f.value='');
 }catch{message.textContent='目前無法解鎖，請重新整理'}finally{busy=false}
});
logout.addEventListener('click',lock);
window.addEventListener('storage',e=>{if(e.key===KEY&&session&&!valid(read()))lock()});
window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);setInterval(check,1000);
const saved=read();if(config&&valid(saved))open(saved);else lock();
})();
