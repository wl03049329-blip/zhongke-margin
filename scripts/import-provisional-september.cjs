// Explicit user-authorized provisional quantity-only import; never edits formal sales.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const X=require('../assets/vendor/xlsx-0.20.3.full.min.js'),core=require('../px-sales-import-core.js'),io=require('./sales-data-io.cjs');
const file=process.argv[2];if(!file)throw Error('Provide the locally approved XLS source');
const bytes=fs.readFileSync(file),hash=crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash,'a8230869ca688afac0bdadb4eb0401d94cb06d554adc99edd9a39562104b494a');
const parsed=core.parseWorkbook(X,bytes),w=X.read(bytes,{type:'buffer',bookVBA:false}),formal=io.readData(path.join(io.root,'px-sales-data.js')),master=io.readMaster();
assert.equal(w.SheetNames.length,1);assert.equal(parsed.sheetName,'銷售量');
assert(parsed.errors.every(e=>e.code==='YEAR_CONFIRMATION'));
const rows=parsed.rows.map(r=>{const match=core.matchRow(r,master,formal.rows);const quantity=w.Sheets[parsed.sheetName]['D'+r.row]?.v??null;assert(quantity===null||(Number.isInteger(quantity)&&quantity>=0));if(quantity!==null)assert.equal(match.status,'MATCHED');return {sourceRow:r.row,sourceName:r.name,productName:match.status==='MATCHED'?match.name:null,quantity,amount:null};});
assert.equal(rows.length,58);assert.equal(rows.filter(r=>r.quantity===null).length,5);assert.equal(new Set(rows.map(r=>r.sourceName)).size,58);
assert.equal(rows.reduce((s,r)=>s+(r.quantity??0),0),234653);
const data={schemaVersion:1,period:'2026/09',status:'PROVISIONAL',completeness:'UNCONFIRMED',periodBasis:'USER_ASSIGNED_NOT_SOURCE_VERIFIED',sourceFile:path.basename(file),sourceSheet:parsed.sheetName,sourceSHA256:hash,totalQuantity:234653,totalAmount:null,rows};
const output='// Provisional reference only. Not part of formal monthly statistics.\nwindow.PX_PROVISIONAL_SALES=Object.freeze('+JSON.stringify(data)+');\n';
fs.writeFileSync(path.join(io.root,'px-provisional-data.js'),output);
console.log('PASS: 58 source rows; 53 quantities; 5 null; total 234653; all amounts null; formal data untouched.');
