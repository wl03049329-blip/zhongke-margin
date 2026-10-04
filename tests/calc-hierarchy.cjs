const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
 res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const baselineHeight=await require('./release-layout-baseline.cjs')(browser,`http://127.0.0.1:${server.address().port}/index.html`,'calc',page=>page.evaluate(()=>{PXPromo.today=()=> '2026-10-01';renderProductInsights(productBindings[0])}));
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
 await page.locator('#cProduct').fill('65010209');
 await page.evaluate(()=>{PXPromo.today=()=> '2026-10-01';renderProductInsights(productBindings[0])});
 const layout=await page.evaluate(()=>{
  const rect=selector=>{const element=document.querySelector(selector);if(!element)return null;const bounds=element.getBoundingClientRect();return{top:Math.round(bounds.top+scrollY),bottom:Math.round(bounds.bottom+scrollY),height:Math.round(bounds.height)}};
  return{input:rect('#calc>.card:first-child'),hero:rect('#cResult'),threshold:rect('#thresholdSettings'),detail:rect('#cDetail'),product:rect('#cProductInfo .px-info-card'),campaign:rect('#cProductInfo .campaign-info'),sales:rect('#cSalesPerformance .px-sales-card'),calcHeight:Math.round(document.querySelector('#calc').getBoundingClientRect().height),overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
 });
 if(process.argv.includes('--baseline')){console.log(JSON.stringify({baseline:layout,errors},null,2));await browser.close();server.close();return}
 assert.ok(layout.input.bottom<=layout.hero.top&&layout.hero.bottom<=layout.threshold.top&&layout.threshold.bottom<=layout.detail.top&&layout.detail.bottom<=layout.product.top&&layout.product.bottom<=layout.campaign.top&&layout.campaign.bottom<=layout.sales.top,'mobile section order');
 assert.ok(layout.hero.top<679,'hero moves above the prior 390px position');
 assert.equal(await page.locator('#thresholdSettings').evaluate(element=>element.previousElementSibling?.id),'cResult','threshold is immediately below hero');
 assert.ok(layout.hero.top<844,'margin result enters the first 390px viewport');
 assert.ok(layout.calcHeight-layout.sales.height<=baselineHeight.nonSalesHeight+1,'calculator content outside the upgraded sales section must not increase');
 const actions=await page.evaluate(()=>{const copy=document.querySelector('#copyResult'),clear=document.querySelector('#clearCalculation');return{copyWidth:copy.getBoundingClientRect().width,clearWidth:clear.getBoundingClientRect().width,copyHeight:copy.getBoundingClientRect().height,clearBackground:getComputedStyle(clear).backgroundColor,copyBackground:getComputedStyle(copy).backgroundColor}});
 assert.ok(actions.copyWidth>actions.clearWidth*2&&actions.clearWidth<120,'copy is primary and clear is compact');
 assert.ok(actions.copyHeight>=40&&actions.copyBackground!==actions.clearBackground,'copy remains a visible primary action');
 assert.equal(await page.locator('#cDetail').evaluate(element=>element.open),false,'details are collapsed initially');
 await page.locator('#cDetail>summary').click();
 const detailLabels=await page.locator('#cRows .row span:first-child').allTextContents();
 assert.deepEqual(detailLabels,['實際售價（含稅）','未稅售價','公司出貨價（未稅）','公司費用','中科毛利額']);
 assert.equal(await page.locator('#cProfit').innerText(),await page.locator('#cRows .row:last-child .value').innerText(),'hero profit mirrors existing model result');
 await page.locator('#cPrice').fill('129');await page.locator('#cCost').fill('24.50');
 assert.equal(await page.locator('#cProfit').innerText(),await page.locator('#cRows .row:last-child .value').innerText(),'hero profit follows price and cost edits');
 assert.equal(await page.locator('#cPx').innerText(),'26.18%','front margin remains visible in the input area');
 assert.match(await page.evaluate(()=>buildCalcResultText()),/成本：\$24\.50[\s\S]*中科毛利率（費用後）：/,'existing copy content remains linked to current inputs');
 assert.equal(await page.locator('#cProductInfo .px-info-card .px-metric').count(),3);
 assert.doesNotMatch(await page.locator('#cProductInfo .px-info-card').innerText(),/成本|全聯毛利率（前毛）/);
 assert.match(await page.locator('#cProductInfo .px-info-card').innerText(),/庫別|上架率|上架數/);
 assert.match(await page.locator('#cProductInfo .campaign-preview').innerText(),/下一檔\s*10-1[\s\S]*2026\/10\/02 ～ 2026\/10\/15[\s\S]*促銷型態\s*IP・單特／二特[\s\S]*最低均價\s*\$69\.5／件/);
 assert.equal(await page.locator('#cProductInfo .campaign-history').evaluate(element=>element.open),false);
 await page.locator('#cProductInfo .campaign-history>summary').click();
 assert.ok(await page.locator('#cProductInfo .campaign-history .campaign-period').count()>=4,'full history remains available');
 await page.locator('#cProductInfo .campaign-history>summary').click();
 await page.locator('#cDetail>summary').click();
 await page.locator('[data-tab="reverse"]').click();await page.locator('#rProduct').fill('65010209');
 assert.doesNotMatch(await page.locator('#rProductInfo .px-info-card').innerText(),/成本|全聯毛利率（前毛）/,'reverse page removes only its duplicated product metrics');
 await page.locator('[data-tab="scenario"]').click();await page.locator('#sProduct').fill('65010209');assert.match(await page.locator('#sProductInfo .px-info-card').innerText(),/成本[\s\S]*全聯毛利率（前毛）/,'scenario tab retains its product details');
 await page.locator('[data-tab="calc"]').click();
 const viewports=[[320,568],[360,800],[375,667],[390,844],[430,932],[768,1024],[1280,720]];
 for(const [width,height] of viewports){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0,`${width}px overflow`)}
 await page.setViewportSize({width:390,height:844});
 const preview=path.join(os.tmpdir(),'px-calc-hierarchy-mobile.png');await page.screenshot({path:preview});
 await page.locator('#clearCalculation').click();
 assert.equal(await page.locator('#cPrice').inputValue(),'','clear action still clears this calculation');
 assert.equal(await page.locator('#cCost').inputValue(),'24.50','clear action keeps cost');
 assert.equal(await page.locator('#cProduct').inputValue(),'OP無雙酚A鋁箔800公分-12入','clear action keeps selected product');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',layout,actions,detailLabels,heroProfit:'synced',campaignHistory:'available',clearAction:'PASS',viewports,maximumOverflow:0,consoleErrors:errors,preview},null,2));await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
