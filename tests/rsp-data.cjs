'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),master=require('../scripts/sales-data-io.cjs').readMaster(),audit=require('../PX_RSP_MAPPING_AUDIT.json'),{expected,auditWorkbook,manualConfirmed,applyManualConfirmations}=require('../scripts/rsp-mapping.cjs');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const context={window:{},Intl};vm.runInNewContext(read('px-rsp-data.js'),context);
const {PX_RSP_DATA:data,PX_RSP_REFERENCE:ref}=context.window;
for(const [key,value]of Object.entries(expected))assert.equal(audit[key],value,key);
const count=status=>audit.records.filter(r=>r.status===status).length;
assert.equal(count('MATCHED'),54);assert.equal(count('MATCHED_RSP_MISSING'),0);
assert.equal(count('MASTER_NO_SOURCE'),1);assert.equal(count('SOURCE_ONLY'),3);
assert.equal(audit.records.filter(r=>r.sourceName!==null).length,57);
assert.equal(Object.keys(data).length,55);assert.ok(Object.isFrozen(data));assert.ok(Object.isFrozen(ref));
for(const p of master){const value=ref.resolve(p);assert.ok(value===null||typeof value==='number'&&Number.isFinite(value));assert.equal(value,data[p.name]);}
const cases=[['Amaze大地擴香-甜橘玫瑰果',338],['OP生物分解保鮮膜360尺(20入)',128],['OP無雙酚A鋁箔800公分-12入',110],['OP無雙酚A鋁箔1500公分-12入',221],['OP天然棉紗布(3片入)',99],['OP指尖強化手套-薰衣紫M',129],['OP指尖強化手套-薰衣紫L',129]];
for(const [name,rsp]of cases){assert.equal(ref.resolve(name),rsp);assert.equal(ref.format(rsp),'$'+rsp);}
for(const [name,rsp]of Object.entries(manualConfirmed)){
 assert.equal(ref.resolve(name),rsp);assert.equal(ref.format(rsp),'$'+rsp);
 const record=audit.records.find(r=>r.productName===name);
 assert.equal(record.provenance,'MANUAL_CONFIRMED');assert.equal(record.sourceRsp,null);
 assert.equal(record.history[0].rsp,null);assert.equal(record.history[0].status,'MATCHED_RSP_MISSING');
 assert.equal(record.history[0].rspCell,record.rspCell);
}
assert.equal(audit.manualConfirmed,3);assert.equal(audit.effectiveRspProducts,54);
const missing=['香氛豆-粉紅甜蜜果香淡香水'];
assert.deepEqual(audit.missingRspProducts,missing);
for(const name of missing){assert.equal(ref.resolve(name),null);assert.equal(ref.format(ref.resolve(name)),'—');}
for(const invalid of [undefined,null,'UNKNOWN','__proto__','constructor',{}])assert.equal(ref.resolve(invalid),null);
for(const invalid of [undefined,null,NaN,Infinity,-1,'338'])assert.equal(ref.format(invalid),'—');assert.equal(ref.format(0),'$0');
assert.deepEqual(audit.records.filter(r=>r.status==='SOURCE_ONLY').map(r=>[r.sourceName,r.rsp]),[['OP專科抗菌保鮮膜420尺',220],['OP檸檬香氛細絨手套M',139],['OP檸檬香氛細絨手套L',67]]);
for(const r of audit.records){if(r.productName){assert.equal(data[r.productName],r.rsp);assert.ok(master.some(p=>p.name===r.productName));}else assert.ok(!master.some(p=>p.name===r.sourceName));}
assert.equal(new Set(audit.records.filter(r=>r.productName).map(r=>r.productName)).size,55);
// RSP display-only contract: no calculation, status, search or other product module may read RSP.
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js')&&f!=='px-rsp-data.js')){
 assert.doesNotMatch(read(file),/PX_RSP_DATA|PX_RSP_REFERENCE/,'RSP values forbidden in '+file);
 if(file!=='service-worker.js')assert.doesNotMatch(read(file),/px-rsp-data/,'RSP module forbidden in '+file);
}
const html=read('index.html'),cell=require('./rsp-inline-integrity.cjs').cell;
assert.equal(html.split(cell).length-1,1,'one pure basic-info display consumer');
const displayFunction=html.slice(html.indexOf('function productInfoMarkup('),html.indexOf('function salesMarkup('));
assert.ok(displayFunction.includes(cell),'RSP consumer belongs to productInfoMarkup');
assert.doesNotMatch(html.replace(cell,'').replace(/<script src="px-rsp-data\.js[^>]*><\/script>/g,''),/PX_RSP_DATA|PX_RSP_REFERENCE|px-rsp-data/);
assert.deepEqual(applyManualConfirmations({audit,values:JSON.parse(JSON.stringify(data))}).audit,audit,'manual overlay is idempotent');
if(process.env.PX_RSP_SOURCE){const actual=auditWorkbook(process.env.PX_RSP_SOURCE,master);assert.deepEqual(actual.audit,audit);assert.deepEqual(actual.values,JSON.parse(JSON.stringify(data)));}
if(!process.argv.includes('--unit')){
 const releaseBase='43d2a523f180c362c16bd100b79af88d90c2310c',releaseOld=f=>execFileSync('git',['show',releaseBase+':'+f],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
 const withoutDesktop=html.replace(/\n<link rel="stylesheet" href="desktop-readability\.css\?v=4\.1\.19-desktop-readability">/,'').replaceAll('19-desktop-readability','17-rsp');
 assert.equal(withoutDesktop.replaceAll('18-rsp-confirmed','17-rsp'),releaseOld('index.html'),'existing UI and all inline code unchanged; only desktop stylesheet and cache URLs added');
 const previousAudit=JSON.parse(releaseOld('PX_RSP_MAPPING_AUDIT.json'));
 const previousValues=Object.fromEntries(previousAudit.records.filter(r=>r.productName).map(r=>[r.productName,r.rsp]));
 assert.deepEqual(applyManualConfirmations({audit:previousAudit,values:previousValues}).audit,audit,'only three confirmed values overlay original source audit');
 const beforeResolver=releaseOld('px-rsp-data.js').split('window.PX_RSP_REFERENCE =')[1];
 assert.equal(read('px-rsp-data.js').split('window.PX_RSP_REFERENCE =')[1],beforeResolver,'pure display resolver unchanged');
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0');
 for(const file of tracked.filter(f=>!f.includes('/')&&/\.(js|json|css)$/.test(f)&&!['px-rsp-data.js','PX_RSP_MAPPING_AUDIT.json','service-worker.js','desktop-readability.css'].includes(f)))assert.equal(read(file),releaseOld(file),file+' untouched by RSP patch');
 const base='6748d0935fc04ca62a905072588266f158197b6d',old=f=>execFileSync('git',['show',base+':'+f],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
 const inline=s=>[...require('./rsp-inline-integrity.cjs').withoutRsp(s).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n').replace(/service-worker\.js\?v=[^"']+/g,'service-worker.js?VERSION');
 assert.equal(inline(read('index.html')),inline(old('index.html')),'all inline code unchanged except exact RSP display cell');
 for(const file of ['px-sales-data.js','px-product-additions.js','px-product-additions.json','px-promo-prices.js','px-promo-prices.json','px-promo-core.js','px-promo-ui.js','px-replacement-data.js','product-catalog.js','new-product-calculator.js','new-product-organizer.js','scenario-summary.js','decision-summary.js','same-period-sales.js','px-sales-analysis.js','px-sales-dashboard-core.js','px-sales-dashboard.js','px-sales-multi.js','px-sales-radar.js','px-sales-import-core.js','competitor-comparison-core.js','competitor-price-ui.js','competitor-prices.json'])assert.equal(read(file),old(file),file+' unchanged');
}
console.log(JSON.stringify({status:'PASS',sourceProducts:57,masterProducts:55,matched:54,withRsp:54,missingRsp:1,manualConfirmed:3,sourceOnly:3,displayOnlyContract:'PASS',resolverNullSafety:'PASS',sourceVerified:!!process.env.PX_RSP_SOURCE,formulaAndDataIntegrity:process.argv.includes('--unit')?'not history-dependent':'PASS'}));
