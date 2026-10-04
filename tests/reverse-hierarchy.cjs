const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const before=execFileSync('git',['show','HEAD:index.html'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
const formula=html=>html.match(/function calcR\(\)\{([\s\S]*?);\$\("rRows"\)\.innerHTML=rows\(o\)/)?.[1];
assert.ok(formula(current),'reverse formula is present');
assert.equal(formula(current),formula(before),'reverse formula and back-substitution are unchanged');
assert.equal(current.match(/function model\([^\r\n]+/)[0],before.match(/function model\([^\r\n]+/)[0],'shared margin model is unchanged');
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
 res.end(fs.readFileSync(file));
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const baselineHeight=await require('./release-layout-baseline.cjs')(browser,`http://127.0.0.1:${server.address().port}/index.html`,'reverse');
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
 await page.locator('[data-tab="reverse"]').click();
 await page.locator('#rProduct').fill('65010209');
 const layout=await page.evaluate(()=>{
  const rect=selector=>{const bounds=document.querySelector(selector).getBoundingClientRect();return{top:Math.round(bounds.top+scrollY),bottom:Math.round(bounds.bottom+scrollY),height:Math.round(bounds.height)}};
  return{input:rect('#reverse>.card:first-child'),hero:rect('#rResult'),detail:rect('#rDetail'),product:rect('#rProductInfo .px-info-card'),campaign:rect('#rProductInfo .campaign-info'),sales:rect('#rSalesPerformance .px-sales-card'),sectionHeight:Math.round(document.querySelector('#reverse').getBoundingClientRect().height)};
 });
 assert.ok(layout.input.bottom<=layout.hero.top&&layout.hero.bottom<=layout.detail.top&&layout.detail.bottom<=layout.product.top&&layout.product.bottom<=layout.campaign.top&&layout.campaign.bottom<=layout.sales.top,'reverse order');
 assert.ok(layout.hero.top<844&&layout.hero.top<1727,'hero moves into the first 390px viewport');
 assert.ok(layout.sectionHeight-layout.sales.height-layout.product.height<=baselineHeight.nonSalesHeight+1,'reverse content outside the upgraded sales/basic-info sections must not increase');
 assert.equal(await page.locator('#rDetail').evaluate(element=>element.open),false,'detail begins collapsed');
 assert.equal(await page.locator('#rPrice').innerText(),'66.37 元');
 assert.equal(await page.locator('#rSub').innerText(),'代回驗證：35.00%');
 assert.equal(await page.locator('#rStatus').innerText(),'目標 35%');
 assert.ok(!(await page.locator('#rResult').getAttribute('class')).includes('warn'),'hero does not imply a failed reverse calculation');
 const productInfo=await page.locator('#rProductInfo .px-info-card').innerText();
 assert.doesNotMatch(productInfo,/成本|全聯毛利率（前毛）/);
 assert.match(productInfo,/庫別[\s\S]*上架率[\s\S]*上架數/);
 assert.match(await page.locator('#rProductInfo .campaign-info').innerText(),/檔期售價/);
 await page.locator('#rDetail>summary').click();
 assert.deepEqual(await page.locator('#rRows .row span:first-child').allTextContents(),['實際售價（含稅）','未稅售價','公司出貨價（未稅）','公司費用','中科毛利額']);
 await page.locator('#rDetail>summary').click();
 for(const target of [32,35,38,40,45,50]){
  await page.locator(`.quick [data-r="${target}"]`).click();
  assert.equal(await page.locator('#rTarget').inputValue(),String(target));
  assert.equal(await page.locator('#rStatus').innerText(),`目標 ${target}%`);
  assert.equal(await page.locator('.quick [data-r].primary').count(),1);
  const expected=25.22/((1-.1095-target/100)*(1-.2618))*1.05;
  assert.equal(await page.locator('#rPrice').innerText(),`${expected.toFixed(2)} 元`,'quick target uses the existing reverse formula');
  assert.equal(await page.locator('#rSub').innerText(),`代回驗證：${target.toFixed(2)}%`);
 }
 await page.locator('#rTarget').fill('42');
 assert.equal(await page.locator('#rStatus').innerText(),'目標 42%');
 assert.equal(await page.locator('.quick [data-r].primary').count(),0);
 await page.locator('#rTarget').fill('35');
 await page.locator('[data-tab="calc"]').click();
 await page.locator('#thresholdSettings').evaluate(element=>{element.open=true});
 await page.locator('#excellentMargin').fill('50');
 await page.locator('#targetMargin').fill('45');
 await page.locator('[data-tab="reverse"]').click();
 assert.equal(await page.locator('#rStatus').innerText(),'目標 35%','reverse badge describes its input, not the global threshold');
 assert.equal(await page.locator('#rPrice').innerText(),'66.37 元','global threshold cannot change the reverse formula');
 await page.locator('#rTarget').fill('99');
 assert.equal(await page.locator('#rPrice').innerText(),'無法計算');
 assert.equal(await page.locator('#rStatus').innerText(),'請檢查輸入','invalid reverse inputs cannot show an achievement badge');
 await page.locator('#rTarget').fill('35');
 await page.locator('#rProduct').fill('65010240');
 assert.equal(await page.locator('#rCost').inputValue(),'23.60');
 assert.notEqual(await page.locator('#rPrice').innerText(),'66.37 元','product switch refreshes result');
 await page.locator('#rProduct').fill('香氛豆-粉紅甜蜜果香淡香水');
 assert.equal(await page.locator('#rCost').inputValue(),'31.80');
 assert.equal(await page.locator('#rPx').innerText(),'25.18%');
 assert.equal(await page.locator('#rFee').inputValue(),'10.95');
 assert.equal(await page.locator('#rPrice').innerText(),'82.57 元');
 assert.equal(await page.locator('#rSub').innerText(),'代回驗證：35.00%');
 assert.deepEqual(await page.locator('#rRows .row .value').allTextContents(),['82.57 元','78.63 元','58.83 元','6.44 元','20.59 元'],'fixed fragrance case retains every reverse-price result');
 let maximumOverflow=0;
 for(const [width,height] of [[320,568],[360,800],[375,667],[390,844],[393,852],[430,932],[768,1024],[1280,720]]){
  await page.setViewportSize({width,height});
  maximumOverflow=Math.max(maximumOverflow,await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)));
 }
 assert.equal(maximumOverflow,0);
 assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});
 const preview=path.join(os.tmpdir(),'px-reverse-hierarchy-mobile.png');
 await page.locator('#reverse').screenshot({path:preview});
 console.log(JSON.stringify({status:'PASS',layout,baselineHeight,formulaUnchanged:true,quickTargets:'PASS',fragranceCase:['82.57','78.63','58.83','6.44','20.59','35.00%'],badge:'input target',maximumOverflow,consoleErrors:errors,preview},null,2));
 await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
