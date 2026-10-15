'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),crypto=require('node:crypto');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),out=process.env.PX_RELEASE_EVIDENCE||path.join(os.tmpdir(),'px-new-product-v2-acceptance'),version='4.1.3-new-product-v2',cache=require('./price-center-contract.cjs').cache;
fs.mkdirSync(out,{recursive:true});
const assetRoot=fs.existsSync(path.join(root,'public/index.html'))?path.join(root,'public'):root;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html';if(name==='favicon.ico')return res.writeHead(204).end();const file=path.resolve(assetRoot,name);if(!file.startsWith(assetRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file))});
const digest=value=>crypto.createHash('sha256').update(value.replace(/\r\n/g,'\n')).digest('hex');
(async()=>{let browser,normal;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=process.env.PX_LIVE||`http://127.0.0.1:${server.address().port}/index.html`;
  assert.ok(['127.0.0.1','localhost','wl03049329-blip.github.io'].includes(new URL(url).hostname),'approved acceptance endpoint');
  if(process.env.PX_LIVE)assert.equal(url,'https://wl03049329-blip.github.io/zhongke-margin/index.html');
  const report={status:'RUNNING',environment:process.env.PX_LIVE?'PRODUCTION':'LOCAL_BUILD',url,version,cache,formulas:[],screenshots:[],errors:[],unexpectedRequests:[],assets:[]};
  const options={headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'};
  // Keep Chrome's nested Service Worker database below Windows path-length limits.
  normal=await chromium.launchPersistentContext(path.join(os.tmpdir(),'px-v2-browser-'+Date.now()),{...options,viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
  const observe=page=>{page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});page.on('request',r=>{if(new URL(r.url()).origin!==new URL(url).origin)report.unexpectedRequests.push(r.url())})};
  const page=normal.pages()[0]||await normal.newPage();page.setDefaultTimeout(30000);observe(page);console.log('Acceptance: open '+url);await page.goto(url,{waitUntil:'networkidle'});
  assert.match(await page.locator('.meta').innerText(),/VERSION 4\.2\.1[\s\S]*檔期查價 2\.1/);
  await page.locator('#cProduct').fill('65010209');await page.locator('#cPrice').fill('129');await page.locator('#cCost').fill('24.50');
  const existing=await page.evaluate(()=>({copy:buildCalcResultText(),margin:$('cMargin').textContent,rows:$('cRows').innerHTML,master:JSON.stringify(PX_Q3_PRODUCTS)}));
  await page.locator('#developNewProduct').click();assert.equal(await page.locator('[data-new-mode="A"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#cNewEmpty').innerText(),/尚未計算/);
  for(const [id,value] of [['cCost','30'],['cFee','10'],['cNewPXMargin','40'],['cNewCompanyMargin','40']])await page.locator('#'+id).fill(value);
  for(const [price,margin] of [[99,'36.97%'],[105,'40.00%'],[119,'45.88%']]){
   await page.locator('#cPrice').fill(String(price));
   assert.equal(await page.locator('#cNewPXCompanyMargin').innerText(),margin);assert.equal(await page.locator('#cNewPXOffer').innerText(),margin);
   report.formulas.push({mode:'A',rsp:price,companyMargin:margin,status:'PASS'});
  }
  for(const [key,price] of [['A',99],['B',105],['C',119]])await page.locator('#cNewCompare'+key).fill(String(price));
  for(const [key,margin] of [['A','36.97%'],['B','40.00%'],['C','45.88%']])assert.equal(await page.locator('#cNewCompareResult'+key+' strong').innerText(),margin);
  await page.locator('[data-new-mode="B"]').click();assert.equal(await page.locator('#cNewPXOffer').innerText(),'$105.00');
  for(const [id,value] of [['cNewPXPurchase','$60.00'],['cNewPXFee','$6.00'],['cNewPXProfit','$24.00'],['cNewPXCompanyMargin','40.00%']])assert.equal(await page.locator('#'+id).innerText(),value);
  report.formulas.push({mode:'B',target:'40%',rsp:'$105.00',status:'PASS'});
  assert.equal(await page.locator('#cPrice').inputValue(),'119');
  await page.locator('[data-new-mode="A"]').click();assert.equal(await page.locator('#cPrice').inputValue(),'119');assert.equal(await page.locator('#cNewPXOffer').innerText(),'45.88%');report.modePreservation='PASS';
  await page.locator('#copyResult').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),await page.evaluate(()=>buildCalcResultText()));
  console.log('Acceptance: fixed cases and mode preservation PASS');
  for(const [width,height] of [[320,568],[390,844],[1280,900],[1366,768],[1920,1080]]){
   await page.setViewportSize({width,height});for(const mode of ['A','B']){
    await page.locator(`[data-new-mode="${mode}"]`).click();assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);
    if([390,1366].includes(width)){const file=path.join(out,`new-product-v2-${report.environment.toLowerCase()}-${mode}-${width}.png`);await page.locator('#calc').screenshot({path:file});report.screenshots.push(file)}
   }
  }
  await page.locator('.new-product-return').click();await page.locator('#cPrice').focus();
  assert.deepEqual(await page.evaluate(()=>({copy:buildCalcResultText(),margin:$('cMargin').textContent,rows:$('cRows').innerHTML,master:JSON.stringify(PX_Q3_PRODUCTS)})),existing);report.existingProductRestore='PASS';
  for(const tab of ['reverse','scenario','promo','campaign','organizer','basis','calc']){await page.locator(`[data-tab="${tab}"]`).click();assert.equal(await page.locator('#'+tab).isVisible(),true)}
  console.log('Acceptance: responsive and existing product restore PASS');
  await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker not ready within 30s')),30000))])).catch(async error=>{console.log('SW diagnostics',JSON.stringify({errors:report.errors,registrations:await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.scriptURL,installing:r.installing?.state}))),unexpectedRequests:report.unexpectedRequests}));throw error});
  await page.waitForFunction(expected=>navigator.serviceWorker.controller?.scriptURL.includes(expected),'4.2.1',{timeout:30000});
  await page.waitForFunction(async expected=>(await caches.keys()).length===1&&(await caches.keys())[0]===expected,cache,{timeout:30000});
  for(const file of ['index.html',`new-product-calculator.js?v=${version}`,`new-product-calculator.css?v=${version}`,'service-worker.js?v=4.2.1']){
   const response=await normal.request.get(new URL(file,url).href,{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status(),200);
   const content=await response.text(),expected=fs.readFileSync(path.join(root,file.split('?')[0]),'utf8');assert.equal(digest(content),digest(expected),file+' production/build matches release');report.assets.push({file,sha256:digest(content)});
  }
  for(const name of ['new-product-calculator.js','new-product-calculator.css']){
   const cached=await page.evaluate(async({cache,name,version})=>{const response=await(await caches.open(cache)).match(new URL(name+'?v='+version,location.href));return response?.text()},{cache,name,version});
   assert.equal(digest(cached),digest(fs.readFileSync(path.join(root,name),'utf8')),'cached '+name+' matches release');
  }
  console.log('Acceptance: HTTP and cached asset hashes PASS');
  const cdp=await normal.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.reload({waitUntil:'networkidle'});await page.locator('#developNewProduct').click();assert.equal(await page.locator('[data-new-mode]').count(),2);
  for(const [id,value] of [['cCost','30'],['cFee','10'],['cNewPXMargin','40'],['cPrice','105']])await page.locator('#'+id).fill(value);
  assert.equal(await page.locator('#cNewPXOffer').innerText(),'40.00%');report.forceReload='PASS';
  browser=await chromium.launch(options);const incognito=await browser.newContext({viewport:{width:390,height:844}}),fresh=await incognito.newPage();observe(fresh);await fresh.goto(url,{waitUntil:'networkidle'});
  assert.match(await fresh.locator('.meta').innerText(),/VERSION 4\.2\.1/);await fresh.locator('#developNewProduct').click();assert.equal(await fresh.locator('[data-new-mode]').count(),2);assert.equal(await fresh.locator('#cPrice').inputValue(),'');report.incognito='PASS';
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.unexpectedRequests,[]);report.horizontalOverflow=0;report.cacheCoherence='PASS';report.status='PASS';
  fs.writeFileSync(path.join(out,`acceptance-${report.environment.toLowerCase()}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await normal?.close();await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
