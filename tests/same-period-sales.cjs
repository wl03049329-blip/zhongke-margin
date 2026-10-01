const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {compare}=require('../same-period-sales.js');
const root=path.resolve(__dirname,'..');
const base='119220d38417397b0cc81a9c1400a310e8084e40';
const baseline=file=>execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
const current=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
for(const file of ['px-sales-data.js','px-replacement-data.js','px-promo-core.js','px-promo-prices.js'])assert.equal(current(file),baseline(file),`${file} unchanged`);
const html=current('index.html'),oldHtml=baseline('index.html');
for(const [start,end] of [['function model(','function rows('],['function calcC(','function calcR('],['function calcP(','function analyzePxSales('],['function analyzePxSales(','function trendChart('],['function trendChart(','function productInfoMarkup('],['function salesMarkup(','function strictSeriesSales(']])assert.equal(html.slice(html.indexOf(start),html.indexOf(end)),oldHtml.slice(oldHtml.indexOf(start),oldHtml.indexOf(end)),`${start} unchanged`);
const reverseFormula=source=>source.match(/function calcR\(\)\{([\s\S]*?);\$\("rRows"\)\.innerHTML=rows\(o\)/)?.[1];
assert.ok(reverseFormula(html));assert.equal(reverseFormula(html),reverseFormula(oldHtml),'reverse formula unchanged');
assert.equal(html.match(/const PX_Q3_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/)[1],oldHtml.match(/const PX_Q3_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/)[1],'product master unchanged');
assert.doesNotMatch(current('same-period-sales.js'),/市場需求強勁|商品很受歡迎|行銷成功|促銷奏效|消費者認同|未來將持續成長|銷售動能強|銷售額/);

const months=Array.from({length:8},(_,index)=>String(index+1).padStart(2,'0'));
const periods=[...months.map(month=>`2025/${month}`),...months.map(month=>`2026/${month}`)];
const full=compare(periods,[100,200,300,400,500,600,700,800,110,220,330,440,550,660,770,880]);
assert.deepEqual(full.months,[1,2,3,4,5,6,7,8]);assert.equal(full.period,'2025/01～08 vs 2026/01～08');assert.equal(full.partial,false);assert.equal(full.previous,3600);assert.equal(full.current,3960);assert.equal(full.difference,360);assert.equal(full.percentage,10);assert.equal(full.yoy,'+10.0%');assert.equal(full.latest,'2026/08');
const zero=compare(['2025/01','2026/01'],[0,10]);assert.equal(zero.previous,0);assert.equal(zero.current,10);assert.equal(zero.percentage,null);assert.equal(zero.yoy,'去年同期為 0，無法計算百分比');
const gap=compare(['2025/01','2025/02','2025/03','2026/01','2026/02','2026/03'],[10,20,30,11,null,33]);assert.deepEqual(gap.months,[1,3]);assert.equal(gap.period,'2025/01、03 vs 2026/01、03');assert.equal(gap.partial,true);assert.equal(gap.previous,40);assert.equal(gap.current,44);assert.equal(gap.difference,4);
const laterLaunch=compare(periods,[null,null,null,40,50,60,70,80,11,22,33,44,55,66,77,88]);assert.deepEqual(laterLaunch.months,[4,5,6,7,8]);assert.equal(laterLaunch.period,'2025/04～08 vs 2026/04～08');assert.equal(laterLaunch.partial,true);
const newProduct=compare(['2025/01','2025/02','2026/01','2026/02'],[null,null,5,0]);assert.equal(newProduct.status,'insufficient');assert.equal(newProduct.previous,null);assert.equal(newProduct.current,null);assert.equal(newProduct.latest,'2026/02');
const oneYear=compare(['2026/01','2026/02'],[10,20]);assert.equal(oneYear.status,'insufficient');
const priorGap=compare(['2025/01','2025/02','2026/01','2026/02'],[null,9,8,null]);assert.equal(priorGap.status,'insufficient');assert.equal(priorGap.previous,null);
const productLatest=compare(['2025/01','2025/02','2026/01','2026/02'],[5,6,7,null]);assert.equal(productLatest.latest,'2026/01');assert.deepEqual(productLatest.months,[1]);assert.equal(productLatest.period,'2025/01 vs 2026/01');
const stable=compare(['2025/01','2026/01'],[7,7]);assert.equal(stable.difference,0);assert.equal(stable.yoy,'0.0%');assert.equal(stable.description,'本期與去年同期銷量持平。');

global.window={};require('../px-sales-data.js');
const real=compare(window.PX_SALES_PERIODS,window.PX_SALES_DATA['OP無雙酚A鋁箔800公分-12入'].sales);
assert.equal(real.period,'2025/01～08 vs 2026/01～08');assert.equal(real.previous,65240);assert.equal(real.current,74431);assert.equal(real.difference,9191);assert.equal(real.yoy,'+14.1%');assert.equal(real.latest,'2026/08');

const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
 await page.locator('#cProduct').fill('65010209');
 const summary=page.locator('#cSalesPerformance .same-period-summary');await summary.waitFor();
 assert.equal(await summary.locator('.same-period-period').innerText(),'比較期間：2025/01～08 vs 2026/01～08');
 assert.equal(await summary.locator('.same-period-previous').innerText(),'65,240 支');assert.equal(await summary.locator('.same-period-current').innerText(),'74,431 支');assert.equal(await summary.locator('.same-period-difference').innerText(),'+9,191 支');assert.equal(await summary.locator('.same-period-yoy').innerText(),'+14.1%');assert.equal(await summary.locator('.same-period-latest').innerText(),'2026/08');
 assert.match(await summary.innerText(),/非即時銷售資料/);
 const trendBefore=await page.locator('#cSalesPerformance .trend-svg').evaluate(element=>element.outerHTML);
 const yoyBefore=await page.locator('#cSalesPerformance .px-metric').filter({hasText:'去年同期 YoY'}).innerText();
 await page.locator('#cCost').fill('24.50');assert.equal(await page.locator('#cSalesPerformance .trend-svg').evaluate(element=>element.outerHTML),trendBefore);assert.equal(await page.locator('#cSalesPerformance .px-metric').filter({hasText:'去年同期 YoY'}).innerText(),yoyBefore);
 await summary.locator('.same-period-copy').click();const copied=await page.evaluate(()=>navigator.clipboard.readText());
 for(const line of ['【PX 同期銷售摘要】','商品：OP無雙酚A鋁箔800公分-12入','比較期間：2025/01～08 vs 2026/01～08','去年同期：65,240 支','今年同期：74,431 支','差異：+9,191 支','同比：+14.1%','最新實銷資料：2026/08','※ 非即時銷售資料'])assert.ok(copied.includes(line),line);assert.doesNotMatch(copied,/僅計入兩年度皆有資料之共同可比月份/);assert.equal(await summary.locator('.same-period-scope-note').isVisible(),false);
 await page.locator('#cProduct').fill('OP環保舒適手套-綠茶香氛S');assert.equal(await summary.locator('.same-period-period').innerText(),'比較期間：2025/03～08 vs 2026/03～08');assert.equal(await summary.locator('.same-period-scope-note').innerText(),'僅計入兩年度皆有資料之共同可比月份');assert.equal(await summary.locator('.same-period-scope-note').isVisible(),true);await summary.locator('.same-period-copy').click();const partialCopy=await page.evaluate(()=>navigator.clipboard.readText());assert.match(partialCopy,/僅計入兩年度皆有資料之共同可比月份/);assert.match(partialCopy,/比較期間：2025\/03～08 vs 2026\/03～08/);
 await page.locator('#cProduct').fill('OP天然棉紗布(3片入)');await page.locator('#cSalesPerformance .same-period-summary').waitFor();assert.equal(await summary.locator('.same-period-period').innerText(),'比較期間：同期資料不足');assert.equal(await summary.locator('.same-period-previous').innerText(),'資料不足');assert.equal(await summary.locator('.same-period-latest').innerText(),'資料不足');assert.doesNotMatch(await summary.innerText(),/65,240|74,431|2026\/08/);await summary.locator('.same-period-copy').click();const missingCopy=await page.evaluate(()=>navigator.clipboard.readText());assert.match(missingCopy,/商品：OP天然棉紗布\(3片入\)/);assert.match(missingCopy,/去年同期：資料不足/);assert.doesNotMatch(missingCopy,/65,240|74,431|Infinity|NaN/);
 await page.locator('#cProduct').fill('OP指尖強化手套-薰衣紫M');assert.equal(await summary.locator('.same-period-latest').innerText(),'2026/08');assert.equal(await summary.locator('.same-period-yoy').innerText(),'去年同期無有效比較基準');assert.equal(await summary.locator('.same-period-current').innerText(),'資料不足');
 await page.locator('[data-tab="scenario"]').click();await page.locator('#sProduct').fill('65010209');const scenarioSummary=page.locator('#sSalesPerformance .same-period-summary');await scenarioSummary.waitFor();assert.equal(await scenarioSummary.locator('.same-period-current').innerText(),'74,431 支');await page.locator('#sPriceA').fill('90');assert.match(await page.locator('#decisionSummary').innerText(),/目前需要注意/);assert.match(await page.locator('#scenarioResults .scenario-final').first().innerText(),/中科毛利率（費用後）/);assert.equal(await scenarioSummary.locator('.same-period-current').innerText(),'74,431 支');
 assert.doesNotMatch(await summary.innerText(),/市場需求強勁|商品很受歡迎|行銷成功|促銷奏效|消費者認同|未來將持續成長|銷售動能強/);
 await page.setViewportSize({width:390,height:844});await scenarioSummary.screenshot({path:path.join(root,'tests/same-period-sales-mobile.png')});await page.locator('[data-tab="calc"]').click();assert.equal(await summary.locator('.same-period-latest').innerText(),'2026/08');
 let maximumOverflow=0;for(const [width,height] of [[320,568],[360,800],[375,667],[390,844],[393,852],[430,932],[768,1024],[820,1180],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[844,390]]){await page.setViewportSize({width,height});const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));assert.equal(overflow,0,`${width}x${height} overflow`);maximumOverflow=Math.max(maximumOverflow,overflow)}
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',realProduct:{previous:real.previous,current:real.current,difference:real.difference,yoy:real.yoy},matchingMonths:'PASS',zeroVsNull:'PASS',partialMonths:'PASS',laterLaunch:'PASS',missingBaseline:'PASS',productSwitch:'PASS',tabSwitch:'PASS',copy:'PASS',freshness:'PASS',trendAndYoYUnchanged:'PASS',marginUnchanged:'PASS',viewports:14,maximumOverflow,consoleErrors:errors,sourceUnchanged:'PASS'},null,2));
 await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
