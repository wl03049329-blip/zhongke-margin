const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),core=require('../px-sales-explorer-core'),view=require('../px-sales-multi-view'),dashboard=require('../px-sales-dashboard-core'),base='0732f07e25e15f40ada10023c11b4ee11dd68c95';
for(const f of ['px-sales-data.js','px-sales-analysis.js','same-period-sales.js','px-sales-explorer-core.js','px-sales-dashboard-core.js','px-promo-core.js','px-promo-ui.js','px-promo-prices.js','px-replacement-data.js','new-product-calculator.js','new-product-organizer.js','scenario-summary.js','decision-summary.js','product-catalog.js','assets/brand/px-logo.svg']){
 assert.equal(fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show',base+':'+f],{encoding:'utf8'}).replace(/\r\n/g,'\n'),f+' unchanged');
}
const inline=s=>[...require('./rsp-inline-integrity.cjs').withoutRsp(s).replace(/\r\n/g,'\n').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n').replace(/service-worker\.js\?v=[^"']+/g,'service-worker.js?VERSION');
assert.equal(inline(fs.readFileSync(path.join(root,'index.html'),'utf8')),inline(execFileSync('git',['show',base+':index.html'],{encoding:'utf8'})),'inline core formulas unchanged');
const months=Array.from({length:24},(_,i)=>core.shift('2025/01',i)),series=(prior,current)=>months.map((_,i)=>i<12?prior:current),data={A:{sales:series(10,20)},B:{sales:series(20,10)},C:{sales:series(0,0)},D:{sales:series(10,30)},E:{sales:series(10,20)}},ranges=core.preset('2026/12','ytd');
data.D.sales[15]=null;
let rows=core.multi(months,data,['A','B','C','D','E'],ranges),p=view.describe(rows);
assert.equal(p.volume.value,330);assert.deepEqual(p.growth.names,['A','E']);assert.deepEqual(p.weak.names,['B']);assert.equal(p.weak.value,-50);assert.equal(p.growth.value,100);assert.equal(p.difference.partial,true);
assert.equal(view.rate(rows.find(r=>r.name==='C').comparison),'基準為 0');assert.equal(view.units(null),'資料不足');assert.equal(view.units(0),'0 支');
const positive=core.multi(months,data,['A','E'],ranges);assert.equal(view.describe(positive).weakLabel,'成長較低');assert.match(view.describe(positive).summary[1],/並列/);
const insufficient=core.multi(months,data,['C','D'],ranges);assert.equal(view.describe(insufficient).growth.value,null);assert.match(view.copyText(rows,p,'銷量最高'),/A 11\/12[\s\S]*部分月份資料不足/);assert.doesNotMatch(view.copyText(rows,p,'銷量最高'),/Infinity|NaN|缺貨|促銷成功|預測/);
const earlier={...data,E:{sales:data.E.sales.map((v,i)=>i===23?null:v)}};assert.equal(core.multi(months,earlier,['A','E'],ranges).find(r=>r.name==='E').latest.latestMonth,'2026/11');
const unequal=core.multi(months,data,['A','B'],{...ranges,bEnd:'2025/11'});assert.equal(view.describe(unequal).yearly,false);assert.match(view.copyText(unequal,view.describe(unequal),'銷量最高'),/期間差異（非同期）/);
const before=JSON.stringify(data);for(const sort of ['total','growth','difference']){const sorted=core.multi(months,data,['A','B','C','D','E'],ranges,sort);assert.deepEqual(view.describe(sorted),p,'KPI remains independent of sort')}assert.equal(JSON.stringify(data),before);
console.log('PASS multi read-only presentation: existing formulas, tie/partial/zero/freshness, labels and copy');
if(process.argv.includes('--unit'))process.exit(0);
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f))});
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write'],hasTouch:true}),page=await context.newPage(),errors=[],screenshots=[],url=process.env.PX_LIVE||'http://127.0.0.1:'+server.address().port+'/index.html';
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(url,{waitUntil:'networkidle'});await page.locator('#cProduct').fill('65010209');
 const card=page.locator('#cSalesPerformance .sales2'),pane=card.locator('.sales22-multi-pane'),search=pane.locator('.sales-multi-search');
 assert.equal(await card.locator('[data-sales-mode="single"]').getAttribute('aria-pressed'),'true');
 await card.locator('[data-sales-mode="single"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await pane.isVisible(),true);assert.equal(await card.locator('.sales22-single-pane').isVisible(),false);
 assert.equal(await card.locator('.sales-multi>summary').count(),0,'no duplicate old advanced entry');assert.equal(await pane.locator('.sales22-custom').isVisible(),false);assert.equal(await pane.locator('.sales-multi-copy').isDisabled(),true);
 assert.match(await pane.locator('.sales-selection-status').innerText(),/已選 1 \/ 5/);
 for(const q of ['鋁箔','ＯＰ－無雙酚Ａ鋁箔 1500公分－12入','65010647','4710660886567']){await search.fill(q);assert.equal(await pane.locator('[data-add]').first().getAttribute('data-add'),'OP無雙酚A鋁箔1500公分-12入')}
 await search.fill('OP');assert.equal(await pane.locator('[data-add]').count(),6);assert.match(await pane.locator('.sales-search-results').innerText(),/另有 \d+ 支符合/);
 await search.fill('65010647');await search.press('ArrowDown');await search.press('Enter');
 assert.equal(await pane.locator('.sales-multi-copy').isEnabled(),true);assert.equal(await pane.locator('.sales22-kpis article').count(),4);assert.equal(await pane.locator('.sales22-volume article').count(),2);
 const names=['OP無雙酚A鋁箔800公分-12入','OP無雙酚A鋁箔1500公分-12入','OP生物分解抗菌密封袋XL','OP細柔無砂海綿菜瓜布','OP抗菌木漿棉'];
 for(const code of ['65013454','65020125','65020116']){await search.fill(code);await pane.locator('[data-add]').first().click()}
 assert.match(await pane.locator('.sales-selection-status').innerText(),/已選 5 \/ 5/);await search.fill('手套');assert.match(await pane.locator('.sales-search-results').innerText(),/已選滿 5/);await search.press('Escape');await search.fill('');
 const fixedKpi=await pane.locator('.sales22-kpis').innerText();
 for(const sort of ['total','growth','difference']){
  await pane.locator('.sales-sort').selectOption(sort);
  const actual=await pane.locator('tbody tr').evaluateAll(nodes=>nodes.map(n=>n.dataset.product)),expected=await page.evaluate(({names,sort})=>PX_SALES_EXPLORER.multi(PX_SALES_PERIODS,PX_SALES_DATA,names,PX_SALES_EXPLORER.preset('2026/08','ytd'),sort).map(r=>r.name),{names,sort});assert.deepEqual(actual,expected);
  assert.equal(await pane.locator('.sales22-kpis').innerText(),fixedKpi);assert.deepEqual(await pane.locator('[data-volume-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.volumeProduct)),expected);
  assert.deepEqual(await pane.locator('tbody tr td:first-child').allTextContents(),['1','2','3','4','5']);
 }
 for(const [preset,start,total] of [['three','2026/06','26,951 支'],['six','2026/03','53,509 支'],['ytd','2026/01','74,431 支']]){
  await pane.locator('[data-multi-preset="'+preset+'"]').click();assert.equal(await pane.locator('[data-range="aStart"]').inputValue(),start.replace('/','-'));
  const actual=await pane.locator('tbody tr[data-product="'+names[0]+'"] td').nth(2).innerText(),expected=await page.evaluate(({name,preset})=>PX_SALES_EXPLORER.multi(PX_SALES_PERIODS,PX_SALES_DATA,[name],PX_SALES_EXPLORER.preset('2026/08',preset))[0].comparison.a.total,{name:names[0],preset});
  assert.ok(actual.startsWith(new Intl.NumberFormat('zh-TW').format(expected)+' 支'));assert.equal(await pane.locator('.sales22-custom').isVisible(),false);
 }
 await pane.locator('[data-multi-preset="custom"]').click();assert.equal(await pane.locator('.sales22-custom').isVisible(),true);
 await pane.locator('[data-range="aStart"]').fill('2026-06');await pane.locator('[data-range="aEnd"]').fill('2026-08');await pane.locator('.sales-prior-year').click();assert.equal(await pane.locator('[data-range="bStart"]').inputValue(),'2025-06');assert.equal(await pane.locator('[data-range="bEnd"]').inputValue(),'2025-08');
 await pane.locator('[data-range="bEnd"]').fill('2025-07');assert.match(await pane.locator('.sales-warning').innerText(),/長度不同/);assert.match(await pane.locator('.sales22-growth h3').innerText(),/期間變化率/);
 await pane.locator('[data-range="aStart"]').fill('2026-09');assert.match(await pane.locator('.sales-error').innerText(),/起始月份/);assert.equal(await pane.locator('.sales-multi-copy').isDisabled(),true);await pane.locator('[data-multi-preset="ytd"]').click();
 await pane.locator('.sales-multi-copy').click();const copied=await page.evaluate(()=>navigator.clipboard.readText()),expectedCopy=await page.evaluate(({names})=>{const rows=PX_SALES_EXPLORER.multi(PX_SALES_PERIODS,PX_SALES_DATA,names,PX_SALES_EXPLORER.preset('2026/08','ytd'),'difference');return PX_SALES_MULTI_VIEW.copyText(rows,PX_SALES_MULTI_VIEW.describe(rows),'增加支數最多')},{names});
 assert.equal(copied.replace(/\r\n/g,'\n'),expectedCopy);for(const sentence of await pane.locator('.sales22-summary p').allTextContents())assert.ok(copied.includes(sentence));assert.doesNotMatch(copied,/<table|<td/);
 await pane.locator('[data-remove="1"]').click();assert.equal(await pane.locator('tbody tr').count(),4);await search.fill('65010647');await pane.locator('[data-add]').first().click();assert.equal(await pane.locator('tbody tr').count(),5);
 for(const [width,height] of [[320,568],[360,800],[375,667],[390,844],[393,852],[430,932],[768,1024],[820,1180],[1024,768],[1280,900],[1366,768],[1440,900],[1920,1080],[844,390]]){
  await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);
  assert.equal(await pane.locator('.sales22-kpis').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').filter(v=>parseFloat(v)>0).length),width<=800?2:4);
  if(width===390||width===1280){const file=path.join(os.tmpdir(),'px-sales22-'+(process.env.PX_LIVE?'production':'local')+'-'+width+'.png');await card.screenshot({path:file});screenshots.push(file)}
 }
 await card.locator('[data-sales-mode="single"]').click();assert.equal(await card.locator('.sales2-total').innerText(),'74,431');assert.equal(await card.locator('.sales2-latest-label text').textContent(),'10,073');await card.locator('[data-sales-mode="multi"]').click();assert.equal(await pane.locator('tbody tr').count(),5);
 await page.locator('[data-tab="reverse"]').click();await page.locator('#rProduct').fill('65010209');const other=page.locator('#rSalesPerformance .sales2');assert.equal(await other.locator('[data-sales-mode="single"]').getAttribute('aria-pressed'),'true');await page.locator('[data-tab="calc"]').click();assert.equal(await pane.locator('tbody tr').count(),5);
 await page.reload({waitUntil:'networkidle'});await page.locator('#cProduct').fill('65010209');assert.equal(await card.locator('[data-sales-mode="single"]').getAttribute('aria-pressed'),'true');await page.evaluate(()=>navigator.serviceWorker.ready);assert.deepEqual(await page.evaluate(()=>caches.keys()),['px-workbench-v4.1.19-desktop-readability']);
 // Controlled fixture only: production raw data remains unchanged.
 const fixture=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),fp=await fixture.newPage();fp.on('pageerror',e=>errors.push(e.message));
 const fixtureNames=names.slice(0,4).concat('AMAZE經典擴香-雪松中性淡香水'),fixtureSales=[series(10,20),series(20,10),series(0,0),series(10,30),series(10,20)];fixtureSales[3][15]=null;fixtureSales[4][23]=null;
 await fp.route('**/px-sales-data.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.PX_SALES_PERIODS='+JSON.stringify(months)+';window.PX_SALES_DATA={...window.PX_SALES_DATA,'+fixtureNames.map((name,i)=>'['+JSON.stringify(name)+']:{...window.PX_SALES_DATA['+JSON.stringify(name)+'],sales:'+JSON.stringify(fixtureSales[i])+'}').join(',')+'};'})});
 await fp.goto(url,{waitUntil:'networkidle'});await fp.locator('#cProduct').fill('65010209');const fc=fp.locator('#cSalesPerformance .sales2');await fc.locator('[data-sales-mode="multi"]').click();const mp=fc.locator('.sales22-multi-pane');for(const code of ['65010647','65013454','65020125','61030162']){await mp.locator('.sales-multi-search').fill(code);await mp.locator('[data-add]').first().click()}
 assert.match(await mp.locator('.sales22-kpis').innerText(),/表現最弱[\s\S]*-50.0%/);assert.equal(await mp.locator('[data-growth-product="'+names[2]+'"] .sales22-growth-track i').count(),0);assert.match(await mp.locator('[data-growth-product="'+names[2]+'"]').innerText(),/基準為 0/);
 assert.match(await mp.locator('.sales22-coverage').first().innerText(),/部分月份資料不足/);await mp.locator('.sales22-coverage summary').first().click();assert.match(await mp.locator('.sales22-coverage').first().innerText(),/A 11\/12｜B 12\/12/);
 assert.match(await mp.locator('tr[data-product="'+fixtureNames[4]+'"] td').nth(6).innerText(),/2026\/11/);
 assert.equal(await mp.locator('.sales22-growth-track i.negative').count(),1);assert.doesNotMatch(await mp.innerText(),/Infinity|NaN/);assert.equal(await fp.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);
 await fixture.close();assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',mode:process.env.PX_LIVE?'PRODUCTION':'LOCAL',cases:20,core:'UNCHANGED',modes:'PASS',searchAndKeyboard:'PASS',periods:'PASS',KPI:'PASS',charts:'PASS',sorting:'PASS',copy:'PASS',partialZeroLatest:'PASS',single21:'PASS',viewports:14,overflow:0,consoleErrors:errors,screenshots},null,2));
 }finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
