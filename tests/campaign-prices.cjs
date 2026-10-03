const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const core=require('../px-promo-core'),{importRows}=require('../scripts/import_px_promos.cjs');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),data=require('../px-promo-prices.json'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),master=vm.runInNewContext(html.match(/const PX_Q3_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/)[1]);
for(const [text,average] of [['單特 $89',89],['二特 $139',69.5],['三特 $199',199/3],['$278 買1送1',139],['$300 買2送1',100],['任選2件 $150',75],['$109',109]])assert.equal(core.parse(text).promotions[0].averageUnitPrice,average,text);
assert.equal(core.parse('IP 單特 $65 第二件5折').promotions[1].averageUnitPrice,48.75);
assert.deepEqual([69,69.5,199/3].map(core.money),['69','69.5','66.33']);
assert.equal(core.identifier(' ６１０３０３１５\n'),'61030315');
assert.ok(core.parse('任選優惠 $abc').warnings.includes('UNKNOWN_PROMOTION'));
assert.ok(core.parse('').warnings.includes('MISSING_PRICE'));
for(const [date,label] of [['2026-10-02','10-1'],['2026-10-15','10-1'],['2026-10-16','10-2'],['2026-10-29','10-2']])assert.equal(core.context(data,date).current.label,label);
assert.equal(core.context(data,'2026-09-30').current,null);assert.equal(core.context(data,'2026-09-30').next.label,'10-1');
assert.equal(data.products.length,55);assert.equal(core.periods(data).length,4);assert.equal(master.length,54);
const gloves=data.products.find(p=>p.productId==='63020159');assert.equal(gloves.periods['2026-10-1'].campaignType,'IP');assert.equal(gloves.periods['2026-10-2'].campaignType,'DM');
const fixture={issues:[],rows:[{sheet:'test',row:1,raw:{code:'65010209\n',barcode:'',name:'test'},periods:[{id:'2026-10-1',label:'10-1',startDate:'2026-10-02',endDate:'2026-10-15',rawText:'單特 $89'}]},{sheet:'test',row:2,raw:{code:'65010209',barcode:'',name:'test'},periods:[{id:'2026-10-1',label:'10-1',startDate:'2026-10-02',endDate:'2026-10-15',rawText:'單特 $99'}]},{sheet:'test',row:3,raw:{code:'bad',barcode:'',name:'missing'},periods:[]}]};
const imported=importRows(fixture,master);assert.equal(imported.report.successfulPeriods,1);assert.ok(imported.report.issues.some(i=>i.reason==='PERIOD_PRICE_CONFLICT'));assert.ok(imported.report.warningCount>0);
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname==='/'?'index.html':decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));if(!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.PX_LIVE||`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});await page.locator('[data-tab="campaign"]').click();
const campaignText=async()=>{const details=page.locator('.lookup-campaign-details');if(await details.count()&&!await details.evaluate(el=>el.open))await details.locator(':scope > summary').click();return page.locator('#campaignResults').innerText()};
for(const query of ['鋁箔','65010209','4710660884433']){await page.locator('#campaignSearch').fill(query);assert.ok((await campaignText()).includes('均價 $69.5'));assert.equal(await page.locator('.campaign-result').count(),query==='鋁箔'?2:1);}
await page.evaluate(()=>{PXPromo.today=()=> '2026-09-30';renderCampaignSearch()});await page.locator('#campaignSearch').fill('天然棉紗布');assert.match(await campaignText(),/本檔未提供促銷價格/);
await page.locator('#campaignSearch').fill('65010209');
for(const [date,label] of [['2026-09-30','下一檔 10-1'],['2026-10-02','本檔 10-1'],['2026-10-16','本檔 10-2']]){await page.evaluate(date=>{PXPromo.today=()=>date;renderCampaignSearch()},date);assert.ok((await campaignText()).includes(label));}
await page.evaluate(()=>{PXPromo.today=()=> '2026-09-30';renderCampaignSearch()});
const production=[];for(const query of ['65010209','61050067','63020121','65013459','63020159']){await page.locator('#campaignSearch').fill(query);await page.locator('#campaignFilter').selectOption('all');production.push({query,result:await campaignText()});}
let maximum=0;for(const width of [320,360,375,390,393,430,768,1280]){await page.setViewportSize({width,height:844});maximum=Math.max(maximum,await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)));}assert.equal(maximum,0);assert.deepEqual(errors,[]);
await page.setViewportSize({width:390,height:844});await page.locator('#campaignFilter').selectOption('current');await page.locator('#campaignSearch').fill('鋁箔');if(!process.env.PX_LIVE)await page.screenshot({path:path.join(root,'tests/campaign-mobile.png'),fullPage:true});
console.log(JSON.stringify({status:'PASS',tests:20,overflow:maximum,consoleErrors:errors,production},null,2));await browser.close();server.close();})().catch(e=>{console.error(e);server.close();process.exit(1)});
