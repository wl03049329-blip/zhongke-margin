const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),base='2a33c44c7f9b7375ee7b3b9cdc234792e4a5bce1';
const old=file=>execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n'),read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
for(const file of ['index.html','service-worker.js','px-sales-data.js','px-rsp-data.js','px-product-additions.js','px-product-additions.json','px-promo-prices.js','px-promo-prices.json','px-promo-core.js','px-replacement-data.js','product-catalog.js','px-sales-analysis.js','same-period-sales.js','decision-summary.js','scenario-summary.js','competitor-comparison.js']){
 if(fs.existsSync(path.join(root,file)))assert.equal(read(file),old(file),file+' unchanged');
}
const source=read('new-product-calculator.js');assert.ok(!/PX_RSP_DATA|PX_RSP_REFERENCE|cNewPurchase|data-new-channel/.test(source),'no metadata RSP dependency or retired general-channel controls');
// Test the implementation itself with the exact published model, not a test-only engine.
const model=old('index.html').match(/function model\([^\n]+/)[0];
const compute=source.slice(source.indexOf(' function compute('),source.indexOf(' function targetState('));
const sandbox={};vm.runInNewContext(model+'\n'+compute+'\nthis.compute=compute;this.model=model;',sandbox);
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
let roundtrips=0;
for(const cost of [0.01,30,99999999])for(const front of [0,25.68,26.18,26.68,40,99.9])for(const fee of [0,10,10.95])for(const target of [0,33,40,60]){
 const input={cost,front,fee,target},b=sandbox.compute(input,'B',null).result,a=sandbox.compute(input,'A',b.price).result;
 close(b.price,cost/((1-fee/100-target/100)*(1-front/100))*1.05);close(b.margin,target/100);
 for(const key of Object.keys(a))close(a[key],b[key]);roundtrips++;
}
for(const field of ['cost','front','fee'])assert.equal(sandbox.compute({cost:30,front:40,fee:10,target:40,[field]:null},'A',105).result,null);
assert.equal(sandbox.compute({cost:30,front:40,fee:10,target:null},'B',null).result,null);
close(sandbox.compute({cost:30,front:40,fee:10,target:null},'A',105).result.margin,.4);
for(const input of [{cost:-1,front:40,fee:10,target:40},{cost:30,front:100,fee:10,target:40},{cost:30,front:-1,fee:10,target:40},{cost:30,front:40,fee:-1,target:40},{cost:30,front:40,fee:101,target:40}])assert.equal(sandbox.compute(input,'A',105).result,null);
for(const target of [90,100,-1])assert.equal(sandbox.compute({cost:30,front:40,fee:10,target},'B',null).result,null);
for(const price of [null,0,-1,Infinity,NaN])assert.equal(sandbox.compute({cost:30,front:40,fee:10,target:40},'A',price).result,null);
assert.equal(sandbox.compute({cost:0,front:0,fee:0,target:40},'A',105).result.margin,1);
assert.equal(sandbox.compute({cost:0,front:0,fee:0,target:40},'B',null).result,null);
assert.ok(sandbox.compute({cost:100,front:40,fee:10,target:40},'A',105).result.profit<0);
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html');if(!fs.existsSync(file)){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))});
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=process.env.PX_PREVIEW_URL||`http://127.0.0.1:${server.address().port}/index.html`;
 assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname),'acceptance must remain local');
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const baselineContext=await browser.newContext({serviceWorkers:'block'}),baseline=await baselineContext.newPage();
 for(const file of ['index.html','new-product-calculator.js','new-product-calculator.css'])await baseline.route(`**/${file}*`,route=>route.fulfill({contentType:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css',body:old(file)}));
 const collect=page=>page.evaluate(()=>({copy:buildCalcResultText(),margin:$('cMargin').textContent,rows:$('cRows').innerHTML}));
 await baseline.goto(url,{waitUntil:'networkidle'});await baseline.locator('#cProduct').fill('65010209');await baseline.locator('#cPrice').fill('129');await baseline.locator('#cCost').fill('24.50');
 const original=await collect(baseline);await baselineContext.close();
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('#cProduct').fill('65010209');await page.locator('#cPrice').fill('129');await page.locator('#cCost').fill('24.50');assert.deepEqual(await collect(page),original);
 const master=await page.evaluate(()=>JSON.stringify(PX_Q3_PRODUCTS)),stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('opMarginV3')));
 await page.locator('#developNewProduct').click();assert.equal(await page.locator('[data-new-mode="A"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-new-channel]').count(),0);
 for(const id of ['cProduct','cPrice','cCost','cFee','cNewName','cNewBarcode','cNewPXMargin','cNewCompanyMargin'])assert.equal(await page.locator('#'+id).inputValue(),'');
 for(const id of ['cProductInfo','cSalesPerformance','cProductCostNote'])assert.equal(await page.locator('#'+id).innerText(),'');
 assert.equal(await page.locator('#cNewEmpty').isVisible(),true);assert.equal(await page.locator('#cNewPXResult').isVisible(),false);
 const fill=async values=>{for(const [id,value] of Object.entries(values))await page.locator('#'+id).fill(String(value))};
 await fill({cNewName:'本次新品',cNewBarcode:'測試條碼',cCost:30,cPrice:105,cNewPXMargin:40,cNewCompanyMargin:40});assert.equal(await page.locator('#cNewPXResult').isVisible(),false,'blank fee is not zero');await fill({cFee:10});
 for(const [id,text] of Object.entries({cNewPXOffer:'40.00%',cNewPXRetail:'$105.00',cNewPXPurchase:'$60.00',cNewPXFee:'$6.00',cNewPXProfit:'$24.00',cNewPXCompanyMargin:'40.00%',cNewPXGap:'持平',cNewPXStatus:'達到公司目標',cNewPXFrontProfit:'$40.00'}))assert.equal(await page.locator('#'+id).innerText(),text);
 for(const [price,margin] of [[99,'36.97%'],[105,'40.00%'],[119,'45.88%']]){await fill({cPrice:price});assert.equal(await page.locator('#cNewPXCompanyMargin').innerText(),margin);assert.equal(await page.locator('#cNewPXOffer').innerText(),margin)}
 await page.locator('[data-new-mode="B"]').click();assert.equal(await page.locator('#cNewPXOffer').innerText(),'$105.00');assert.equal(await page.locator('#cPrice').inputValue(),'119');
 await page.locator('[data-new-mode="A"]').click();assert.equal(await page.locator('#cPrice').inputValue(),'119');assert.equal(await page.locator('#cNewPXOffer').innerText(),'45.88%');await fill({cPrice:105});
 await fill({cNewCompareA:99,cNewCompareB:105,cNewCompareC:119});
 for(const [key,price] of [['A',99],['B',105],['C',119]]){const expect=sandbox.model(price,30,.4,.1);assert.equal(await page.locator('#cNewCompareResult'+key+' strong').innerText(),(expect.margin*100).toFixed(2)+'%')}
 await fill({cCost:36});assert.equal(await page.locator('#cNewPXCompanyMargin').innerText(),'30.00%');assert.equal(await page.locator('#cNewCompareResultB strong').innerText(),'30.00%');
 await fill({cNewCompareC:''});assert.equal(await page.locator('#cNewCompareResultC').innerText(),'尚未計算');await fill({cCost:30,cNewCompareC:119});
 assert.equal(await page.locator('#thresholdSettings').isVisible(),false,'draft status uses explicit company target, not the global threshold');
 await page.locator('[data-new-mode="B"]').click();assert.equal(await page.locator('#cNewPXOffer').innerText(),'$105.00');assert.equal(await page.locator('#cPrice').inputValue(),'105');
 await fill({cNewCompanyMargin:50});assert.equal(await page.locator('#cNewPXOffer').innerText(),'$131.25');assert.equal(await page.locator('#cPrice').inputValue(),'105','inverse never overwrites manual RSP');
 await page.locator('[data-new-mode="A"]').click();assert.equal(await page.locator('#cNewPXCompanyMargin').innerText(),'40.00%');assert.equal(await page.locator('#cNewPXGap').innerText(),'-10.00 個百分點');assert.equal(await page.locator('#cNewPXStatus').innerText(),'未達公司目標');assert.equal(await page.locator('#cNewCompareA').inputValue(),'99');
 await fill({cPrice:126});assert.equal(await page.locator('#cNewPXCompanyMargin').innerText(),'48.33%');assert.equal(await page.locator('#cNewPXPurchase').innerText(),'$72.00');assert.equal(await page.locator('#cNewPXFrontProfit').innerText(),'$48.00');
 await fill({cPrice:30});assert.equal(await page.locator('#cNewPXStatus').innerText(),'虧損');assert.equal(await page.locator('#cNewPXStatus').getAttribute('data-tone'),'loss');
 await fill({cNewCompanyMargin:'',cPrice:105});assert.equal(await page.locator('#cNewPXOffer').innerText(),'40.00%');assert.equal(await page.locator('#cNewPXStatus').innerText(),'未設定有效公司目標');
 await page.locator('[data-new-mode="B"]').click();assert.match(await page.locator('#cNewEmpty').innerText(),/尚未計算/);await fill({cNewCompanyMargin:90});assert.match(await page.locator('#cNewEmpty').innerText(),/必須低於 100/);
 await fill({cNewCompanyMargin:40});for(const value of [25.68,26.18,26.68]){await page.locator(`[data-new-px-target="${value}"]`).click();assert.equal(await page.locator('#cNewPXMargin').inputValue(),String(value));assert.equal(await page.locator('[data-new-px-target][aria-pressed=true]').count(),1)}
 await fill({cNewPXMargin:27.12});assert.equal(await page.locator('[data-new-px-target][aria-pressed=true]').count(),0);assert.deepEqual(await page.locator('[data-new-company-target]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.newCompanyTarget))),[33,35,37,38,40,45,50]);
 await fill({cNewPXMargin:40});await page.locator('#copyResult').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),await page.evaluate(()=>buildCalcResultText()));
 const screenshots=[];
 for(const [width,height] of [[320,568],[390,844],[1280,900],[1920,1080]]){await page.setViewportSize({width,height});for(const mode of ['A','B']){await page.locator(`[data-new-mode="${mode}"]`).click();assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);const tops=await page.locator('[data-new-px-target]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));assert.equal(new Set(tops).size,1);if([390,1280].includes(width)){const file=path.join(os.tmpdir(),`px-new-product-2-${mode}-${width}.png`);await page.locator('#calc').screenshot({path:file});screenshots.push(file)}}}
 await page.setViewportSize({width:390,height:844});await page.locator('[data-tab="scenario"]').click();await page.locator('[data-tab="calc"]').click();assert.equal(await page.locator('#cNewPXOffer').innerText(),'$105.00');
 for(const id of ['cProduct','cPrice','cCost','cFee'])assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem('opMarginV3'))[key],id),stored[id],'draft does not pollute persistence');
 await page.locator('.new-product-return').click();await page.locator('#cPrice').focus();assert.deepEqual(await collect(page),original);assert.equal(await page.evaluate(()=>JSON.stringify(PX_Q3_PRODUCTS)),master);assert.equal(await page.locator('#thresholdSettings').isVisible(),true);
 await page.locator('#cProduct').fill('65010647');assert.equal(await page.locator('#cCost').inputValue(),'40.02');
 const others=await page.evaluate(()=>['sPrice','sCost','rCost','pCost'].map(id=>$(id).value));
 await page.locator('#developNewProduct').click();await fill({cCost:30,cPrice:105,cFee:10,cNewPXMargin:40,cNewCompanyMargin:40});await page.locator('#clearCalculation').click();assert.equal(await page.locator('#cPrice').inputValue(),'');assert.equal(await page.locator('#cNewEmpty').isVisible(),true);assert.equal(await page.locator('#cCost').inputValue(),'30');
 assert.deepEqual(await page.evaluate(()=>['sPrice','sCost','rCost','pCost'].map(id=>$(id).value)),others);
 await page.evaluate(()=>selectProduct(productBindings[0],PX_Q3_PRODUCTS.find(p=>p.name==='OP無雙酚A鋁箔1500公分-12入')));assert.equal(await page.locator('#newProductMode').isVisible(),false);assert.equal(await page.locator('#cCost').inputValue(),'40.02');
 await page.locator('#developNewProduct').click();await fill({cNewName:'不持久化',cPrice:123});await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#newProductMode').isVisible(),false);assert.equal(await page.locator('#cNewName').inputValue(),'');assert.equal(await page.locator('#cCost').inputValue(),'40.02');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',roundtrips,boundaries:'PASS',existingBaselineParity:'PASS',commonInputsPreserved:'PASS',comparison:'PASS',copy:'PASS',draftIsolation:'PASS',overflow:0,consoleErrors:errors,screenshots},null,2));
 }finally{await browser?.close();server.close()}})().catch(error=>{console.error(error);process.exitCode=1});
