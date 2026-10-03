const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),os=require('node:os');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const {execFileSync}=require('node:child_process');
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');if(!fs.existsSync(file)){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 // Compare with the latest published structure, not the pre-sales-analysis page height.
 const baselineContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),baselinePage=await baselineContext.newPage(),baselineFiles=new Map();
 await baselinePage.route('**/*',route=>{const filename=decodeURIComponent(new URL(route.request().url()).pathname).slice(1)||'index.html';try{if(!baselineFiles.has(filename))baselineFiles.set(filename,execFileSync('git',['show','61952fed48a4b86723323865821590066ac14093:'+filename],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));return route.fulfill({contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(filename)]||'application/octet-stream',body:baselineFiles.get(filename)})}catch{return route.fulfill({status:404,body:''})}});
 await baselinePage.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});await baselinePage.locator('[data-tab="scenario"]').click();for(const [id,value] of [['sProduct','65010209'],['sPriceA','62'],['sPrice','77'],['sPriceC','90']])await baselinePage.locator('#'+id).fill(value);
 const publishedHeight=await baselinePage.locator('#scenario').evaluate(el=>Math.round(el.getBoundingClientRect().height));await baselineContext.close();
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
 await page.locator('[data-tab="scenario"]').click();await page.locator('#sProduct').fill('65010209');await page.locator('#sPriceA').fill('62');await page.locator('#sPrice').fill('77');await page.locator('#sPriceC').fill('90');
 const layout=await page.evaluate(()=>{const rect=selector=>{const element=document.querySelector(selector);if(!element)return null;const bounds=element.getBoundingClientRect();return{top:Math.round(bounds.top+scrollY),bottom:Math.round(bounds.bottom+scrollY),height:Math.round(bounds.height)}};return{input:rect('#scenario>.card:first-child'),comparison:rect('#scenarioSummary'),decision:rect('#decisionSummary'),cards:rect('#scenarioResults'),product:rect('#sProductInfo .px-info-card'),campaign:rect('#sProductInfo .campaign-info'),sales:rect('#sSalesPerformance .px-sales-card'),cardHeight:rect('#scenarioResults .scenario-card')?.height,sectionHeight:Math.round(document.querySelector('#scenario').getBoundingClientRect().height),overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}});
 if(process.argv.includes('--baseline')){console.log(JSON.stringify({baseline:layout,errors},null,2));await browser.close();server.close();return}
 assert.ok(layout.input.bottom<=layout.comparison.top&&layout.comparison.bottom<=layout.decision.top&&layout.decision.bottom<=layout.cards.top&&layout.cards.bottom<=layout.product.top&&layout.product.bottom<=layout.campaign.top&&layout.campaign.bottom<=layout.sales.top,'scenario section order');
 assert.ok(layout.comparison.top<3109&&layout.comparison.top<844,'comparison summary is substantially earlier and enters the first viewport');
 assert.ok(layout.cardHeight<223&&layout.sectionHeight<=publishedHeight,'compact detail cards and no height regression from published baseline');
 const comparison=await page.locator('#scenarioSummary').innerText();
 for(const text of ['A 現況','B 方案','C 方案','較 A','目前設定中科毛利門檻','已達門檻','尚未達門檻'])assert.ok(comparison.includes(text),text);
 assert.equal(await page.locator('#scenarioSummary .scenario-summary-more').evaluate(element=>element.open),false,'secondary price differences begin collapsed');
 await page.locator('#scenarioSummary .scenario-summary-more>summary').click();assert.match(await page.locator('#scenarioSummaryDetails').innerText(),/售價較 A/);
 await page.locator('#scenarioSummary .scenario-summary-more>summary').click();
 const decision=await page.locator('#decisionSummary').innerText();
 assert.match(decision,/目前需要注意[\s\S]*可進一步確認/);
 assert.doesNotMatch(decision,/\d+(?:\.\d+)?%|個百分點|B vs A|C vs A|全聯毛利率/,'decision card does not duplicate numerical comparison');
 for(const card of await page.locator('#scenarioResults .scenario-card').all()){
  assert.deepEqual(await card.locator('.scenario-metric span').allTextContents(),['售價','商品成本','全聯毛利率（前毛）','中科毛利率（費用後）','中科毛利額']);
  assert.doesNotMatch(await card.innerText(),/費用後結果/);
 }
 let maxOverflow=0;for(const [width,height] of [[320,568],[360,800],[375,667],[390,844],[393,852],[430,932],[768,1024],[1280,720]]){await page.setViewportSize({width,height});maxOverflow=Math.max(maxOverflow,await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)))}
 assert.equal(maxOverflow,0);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));const preview=path.join(os.tmpdir(),'px-scenario-hierarchy-mobile.png');await page.screenshot({path:preview});
 console.log(JSON.stringify({status:'PASS',layout,maximumOverflow:maxOverflow,consoleErrors:errors,preview},null,2));await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
