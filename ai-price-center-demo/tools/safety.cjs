'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const FILES=Object.freeze(['index.html','styles.css','demo-data.js','price-core.js','app.js','START-HERE.txt']);
function keys(value,allowed){assert.deepEqual(Object.keys(value).sort(),allowed.slice().sort(),'data schema must be explicit');}
function validateData(data){
 keys(data,['schemaVersion','fictional','label','asOf','periods','products','channels']);assert.equal(data.fictional,true);assert.match(data.label,/虛構/);assert.equal(data.schemaVersion,1);
 assert.equal(data.products.length,8);assert.equal(data.periods.length,12);assert.equal(new Set(data.periods).size,12);assert.ok(data.periods.every(p=>/^20\d\d\/(0[1-9]|1[0-2])$/.test(p)));
 assert.equal(new Set(data.products.map(p=>p.id)).size,data.products.length);assert.equal(new Set(data.products.map(p=>p.barcode)).size,data.products.length);
 for(const p of data.products){
  keys(p,['id','name','brand','barcode','category','spec','history']);assert.match(p.id,/^demo-/);assert.match(p.name,/示範/);assert.match(p.brand,/示範/);assert.match(p.barcode,/^DEMO-\d{5}$/);
  const specKeys={film:['kind','label','lengthCm','widthCm','count','unit'],piece:['kind','label','count','unit'],volume:['kind','label','volumeMl','count','unit']};assert.ok(specKeys[p.spec.kind]);keys(p.spec,specKeys[p.spec.kind]);
  for(const key of ['lengthCm','widthCm','count','volumeMl'])if(key in p.spec)assert.ok(Number.isSafeInteger(p.spec[key])&&p.spec[key]>0);
  assert.deepEqual(p.history.map(h=>h.period),data.periods);
  for(const h of p.history){keys(h,['period','listedCents','promotion']);assert.ok(h.listedCents===null||Number.isSafeInteger(h.listedCents)&&h.listedCents>0);if(h.listedCents===null){assert.equal(h.promotion,null);continue;}keys(h.promotion,['type','priceCents','quantity']);assert.ok(['SINGLE','BOGO','HALF','BUNDLE'].includes(h.promotion.type));assert.ok(Number.isSafeInteger(h.promotion.priceCents)&&h.promotion.priceCents>0);assert.ok(Number.isSafeInteger(h.promotion.quantity)&&h.promotion.quantity>=1&&h.promotion.quantity<=99);}
 }
 for(const c of data.channels){keys(c,['name','verified','price']);assert.equal(c.verified,false);assert.equal(c.price,null);}
}
function verify(directory){
 const contents=Object.fromEntries(FILES.map(file=>{const name=path.join(directory,file);assert.equal(fs.lstatSync(name).isSymbolicLink(),false);return [file,fs.readFileSync(name,'utf8')];}));
 const context={};vm.runInNewContext(contents['demo-data.js'],context,{timeout:1000});validateData(JSON.parse(JSON.stringify(context.PRICE_DEMO_DATA)));
 const html=contents['index.html'];assert.match(html,/connect-src 'none'/);assert.match(html,/default-src 'none'/);assert.match(html,/form-action 'none'/);assert.doesNotMatch(html,/\son\w+\s*=|<form\b|<iframe\b|<base\b/i);
 const imports=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(imports,['styles.css','demo-data.js','price-core.js','app.js']);
 const scripts=['app.js','price-core.js','demo-data.js'].map(f=>contents[f]).join('\n');
 assert.doesNotMatch(scripts,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|serviceWorker|sendBeacon|importScripts|eval)\b|document\.cookie|\bimport\s*\(|new\s+Function\b/,'no network, storage, dynamic imports or SW');
 for(const [file,text]of Object.entries(contents)){
  assert.doesNotMatch(text,/px-sales|px-promo|PX_PRODUCT_MASTER|PX_Q3_PRODUCTS|PX_RSP_DATA|competitor-prices|wl03049329|zhongke-margin|成本|進貨價|前毛|毛利|供應商|採購條件|銷量|銷售額/i,file+' cannot contain private workspace references or fields');
  assert.doesNotMatch(text,/https?:\/\/|(?:sk-proj-|ghp_|github_pat_|AKIA)[A-Za-z0-9_-]{10,}|-----BEGIN .*PRIVATE KEY-----|(?:api[_-]?key|password|secret)\s*[:=]/i,file+' no endpoints or credentials');
 }
 assert.doesNotMatch(contents['styles.css'],/@import|url\s*\(/i,'no remote or inherited assets');
 return {status:'PASS',fictionalProducts:8,files:FILES.map(file=>({file,sha256:crypto.createHash('sha256').update(contents[file]).digest('hex')})),network:'NONE',storage:'NONE',inheritedModules:'NONE'};
}
module.exports={FILES,validateData,verify};
if(require.main===module)console.log(JSON.stringify(verify(path.resolve(__dirname,'..')),null,2));
