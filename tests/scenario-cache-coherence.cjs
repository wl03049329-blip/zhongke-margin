const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root=path.resolve(__dirname,'..');
const oldScript=execFileSync('git',['show','4db021de19ea4c4cad7b17fab5d37b6735d52c0d:scenario-summary.js'],{cwd:root,encoding:'utf8'});
assert.match(oldScript,/rate\(metric\(card,'費用後結果'\)\)/,'previous script reads the removed field');
const currentScript=fs.readFileSync(path.join(root,'scenario-summary.js'),'utf8');
assert.match(currentScript,/rate\(metric\(card,'中科毛利率（費用後）'\)\)/,'current script reads the existing calculated result');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
for(const file of ['scenario-summary.js','decision-summary.js']){
 assert.match(html,new RegExp(`${file.replace('.','\\.')}\\?v=4\\.1\\.2-scenario-source`));
 assert.ok(worker.includes(`./${file}?v=4.1.2-scenario-source`));
}
assert.match(worker,/const CACHE='px-workbench-v4\.1\.21-desktop-readability'/);

const requests=[];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const pathname=decodeURIComponent(url.pathname).slice(1)||'index.html';
 requests.push(url.pathname+url.search);
 if(pathname==='scenario-summary.js'&&!url.search){res.setHeader('Content-Type','text/javascript');res.end(oldScript);return}
 const file=path.join(root,pathname);
 if(!fs.existsSync(file)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
 res.end(fs.readFileSync(file));
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
 assert.ok(requests.includes('/scenario-summary.js?v=4.1.2-scenario-source'),'new HTML bypasses the old unversioned script');
 assert.ok(!requests.includes('/scenario-summary.js'),'old cached URL is never requested');
 await page.locator('[data-tab="scenario"]').click();
 await page.locator('#sProduct').fill('OP安全無毒耐熱袋(小)PX(二)');
 for(const [id,value] of [['#sPriceA','49'],['#sPrice','59'],['#sPriceC','75'],['#sCost','22.58'],['#sFee','10.95']])await page.locator(id).fill(value);
 const cards=page.locator('#scenarioResults .scenario-card');
 const expected=['24.38%','35.34%','46.80%'];
 assert.deepEqual(await cards.locator('.scenario-final b').allTextContents(),expected,'existing A/B/C result values');
 assert.deepEqual((await page.locator('#scenarioSummaryRows strong').allTextContents()).map(Number.parseFloat),expected.map(Number.parseFloat),'summary reads the same A/B/C values');
 const summary=await page.locator('#scenarioSummary').innerText();
 assert.match(summary,/最高中科毛利率：C 46\.8%/);
 assert.match(summary,/B 方案[\s\S]*較 A \+10\.96 個百分點/);
 assert.match(summary,/C 方案[\s\S]*較 A \+22\.42 個百分點/);
 assert.match(summary,/C 已達門檻；A、B 尚未達門檻/);
 assert.doesNotMatch(summary,/資料不足/);
 assert.match(await page.locator('#decisionSummary').innerText(),/B 方案較 A 方案改善/);
 await page.locator('#copyScenarioSummary').click();
 const copied=await page.evaluate(()=>navigator.clipboard.readText());
 for(const text of ['A 現況：中科毛利率（費用後）24.38%','B 方案：中科毛利率（費用後）35.34%','C 方案：中科毛利率（費用後）46.8%','+10.96 個百分點','+22.42 個百分點'])assert.ok(copied.includes(text),text);
 await page.locator('#sProduct').fill('65010240');
 assert.match(await cards.first().innerText(),/23\.60 元/);
 assert.notEqual(await page.locator('#scenarioSummaryRows [data-plan="A"] strong').innerText(),expected[0],'product switch updates the summary');
 const consistency=await page.evaluate(()=>{
  const result=document.getElementById('scenarioResults');
  const c=[...result.querySelectorAll('.scenario-card')][2];
  c.querySelector('.scenario-final b').textContent='—';
  result.innerHTML=result.innerHTML;
  return true;
 });
 assert.equal(consistency,true);
 await page.waitForFunction(()=>document.querySelector('#scenarioSummaryRows [data-plan="C"] strong')?.textContent==='資料不足');
 assert.match(await page.locator('#scenarioSummaryThreshold').innerText(),/C 資料不足/);
 assert.doesNotMatch(await page.locator('#scenarioSummaryThreshold').innerText(),/C 已達門檻/,'missing number cannot still be marked as meeting the threshold');
 assert.equal(await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',oldCacheBypassed:true,expected,points:['+10.96','+22.42'],productSwitch:true,missingStatusConsistent:true,overflow:0,consoleErrors:errors},null,2));
 await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
