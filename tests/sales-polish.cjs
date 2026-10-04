const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),core=require('../px-sales-dashboard-core'),explorer=require('../px-sales-explorer-core'),base='8e52af2c5626e2599b871623275d165cd4699aba';
const baseline={module:{exports:{}},require:require('node:module').createRequire(path.join(root,'px-sales-dashboard-core.js'))};
vm.runInNewContext(execFileSync('git',['show',base+':px-sales-dashboard-core.js'],{encoding:'utf8'}),baseline);
global.window={};require('../px-sales-data');
for(const product of Object.values(window.PX_SALES_DATA))for(const condition of [{mode:'same'},{mode:'latest'},{mode:'all'},{mode:'custom',start:'2025/06',end:'2026/08'}]){
 assert.equal(JSON.stringify(core.analyze(window.PX_SALES_PERIODS,product.sales,condition)),JSON.stringify(baseline.module.exports.analyze(window.PX_SALES_PERIODS,product.sales,condition)),'every existing result identical to released 2.0');
}
for(const peak of [0,1,7,21,99,999,10889,82000,100000,987654,12345678]){
 const scale=core.niceTicks(peak),coefficient=scale.step/10**Math.floor(Math.log10(scale.step));
 assert.ok([1,2,5].includes(coefficient));assert.ok(scale.max>=peak);assert.ok(scale.ticks.length>=4&&scale.ticks.length<=5);assert.equal(scale.ticks[0],0);
}
assert.deepEqual(core.niceTicks(82000).ticks,[0,20000,40000,60000,80000]);
const rows=values=>values.map((current,i)=>({period:explorer.shift('2026/01',i),current,previous:null}));
for(const [values,label] of [[[100,100,111],'近期走強'],[[100,100,110],'近期持穩'],[[100,100,90],'近期持穩'],[[100,100,89],'近期轉弱'],[[0,0,0],'近期持穩'],[[0,null,0,1],'近期走強']]){
 assert.equal(core.recentTrend(rows(values)).label,label);
}
assert.equal(core.recentTrend(rows([1,null,2])),null);
const gap=core.paths(rows([10,20,null,0,15]),620,320);
assert.equal((gap.current.match(/M/g)||[]).length,2);assert.equal((gap.area.match(/M/g)||[]).length,2);assert.ok(gap.current.includes(gap.y(0).toFixed(2)),'true zero plotted');
assert.equal(core.conciseSummary(core.analyze(['2026/01'],[1]),null).length,1);
console.log('PASS 2.1 unit: all released calculations unchanged; nice ticks; trend ±10 boundaries; true zero; gaps; short summary');
if(process.argv.includes('--unit'))process.exit(0);
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f))});
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const url=process.env.PX_LIVE||'http://127.0.0.1:'+server.address().port+'/index.html',foil='OP無雙酚A鋁箔800公分-12入',months=Array.from({length:36},(_,i)=>explorer.shift('2024/01',i)),errors=[],screenshots=[];
 const cases=[
  {name:'positive',values:months.map((_,i)=>i<24?100:120),chip:'近期持穩'},
  {name:'negative',values:months.map((_,i)=>i<24?100:80),chip:'近期持穩'},
  {name:'zero-baseline',values:months.map((_,i)=>i<24?0:120),chip:'近期持穩'},
  {name:'gaps-zero-latest',values:months.map((_,i)=>i===35?null:i===29?null:i===34?0:100),chip:'近期轉弱'},
  {name:'two-months',values:months.map((_,i)=>i<34?null:100),chip:null},
  {name:'no-data',values:months.map(()=>null),chip:null}
 ];
 for(const item of cases){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('**/px-sales-data.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.PX_SALES_PERIODS='+JSON.stringify(months)+';window.PX_SALES_DATA={...window.PX_SALES_DATA,['+JSON.stringify(foil)+']:{...window.PX_SALES_DATA['+JSON.stringify(foil)+'],sales:'+JSON.stringify(item.values)+'}};'})});
  await page.goto(url,{waitUntil:'networkidle'});await page.locator('#cProduct').fill('65010209');
  const card=page.locator('#cSalesPerformance .sales2');
  assert.equal(await card.locator('.sales2-daily').count(),0);
  const latest=item.values.findLastIndex(core.valid);
  assert.equal(await card.locator('.sales2-latest-value').innerText(),latest<0?'資料不足':new Intl.NumberFormat('zh-TW').format(item.values[latest]));
  assert.equal(await card.locator('.sales2-latest').innerText(),latest<0?'資料不足':months[latest]);
  if(item.chip)assert.equal(await card.locator('.sales2-trend-chip').innerText(),item.chip);else assert.equal(await card.locator('.sales2-trend-chip').count(),0);
  assert.doesNotMatch(await card.innerText(),/Infinity|NaN|日均銷量/);
  if(latest>=0){
   assert.equal(await card.locator('.sales2-latest-label').count(),1);assert.equal(await card.locator('.sales2-latest-label').getAttribute('data-latest-period'),months[latest]);
   assert.equal(await card.locator('.sales2-reference-line').count(),item.chip?1:0);
   assert.match(await card.locator('.sales2-legend').innerText(),/實線 — 本期/);
   await card.locator('.sales2-hit').last().tap();assert.equal(await card.locator('.sales2-tooltip').isVisible(),true);
   assert.match(await card.locator('.sales2-tooltip-date').innerText(),/^2026\//);
   const tb=await card.locator('.sales2-tooltip').boundingBox();assert.ok(tb.x>=0&&tb.x+tb.width<=390);
   assert.equal(await card.locator('.sales2-chart').evaluate(e=>e.getBoundingClientRect().height),260);
  }
  if(item.name==='gaps-zero-latest'){
   assert.equal((await card.locator('[data-series="current"]').getAttribute('d')).match(/M/g).length,2);
   assert.equal(await card.locator('.sales2-latest-label text').textContent(),'0');
   assert.match(await card.locator('.sales2-average-note').innerText(),/近 3 月平均/);
  }
  if(item.name==='positive'){
   await card.locator('.sales2-period').selectOption('all');assert.equal(await card.locator('.sales2-hit').count(),36);
   for(const width of [390,1280]){
    await page.setViewportSize({width,height:844});await page.waitForTimeout(100);
    assert.equal(await card.locator('.sales2-chart').evaluate(e=>e.getBoundingClientRect().height),width===390?260:320);
    const labelBox=await card.locator('.sales2-latest-label').boundingBox();assert.ok(labelBox.x>=0&&labelBox.x+labelBox.width<=width);
    assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);
    const file=path.join(os.tmpdir(),'px-sales21-36months-'+width+'.png');await card.screenshot({path:file});screenshots.push(file);
   }
   const xLabels=await card.locator('.sales2-x-tick').allTextContents();assert.ok(xLabels.includes('2025/01')&&xLabels.includes('2026/01'));assert.ok(xLabels.some(t=>/^\d{2}$/.test(t)));
   assert.equal(await card.locator('.sales2-point.current').count(),36);
   await card.locator('.sales2-period').selectOption('same');
   const search=card.locator('.sales2-search-input');await search.fill('OP');assert.equal(await card.locator('[data-sales-product]').count(),6);assert.match(await card.locator('.sales2-search-more').innerText(),/另有 \d+ 支符合/);
   await search.fill('65010209');assert.equal(await card.locator('[data-sales-product]').first().getAttribute('data-sales-product'),foil);
   await search.fill('4710660884433');assert.equal(await card.locator('[data-sales-product]').first().getAttribute('data-sales-product'),foil);
  }
  assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',cases:cases.map(c=>c.name),niceTicks:'PASS',latestLabel:'PASS',legend:'PASS',tooltipTap:'PASS',reference:'PASS',trendChip:'PASS',searchLimitAndExact:'PASS',dataPoints36:'PASS',overflow:0,consoleErrors:0,screenshots},null,2));
 }finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
