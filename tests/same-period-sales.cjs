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
for(const [start,end] of [['function model(','function rows('],['function calcC(','function calcR('],['function analyzePxSales(','function trendChart('],['function trendChart(','function productInfoMarkup(']])assert.equal(html.slice(html.indexOf(start),html.indexOf(end)),oldHtml.slice(oldHtml.indexOf(start),oldHtml.indexOf(end)),`${start} unchanged`);
const promoCore='const t=$("promoType").value,cost=n("pCost"),px=pct(n("pPx")),fee=pct(n("pFee")),a=n("pA"),avg=promoAverage(t,a),o=model(avg,cost,px,fee)';assert.ok(html.includes(promoCore)&&oldHtml.includes(promoCore),'promotion calculation source unchanged');
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

// Presentation checks moved to sales-dashboard.cjs; original calculation fixtures stay intact.
console.log('PASS same-period-sales.cjs original data/formula/edge-case calculations');
