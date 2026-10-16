// Historical regression fixture, NOT current-release acceptance.
// Existing suites intentionally exercise 2026/08 known answers and September import conflicts.
// Current September data is verified without this preload by v431-isolation / v431-browser.
'use strict';
if(process.env.PX_LIVE||process.env.PX_V431_URL)throw Error('Historical fixture must never run against production');
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../px-sales-data.js'),sync=fs.readFileSync.bind(fs),asyncRead=fs.readFile.bind(fs);
const raw=sync(file,'utf8').replace(/^\/\/ 2026\/09:[^\r\n]*(?:\r?\n|$)/m,''),pm=raw.match(/Object\.freeze\((\[[^\n]+?\])\);/),rm=raw.match(/const PX_SALES_ROWS=(\[[^\n]+\]);/);
const periods=JSON.parse(pm[1]),rows=JSON.parse(rm[1]),end=periods.indexOf('2026/08')+1;
if(!end)throw Error('Historical fixture cutoff absent');
const fixture=raw.replace(pm[1],JSON.stringify(periods.slice(0,end))).replace(rm[1],JSON.stringify(rows.map(r=>[...r.slice(0,8),r[8].slice(0,end)])));
const matches=p=>typeof p==='string'&&path.resolve(p)===file;
const result=o=>(typeof o==='string'?o:o?.encoding)?fixture:Buffer.from(fixture);
fs.readFileSync=(p,o)=>matches(p)?result(o):sync(p,o);
fs.readFile=(p,o,cb)=>{if(!matches(p))return asyncRead(p,o,cb);const done=typeof o==='function'?o:cb;process.nextTick(()=>done(null,result(o)))};
const stream=fs.createReadStream.bind(fs);fs.createReadStream=(p,o)=>matches(p)?require('node:stream').Readable.from([Buffer.from(fixture)]):stream(p,o);
console.log('REGRESSION FIXTURE: 2026/08 historical known answers; current-release tests run separately.');
