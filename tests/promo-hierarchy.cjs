const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const before=execFileSync('git',['show','1c85d24fba6a0e91a622d77a5204d5790b7b4348:index.html'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
for(const expression of [/function model\([^\r\n]+/,/function rows\([^\r\n]+/,/function promoAverage\([^\r\n]+/]){
 assert.equal(current.match(expression)?.[0],before.match(expression)?.[0],`${expression} unchanged`);
}
for(const file of ['px-sales-data.js','px-replacement-data.js','px-promo-prices.json','px-promo-prices.js','px-promo-core.js']){
 assert.equal(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show',`HEAD:${file}`],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n'),`${file} unchanged`);
}

const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/baseline.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(before);return}
 const file=path.join(root,pathname.slice(1)||'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
 res.end(fs.readFileSync(file));
});

async function enterCase(page,type,a,b){
 await page.locator('[data-tab="promo"]').click();
 await page.locator('#pProduct').fill('65010209');
 await page.locator('#promoType').selectOption(type);
 await page.locator('#pA').fill(a);
 if(b!==undefined)await page.locator('#pB').fill(b);
 if(type==='special'&&await page.locator('#pDetail').count())await page.locator('#pDetail>summary').click();
 return{margin:await page.locator('#pMargin').innerText(),rows:await page.locator('#pRows .row .value').allTextContents(),extra:await page.locator('#specialExtra').isVisible()?await page.locator('#specialExtra').innerText():null};
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const baseUrl=`http://127.0.0.1:${server.address().port}`;
 const releaseHeight=await require('./release-layout-baseline.cjs')(browser,`${baseUrl}/index.html`,'promo',page=>enterCase(page,'bogo','99'));
 const baseline=await browser.newPage({viewport:{width:390,height:844}});
 await baseline.goto(`${baseUrl}/baseline.html`,{waitUntil:'networkidle'});
 const old=await enterCase(baseline,'bogo','99');
 const oldHeight=await baseline.locator('#promo').evaluate(element=>Math.round(element.getBoundingClientRect().height));
 const oldHeroTop=await baseline.locator('#pResult').evaluate(element=>Math.round(element.getBoundingClientRect().top+scrollY));
 const baselineHalf=await enterCase(baseline,'half','99');
 const baselineSpecial=await enterCase(baseline,'special','99','149');
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`${baseUrl}/index.html`,{waitUntil:'networkidle'});
 await page.locator('[data-tab="promo"]').click();
 assert.equal(await page.locator('#pA').inputValue(),'','no default campaign price');
 assert.equal(await page.locator('#pEmpty').isVisible(),true,'compact empty state');
 assert.equal(await page.locator('#pResult').isVisible(),false,'no empty hero');
 assert.equal(await page.locator('#pDetail').isVisible(),false,'no empty details');
 assert.match(await page.locator('#pEmpty').innerText(),/輸入活動總價後，即時計算平均單價與中科毛利/);
 for(const input of ['0','-1']){await page.locator('#pA').fill(input);assert.equal(await page.locator('#pResult').isVisible(),false,'invalid campaign price stays empty')}
 await page.locator('#pA').fill('99');
 assert.equal(await page.locator('#pResult').isVisible(),false,'a price without usable product data cannot show a false result');
 assert.match(await page.locator('#pEmpty').innerText(),/請檢查活動價格與商品試算條件/);
 await page.locator('#pA').fill('');
 const currentBogo=await enterCase(page,'bogo','99');
 assert.deepEqual(currentBogo,old,'buy-one-get-one calculations match baseline');
 assert.equal(await page.locator('#pAverage').innerText(),'$49.50');
 assert.match(await page.locator('#pSub').innerText(),/2 件總價 \$99\.00/);
 assert.equal(await page.locator('#pDetail').evaluate(element=>element.open),false,'details collapsed');
 const layout=await page.evaluate(()=>{
  const rect=selector=>{const bounds=document.querySelector(selector).getBoundingClientRect();return{top:Math.round(bounds.top+scrollY),bottom:Math.round(bounds.bottom+scrollY)}};
  return{input:rect('#promo>.card:first-child'),hero:rect('#pResult'),detail:rect('#pDetail'),campaign:rect('#pCampaignInfo .campaign-info'),product:rect('#pProductInfo .px-info-card'),sales:rect('#pSalesPerformance .px-sales-card'),height:Math.round(document.querySelector('#promo').getBoundingClientRect().height)};
 });
 assert.ok(layout.input.bottom<=layout.hero.top&&layout.hero.bottom<=layout.detail.top&&layout.detail.bottom<=layout.campaign.top&&layout.campaign.bottom<=layout.product.top&&layout.product.bottom<=layout.sales.top,'promotion section order');
 assert.ok(layout.hero.top<oldHeroTop,'hero moves ahead of the former product and campaign sections');
 assert.ok(layout.height<=releaseHeight+1,`promotion page height must not increase: ${layout.height} vs release baseline ${releaseHeight}`);
 const product=await page.locator('#pProductInfo .px-info-card').innerText();
 assert.doesNotMatch(product,/成本|全聯毛利率（前毛）/,'no duplicate product data');
 assert.match(product,/庫別[\s\S]*上架率[\s\S]*上架數/);
 assert.match(await page.locator('#pCampaignInfo .campaign-info').innerText(),/檔期售價/);
 assert.deepEqual(await page.locator('#pRows .row span:first-child').allTextContents(),['實際售價（含稅）','未稅售價','公司出貨價（未稅）','公司費用','中科毛利額']);
 assert.deepEqual(await enterCase(page,'half','99'),baselineHalf,'second-item discount calculations match baseline');
 assert.deepEqual(await enterCase(page,'special','99','149'),baselineSpecial,'single and multi-buy calculations match baseline');
 await page.locator('#pB').fill('');
 assert.equal(await page.locator('#specialExtra').isVisible(),false,'missing secondary promotion does not show placeholder figures');
 await page.locator('#pA').fill('');
 assert.equal(await page.locator('#pResult').isVisible(),false,'clearing price removes result');
 assert.equal(await page.locator('#pRows .row').count(),0,'clearing price removes stale details');
 await page.locator('#pA').fill('99');
 let overflow=0;
 for(const [width,height] of [[320,568],[360,800],[375,667],[390,844],[393,852],[430,932],[768,1024],[1280,720]]){
  await page.setViewportSize({width,height});
  overflow=Math.max(overflow,await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)));
 }
 assert.equal(overflow,0);
 assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});
 const preview=path.join(os.tmpdir(),'px-promo-hierarchy-mobile.png');
 await page.locator('#promo').screenshot({path:preview});
 console.log(JSON.stringify({status:'PASS',layout,baselineHeight:releaseHeight,baselineHeroTop:oldHeroTop,heightChange:layout.height-releaseHeight,calculationParity:['bogo','half','special'],overflow,consoleErrors:errors,preview},null,2));
 await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
