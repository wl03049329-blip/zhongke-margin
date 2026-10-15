'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),C=require('../price-core.js'),{verify,validateData}=require('../tools/safety.cjs'),context={};
vm.runInNewContext(fs.readFileSync(path.join(root,'demo-data.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.PRICE_DEMO_DATA));
assert.equal(C.parseCents('99.50'),9950);assert.equal(C.parseCents('0.01'),1);for(const v of ['','-1','0','1.234','NaN','Infinity','1e3','1000001'])assert.equal(C.parseCents(v),null);
for(const [type,price,qty,total,avg]of [['SINGLE',9900,1,'$99.00','$99.00'],['BOGO',9900,2,'$99.00','$49.50'],['HALF',9900,2,'$148.50','$74.25'],['BUNDLE',19900,3,'$199.00','$66.33']]){
 const p=C.promotion(type,price,qty);assert.equal(C.money(p.total),total);assert.equal(C.money(p.average),avg);assert.equal(p.units,qty);assert.equal(p.steps.length,2);
}
assert.equal(C.money(C.promotion('HALF',101).total),'$1.52','second-item cent rounding is explicit');
assert.equal(C.promotion('BUNDLE',19900,3).average.n,19900);assert.equal(C.promotion('BUNDLE',19900,3).average.d,3,'average not rounded at source');
for(const qty of [0,1,1.5,100,NaN])assert.equal(C.promotion('BUNDLE',100,qty),null);
for(const price of [null,undefined,0,-1,NaN,Infinity])assert.equal(C.promotion('SINGLE',price),null);
const a=C.rational(13900),b=C.rational(14900);assert.equal(C.money(C.change(a,b).delta),'$10.00');assert.equal(C.percent(C.change(a,b).percent),'+7.19%');
assert.equal(C.signedMoney(C.change(b,a).delta),'−$10.00');
assert.equal(C.percent(C.change(C.rational(10950),C.rational(11900)).percent),'+8.68%');assert.equal(C.percent(C.change(C.rational(6950),C.rational(6450)).percent),'−7.19%');
assert.equal(C.change(C.rational(0),b).percent,null);assert.equal(C.change(a,a).status,'SAME');assert.equal(C.change(null,b).status,'NEW');assert.equal(C.change(a,null).status,'REMOVED');assert.equal(C.change(null,null).status,'MISSING');
assert.equal(C.search(D.products,'DEMO-10002')[0].id,'demo-film-b');assert.equal(C.search(D.products,'ＤＥＭＯ－１０００２')[0].id,'demo-film-b');assert.equal(C.search(D.products,'保鮮膜').length,3);assert.equal(C.search(D.products,'保鮮摸').length,3);assert.ok(C.search(D.products,'青葉').length);assert.equal(C.search(D.products,'30m')[0].id,'demo-film-a');assert.equal(C.search(D.products,'NOT IN DEMO').length,0);
const p=D.products[0],current=C.price(C.at(p,'2026/10')),comparison=C.pk(D.products.slice(0,3),'2026/10','length');assert.equal(C.money(current),'$99.50');assert.equal(C.money(C.unitPrice(p,current).value),'$3.32');assert.equal(C.money(C.unitPrice(p,current,'area').value),'$11.06');assert.deepEqual(comparison.winners,['demo-film-a']);assert.equal(comparison.comparable,true);
assert.equal(C.pk([p,D.products[3]],'2026/10','length').comparable,false);assert.deepEqual(C.pk([p,D.products[3]],'2026/10','length').winners,[]);assert.equal(C.unitPrice({...p,spec:{...p.spec,widthCm:null}},current,'area'),null);
assert.equal(C.pk([D.products[3],D.products[4]],'2026/10','length').comparable,false);assert.equal(C.price(C.at(p,'2026/05')),null);assert.equal(C.at(p,'2024/01'),null);
assert.equal(C.change(C.price(C.at(D.products[6],'2026/09')),C.price(C.at(D.products[6],'2026/10'))).status,'NEW');
assert.equal(C.change(C.price(C.at(D.products[4],'2026/09')),C.price(C.at(D.products[4],'2026/10'))).status,'REMOVED');
for(const product of D.products){const rows=C.summaries(product,D.periods);assert.ok(rows.every(r=>r.source));assert.ok(rows.every(r=>!/(推薦|最佳|需求|熱銷|一定要)/.test(r.text)));}
assert.deepEqual(C.ticks(139),[0,50,100,150]);
assert.equal(verify(root).status,'PASS');
for(const [key,value]of [['cost',30],['margin',.4],['apiKey','dummy'],['sales',[1,2]]]){const bad=structuredClone(D);bad.products[0][key]=value;assert.throws(()=>validateData(bad),'schema rejects '+key);}
const bad=structuredClone(D);bad.channels[0].price=99;assert.throws(()=>validateData(bad),'unverified channel must not contain a fabricated quote');
console.log('PASS: search, barcode, fuzzy match, four exact-money formulas, period deltas, null/zero, same-unit PK, source traces and whitelist safety');
