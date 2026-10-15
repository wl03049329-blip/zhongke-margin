const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),base='61952fed48a4b86723323865821590066ac14093';
const old=file=>execFileSync('git',['show',base+':'+file],{encoding:'utf8'}).replace(/\r\n/g,'\n');
const current=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
// PX draft UI is intentionally upgraded; its official-core parity is covered in new-product-px.cjs.
for(const file of ['competitor-comparison-core.js','competitor-price-ui.js','product-search-core.js','px-promo-ui.js','px-promo-core.js','px-promo-prices.js','px-promo-prices.json','px-sales-data.js','px-replacement-data.js','product-catalog.js','competitor-category-map.json','assets/brand/px-logo.svg'])assert.equal(current(file),old(file),file+' protected');
const previous={module:{exports:{}}};vm.runInNewContext(old('competitor-price-core.js'),previous);const core=require('../competitor-price-core');
for(const name of ['parseSpec','units','effectiveAverage','money','freshness','material','productId'])assert.equal(core[name].toString().replace(/\r\n/g,'\n'),previous.module.exports[name].toString().replace(/\r\n/g,'\n'),name+' formula unchanged');
// Scheduled observations have advanced since the mapping release; preserve the actual pre-release snapshot.
const before=JSON.parse(execFileSync('git',['show','7c317d0965177e6dd3735fa5e7b1ee9a0f291df0:competitor-prices.json'],{encoding:'utf8'})),records=require('../competitor-prices.json');for(const row of before)assert.deepEqual(records.find(p=>p.competitorProductId===row.competitorProductId),row,'existing production public record preserved');
const originalMapping=JSON.parse(old('competitor-prices.json'));
const additions=records.filter(p=>!originalMapping.some(q=>q.competitorProductId===p.competitorProductId));assert.equal(additions.length,19);assert.ok(additions.every(p=>p.retailer==='寶雅'&&new URL(p.sourceUrl).hostname==='www.poyabuy.com.tw'),'new sources are POYA only');
const inline=s=>[...require('./rsp-inline-integrity.cjs').withoutRsp(s).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n').replace(/service-worker\.js\?v=[^"']+/g,'service-worker.js?VERSION');assert.equal(inline(current('index.html')),inline(old('index.html')),'all calculator inline logic/master unchanged');
module.exports={base,old,current};
