const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root=path.resolve(__dirname,'..');
const previous='1c85d24fba6a0e91a622d77a5204d5790b7b4348';
const oldHtml=execFileSync('git',['show',`${previous}:index.html`],{cwd:root});
const oldWorker=execFileSync('git',['show',`${previous}:service-worker.js`],{cwd:root});
let upgraded=false;
const oldAssets=new Map();
const server=http.createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
 if(pathname==='/favicon.ico'){response.writeHead(204).end();return}
 let body;
 if(!upgraded&&pathname==='/index.html')body=oldHtml;
 else if(!upgraded&&pathname==='/service-worker.js')body=oldWorker;
 else if(pathname==='/competitor-runtime.json')body=fs.readFileSync(path.join(root,'competitor-runtime.json'));
 else if(!upgraded){
  const file=pathname.slice(1)||'index.html';
  try{if(!oldAssets.has(file))oldAssets.set(file,execFileSync('git',['show',`${previous}:${file}`],{cwd:root,stdio:['ignore','pipe','ignore']}));body=oldAssets.get(file)}catch(error){response.writeHead(404).end();return}
 }
 else{
  const file=path.join(root,pathname.slice(1)||'index.html');
  if(!fs.existsSync(file)){response.writeHead(404).end();return}
  body=fs.readFileSync(file);
 }
 response.setHeader('Cache-Control','no-store');
 response.setHeader('Content-Type',pathname.endsWith('.html')?'text/html; charset=utf-8':pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.json')?'application/json':'application/octet-stream');
 response.end(body);
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(`${message.text()} ${message.location().url}`)});
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(async()=>{const keys=await caches.keys();return keys.includes('px-workbench-v4.1.2-scenario-source')});
 assert.equal(await page.locator('#pEmpty').count(),0,'previous page has the old promotion UI');
 const oldKeys=await page.evaluate(()=>caches.keys());
 upgraded=true;
 await page.evaluate(async()=>{const registration=await navigator.serviceWorker.ready;await registration.update()});
 await page.waitForFunction(async()=>{const keys=await caches.keys();return keys.length===1&&keys[0]==='px-workbench-v4.1.19-desktop-readability'},null,{timeout:20000});
 await page.reload({waitUntil:'networkidle'});
 const current=await page.evaluate(async()=>({keys:await caches.keys(),controller:navigator.serviceWorker.controller?.scriptURL||null,active:(await navigator.serviceWorker.ready).active?.scriptURL||null,empty:!!document.querySelector('#pEmpty'),average:!!document.querySelector('#pAverage')}));
 console.log(JSON.stringify({oldKeys,current},null,2));
 assert.ok(current.empty&&current.average,'navigation now loads the promotion release DOM');
 assert.deepEqual(errors,[],'online upgrade has no console errors');
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 const offline=await page.evaluate(()=>({empty:!!document.querySelector('#pEmpty'),average:!!document.querySelector('#pAverage')}));
 assert.ok(offline.empty&&offline.average,'offline fallback must never show the previous promotion page');
 assert.deepEqual(errors.filter(message=>!message.includes('net::ERR_FAILED')),[]);
 console.log(JSON.stringify({status:'PASS',oldKeys,current,offline,onlineConsoleErrors:[],expectedOfflineNetworkErrors:errors.length},null,2));
 await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
