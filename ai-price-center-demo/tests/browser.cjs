'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.DEMO_PLAYWRIGHT||path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const {createServer}=require('../tools/serve.cjs'),{FILES}=require('../tools/safety.cjs'),root=path.resolve(__dirname,'..');
const artifacts=path.join(root,'artifacts');fs.mkdirSync(artifacts,{recursive:true});
(async()=>{const server=createServer();let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1366,height:768},serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 await page.goto(url,{waitUntil:'networkidle'});
 assert.equal(await page.locator('#welcome').isVisible(),true);assert.equal(await page.locator('#workspace').isVisible(),false);
 // Seed unrelated origin storage: the isolated app must neither read nor clear it.
 await page.evaluate(()=>{localStorage.setItem('unrelated-workspace','KEEP');sessionStorage.setItem('unrelated-session','KEEP');});
 await page.locator('#productSearch').fill('保鮮膜');assert.equal(await page.locator('.search-option').count(),3);
 await page.locator('#productSearch').fill('DEMO-10002');assert.equal(await page.locator('.search-option').count(),1);await page.keyboard.press('Enter');assert.match(await page.locator('#productCard').innerText(),/輕巧保鮮膜/);
 assert.equal(await page.locator('#pkSection').getAttribute('open'),null);assert.equal(await page.locator('#summarySection').getAttribute('open'),null,'normal lookup starts compact');
 await page.locator('#summarySection>summary').click();assert.equal(await page.locator('#summaryItems').isVisible(),true);await page.locator('#summarySection>summary').click();
 await page.locator('#productSearch').fill('查無商品ABC');assert.match(await page.locator('#searchResults').innerText(),/找不到/);await page.keyboard.press('Escape');assert.equal(await page.locator('#searchResults').isVisible(),false);
 await page.locator('#productSearch').fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('#searchResults img').count(),0);await page.keyboard.press('Escape');
 await page.locator('#startDemo').click();assert.match(await page.locator('#productCard').innerText(),/日常保鮮膜/);assert.match(await page.locator('.primary-metric').innerText(),/99\.50/);
 for(const range of [3,6,12]){await page.locator('[data-range="'+range+'"]').click();assert.equal(await page.locator('[data-history-index]').count(),range);assert.equal(await page.locator('.history-row').count(),range);}
 const gap=await page.locator('.average-line').getAttribute('d');assert.equal((gap.match(/M/g)||[]).length,2,'missing month splits line');
 await page.locator('[data-history-index="6"]').click();assert.match(await page.locator('#historyReadout').innerText(),/2026\/05.*尚無示範價格/);
 await page.locator('[data-history-index="11"]').focus();assert.match(await page.locator('#historyReadout').innerText(),/2026\/10.*99\.50/);
 await page.locator('[data-tab="periods"]').click();assert.match(await page.locator('#periodResult').innerText(),/較原檔降低/);assert.match(await page.locator('#periodResult').innerText(),/9\.13%/);
 await page.locator('#compareBasis').selectOption('listed');assert.match(await page.locator('#periodResult').innerText(),/價格持平/);
 await page.locator('[data-quick="demo-scent"]').click();assert.match(await page.locator('#periodResult').innerText(),/比較檔新增收錄/);assert.doesNotMatch(await page.locator('#periodResult .conclusion').innerText(),/\d+\.\d+%/);
 await page.locator('#productSearch').fill('DEMO-20002');await page.keyboard.press('Enter');assert.match(await page.locator('#periodResult').innerText(),/比較檔未收錄/);assert.match(await page.locator('.primary-metric').innerText(),/尚無價格/);
 await page.locator('#startDemo').click();await page.locator('[data-tab="promotion"]').click();
 for(const [type,value,quantity,total,average]of [['SINGLE','99',1,'99.00','99.00'],['BOGO','99',2,'99.00','49.50'],['HALF','99',2,'148.50','74.25'],['BUNDLE','199',3,'199.00','66.33']]){
  await page.locator('#promotionType').selectOption(type);await page.locator('#promotionPrice').fill(value);if(type==='BUNDLE')await page.locator('#bundleQuantity').fill(String(quantity));
  assert.match(await page.locator('.promo-hero>strong').innerText(),new RegExp(average.replace('.','\\.')));assert.ok((await page.locator('.promo-totals').innerText()).includes(total));assert.ok((await page.locator('.promo-totals').innerText()).includes(quantity+' 件'));assert.equal(await page.locator('#promotionResult .calculation-steps li').count(),2);
 }
 await page.locator('#promotionPrice').fill('');assert.match(await page.locator('#promotionResult').innerText(),/尚未計算/);assert.equal(await page.locator('.promo-hero').count(),0);
 await page.locator('#promotionPrice').fill('-5');assert.match(await page.locator('#promotionResult').innerText(),/有效金額/);
 await page.locator('[data-step="pk"]').click();assert.equal(await page.locator('.winner').count(),1);assert.equal(await page.locator('.winner').getAttribute('data-pk-product'),'demo-film-a');
 assert.match(await page.locator('.winner .unit-value').innerText(),/3\.32/);await page.locator('#pkUnit').selectOption('area');assert.match(await page.locator('.winner .unit-value').innerText(),/11\.06/);
 await page.locator('#pkB').selectOption('demo-sponge-a');assert.match(await page.locator('#pkStatus').innerText(),/不能直接比較/);assert.equal(await page.locator('.winner').count(),0);
 await page.locator('#pkC').selectOption('demo-sponge-b');assert.match(await page.locator('#pkStatus').innerText(),/無法公平換算/);assert.equal(await page.locator('.winner').count(),0);
 await page.locator('[data-tab="channels"]').click();assert.equal(await page.locator('.channel-card').count(),2);assert.equal((await page.locator('#channelCards').innerText()).match(/尚無可驗證價格/g).length,2);assert.doesNotMatch(await page.locator('#channelCards').innerText(),/\$\d/);
 await page.locator('[data-step="summary"]').click();assert.equal(await page.locator('#summaryItems .summary-item').count(),3);await page.locator('#summaryItems summary').first().click();assert.match(await page.locator('#summaryItems').innerText(),/109\.50.*99\.50/);
 await page.locator('#resetDemo').click();assert.equal(await page.locator('#workspace').isVisible(),false);assert.equal(await page.locator('#productSearch').inputValue(),'');assert.equal(await page.locator('#demoGuide').isVisible(),false);
 for(const id of ['productCard','historyTable','historyReadout','periodResult','periodCoverage','summaryItems','pkCards','pkStatus','promotionResult','searchResults'])assert.equal(await page.locator('#'+id).textContent(),'','reset clears '+id);
 assert.deepEqual(await page.evaluate(()=>({local:localStorage.getItem('unrelated-workspace'),session:sessionStorage.getItem('unrelated-session')})),{local:'KEEP',session:'KEEP'});
 await page.locator('#startDemo').click();await page.locator('#productSearch').fill('DEMO-10003');await page.keyboard.press('Enter');await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#welcome').isVisible(),true,'no persisted product');
 const screens=[];for(const [width,height]of [[1920,1080],[1366,768],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.locator('#startDemo').click();
  assert.equal(await page.locator('#previousStep').isDisabled(),true);
  if(width>=1366){
   for(const selector of ['.subtitle','.product-meta','.metric>span','.metric small','.demo-guide button','.chart-axis'])assert.ok(await page.locator(selector).first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=16,selector+' projection font');
   assert.ok(await page.locator('.product-title h2').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=22);
  }
  assert.equal(await page.locator('#pkSection').getAttribute('open'),null);assert.equal(await page.locator('#summarySection').getAttribute('open'),null);
  const productBefore=await page.locator('#productCard').innerText();
  assert.match(productBefore,/取得 2 件，共付 \$199\.00/);assert.match(productBefore,/2026\/10 vs 2026\/09/);
  for(const [index,step]of ['search','history','promotion','pk','summary'].entries()){
   if(index)await page.locator('#nextStep').click();
   assert.equal(await page.locator('[aria-current="step"]').getAttribute('data-step'),step);
   assert.equal(await page.locator('#guideProgress').innerText(),(index+1)+' / 5');
   if(step==='history'||step==='promotion')assert.equal(await page.locator('#panel-'+step).isVisible(),true);
   assert.equal(await page.locator('#pkSection').evaluate(e=>e.open),step==='pk');assert.equal(await page.locator('#summarySection').evaluate(e=>e.open),step==='summary');
   const target=step==='search'?'.search-section':step==='pk'?'#pkSection':step==='summary'?'#summarySection':'#panel-'+step;
   const rect=await page.locator(target).boundingBox(),nav=await page.locator('#demoGuide').boundingBox();
   assert.ok(rect.y>=nav.y+nav.height-1&&rect.y<height-60,`${width} ${step} heading visible below sticky navigation: ${JSON.stringify({rect,nav})}`);
   assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0,width+' '+step+' overflow');
   assert.equal(await page.locator('#productCard').innerText(),productBefore,'step navigation retains selected product');
   if(width!==320)await page.screenshot({path:path.join(artifacts,`talk-${width}-${index+1}-${step}.png`)});
  }
  assert.equal(await page.locator('#nextStep').isDisabled(),true);
  for(const step of ['pk','promotion','history','search']){await page.locator('#previousStep').click();assert.equal(await page.locator('[aria-current="step"]').getAttribute('data-step'),step);}
  await page.locator('[data-step="promotion"]').click();await page.locator('#promotionPrice').fill('123');
  await page.locator('[data-step="pk"]').click();await page.locator('#previousStep').click();assert.equal(await page.locator('#promotionPrice').inputValue(),'123','return retains edited promotion');
  await page.locator('#exitGuide').click();assert.equal(await page.locator('#demoGuide').isVisible(),false);assert.equal(await page.locator('#productCard').innerText(),productBefore);
  await page.locator('[data-tab="periods"]').click();assert.equal(await page.locator('#panel-periods').isVisible(),true);
  await page.locator('#resetDemo').click();assert.equal(await page.locator('#workspace').isVisible(),false);
  await page.locator('#startDemo').click();await page.locator('[data-range="12"]').click();
  for(const tab of ['history','periods','promotion','channels']){await page.locator('[data-tab="'+tab+'"]').click();assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0,width+' '+tab+' overflow');}
  await page.locator('[data-step="pk"]').click();assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0,width+' PK overflow');
  await page.locator('[data-tab="history"]').click();await page.locator('[data-step="search"]').click();await page.locator('#productSearch').blur();await page.evaluate(()=>window.scrollTo(0,0));const shot=path.join(artifacts,'demo-'+width+'.png');await page.screenshot({path:shot,fullPage:true});screens.push(shot);await page.screenshot({path:path.join(artifacts,'demo-viewport-'+width+'.png')});
 }
 // Touch devices can inspect a plot value without hover.
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),tp=await touch.newPage();await tp.goto(url);await tp.locator('#startDemo').tap();await tp.locator('[data-range="3"]').tap();await tp.locator('[data-history-index="2"]').tap();assert.match(await tp.locator('#historyReadout').innerText(),/2026\/10/);await touch.close();
 const denied=await context.request.get(url+'/px-sales-data.js');assert.equal(denied.status(),404);assert.equal((await context.request.get(url+'/%2e%2e%2findex.html')).status(),404);
 assert.ok(requests.every(u=>{const p=new URL(u);return p.origin===url&&(FILES.includes(p.pathname.slice(1))||p.pathname==='/');}),'only independent allowlisted assets requested');
 assert.deepEqual(errors,[]);
 // The exhibition package must work directly from disk, with no server or network.
 const offline=await browser.newContext({viewport:{width:1366,height:768},offline:true,serviceWorkers:'block'}),op=await offline.newPage(),offlineErrors=[];op.on('pageerror',e=>offlineErrors.push(e.message));op.on('console',m=>{if(m.type()==='error')offlineErrors.push(m.text());});
 await op.goto(pathToFileURL(path.join(root,'dist/index.html')).href);await op.locator('#startDemo').click();assert.match(await op.locator('.primary-metric').innerText(),/99\.50/);await op.locator('[data-tab="promotion"]').click();assert.match(await op.locator('.promo-hero').innerText(),/99\.50/);assert.deepEqual(offlineErrors,[]);await offline.close();
 console.log(JSON.stringify({status:'PASS',presentation:'all five steps, previous/next, viewport positioning, state retention, free mode, reset PASS',search:'PASS',formulas:'PASS',periodComparison:'PASS',history:'3/6/12 PASS, null gaps retained',pk:'PASS',reset:'PASS',mobileTap:'PASS',offlineFile:'PASS',viewports:'1920/1366/390/320',overflow:0,consoleErrors:0,requests:'allowlist only',screens},null,2));
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
