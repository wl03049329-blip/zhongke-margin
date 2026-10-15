// HTTPS-only acceptance. All personal fixtures live in an isolated browser profile.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),url='https://wl03049329-blip.github.io/zhongke-margin/index.html',out=process.env.PX_CENTER_EVIDENCE;
assert(out,'explicit external evidence directory required');fs.mkdirSync(out,{recursive:true});
const marker=path.join(out,'profile.json'),before=process.argv.includes('--before'),hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const personal={version:1,favorites:[{id:'px:65010209',note:'發布前保留驗收'}],sets:[{id:'release-check',name:'發布前比較組合',baseId:'px:86210115',ids:[]}],lastBase:'px:65010209',recent:[]};
(async()=>{let context,browser;try{
 const profile=before?path.join(os.tmpdir(),'px-pc-release-'+Date.now()):JSON.parse(fs.readFileSync(marker)).profile;
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',viewport:{width:390,height:844}});
 const page=context.pages()[0]||await context.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(url).origin)external.push(r.url())});
 await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);
 if(before){assert.match(await page.locator('.meta').innerText(),/VERSION 4\.1\.3/);assert.equal(await page.locator('#priceCenter').count(),0);await page.evaluate(p=>localStorage.setItem('px-price-center-personal-v1',JSON.stringify(p)),personal);fs.writeFileSync(marker,JSON.stringify({profile,oldCache:await page.evaluate(()=>caches.keys()),url},null,2));console.log('PASS: genuine production v4.1.3 profile and personal fixtures retained for upgrade');return;}
 await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update()});
 const cache='px-workbench-v4.2.0-price-center';
 await page.waitForFunction(async expected=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'&&(await caches.keys()).length===1&&(await caches.keys())[0]===expected},cache,{timeout:60000});
 await page.reload({waitUntil:'networkidle'});assert.match(await page.locator('.meta').innerText(),/VERSION 4\.2\.0/);
 await page.locator('[data-tab=campaign]').click();assert.deepEqual(await page.evaluate(()=>PXPriceCenter.getPersonal()),personal);
 await page.locator('#pcTab-favorites').click();assert.match(await page.locator('#pcFavorites').innerText(),/發布前保留驗收/);
 await page.locator('[data-pc-rename-set]').click();await page.locator('#pcTextValue').fill('已更名組合');await page.locator('#pcTextForm button[type=submit]').click();assert.match(await page.locator('#pcFavorites').innerText(),/已更名組合/);
 const stable=await page.evaluate(()=>PXPriceCenter.getPersonal());
 await page.locator('[data-pc-import]').click();await page.locator('#pcImportFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":999,"favorites":[],"sets":[]}')});
 await page.waitForFunction(()=>document.getElementById('pcImportStatus').textContent.includes('匯入失敗'));
 assert.match(await page.locator('#pcImportStatus').innerText(),/匯入失敗/);assert.deepEqual(await page.evaluate(()=>PXPriceCenter.getPersonal()),stable);await page.locator('[data-pc-close]').click();
 await page.locator('#pcTab-op').click();await page.locator('#pcSearch').fill('86210115');await page.locator('#pcSearchResults [data-pc-base]').click();
 await page.locator('.pc-tier').nth(1).locator(':scope > summary').click();
 const add=page.locator('#pcRecommendations [data-pc-add]:visible').first();await add.click();await page.locator('[data-pc-save-set]').click();await page.locator('#pcTextValue').fill('發布驗收新組合');await page.locator('#pcTextForm button[type=submit]').click();
 await page.locator('[data-pc-save-set]').click();await page.locator('#pcTextValue').fill('更新後組合');await page.locator('#pcTextForm button[type=submit]').click();assert.equal((await page.evaluate(()=>PXPriceCenter.getPersonal())).sets.length,2);
 // Exercise the existing broken-image handler without an outbound request.
 await page.evaluate(()=>{const parent=document.querySelector('#pcComparison .pc-image'),img=document.createElement('img');parent.append(img);img.dispatchEvent(new Event('error'));});
 assert.match(await page.locator('#pcComparison').innerText(),/圖片無法載入/);
 await page.evaluate(()=>PXPriceCenter.refresh());
 const saved=await page.evaluate(()=>PXPriceCenter.getPersonal()),cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await page.reload({waitUntil:'networkidle'});await page.locator('[data-tab=campaign]').click();assert.deepEqual(await page.evaluate(()=>PXPriceCenter.getPersonal()),saved);
 await page.locator('#pcTab-favorites').click();await page.locator('[data-pc-open-set]').last().click();assert.equal(await page.locator('[data-pc-compare-row]').count(),1);
 const screenshots=[];
 for(const [width,height] of [[390,844],[1366,768]]){await page.setViewportSize({width,height});await page.locator('#priceCenter').evaluate(el=>el.scrollIntoView({block:'start'}));assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);const file=path.join(out,'production-'+width+'.png');await page.screenshot({path:file});screenshots.push(file);}
 const assets=[];
 for(const name of ['index.html','service-worker.js','price-center-core.js','price-center-ui.js','price-center.css','new-product-calculator.js','px-sales-data.js','px-promo-prices.js','competitor-prices.js']){
  const response=await context.request.get(new URL(name,url).href,{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status(),200);const text=await response.text();assert.equal(hash(text),hash(fs.readFileSync(path.join(root,name),'utf8')),name+' matches release');assets.push({name,sha256Normalized:hash(text)});
 }
 for(const name of ['price-center-core.js','price-center-ui.js','price-center.css']){const text=await page.evaluate(async({name,cache})=>(await(await caches.open(cache)).match(new URL(name+'?v=4.2.0',location.href)))?.text(),{name,cache});assert.equal(hash(text),hash(fs.readFileSync(path.join(root,name),'utf8')));}
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const incognito=await browser.newContext({viewport:{width:390,height:844}}),fresh=await incognito.newPage();fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(url,{waitUntil:'networkidle'});await fresh.locator('[data-tab=campaign]').click();assert.equal((await fresh.evaluate(()=>PXPriceCenter.getPersonal())).favorites.length,0);assert.match(await fresh.locator('.meta').innerText(),/VERSION 4\.2\.0/);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const report={status:'PASS',url,version:'4.2.0',oldProfileUpgrade:'PASS',favoritePersistence:'PASS',setEditReopen:'PASS',invalidImportPreservesData:'PASS',imageFallback:'PASS',hardReload:'PASS',incognito:'PASS',cache,assets,overflow:0,consoleErrors:errors,externalRequests:external,screenshots};
 fs.writeFileSync(path.join(out,'https-release-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await context?.close();await browser?.close()}})().catch(e=>{console.error(e);process.exitCode=1});
