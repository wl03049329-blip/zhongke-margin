'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function readData(filename){
 const text=fs.readFileSync(filename,'utf8'),periodMatch=text.match(/window\.PX_SALES_PERIODS\s*=\s*Object\.freeze\((\[[\s\S]*?\])\);/),rowMatch=text.match(/const PX_SALES_ROWS\s*=\s*(\[[\s\S]*?\]);\s*window\.PX_SALES_DATA/);
 if(!periodMatch||!rowMatch)throw new Error('不符合 PX_SALES_PERIODS / PX_SALES_ROWS 正式資料契約');
 // Only JSON literals and the exact released data wrapper are accepted.
 const footer='window.PX_SALES_DATA=Object.freeze(Object.fromEntries(PX_SALES_ROWS.map(([name,sourceRow,sourceName,matchMethod,pxMargin,warehouse,listingRate,stores,sales])=>[name,Object.freeze({sourceRow,sourceName,matchMethod,pxMargin,warehouse,listingRate,stores,sales:Object.freeze(sales)})])));';
 const rowDeclaration=rowMatch[0].slice(0,rowMatch[0].lastIndexOf('window.PX_SALES_DATA'));
 const remainder=text.replace(periodMatch[0],'').replace(rowDeclaration,'').replace(/^\/\/[^\r\n]*(?:\r?\n|$)/gm,'').replace(/\s/g,'');
 if(remainder!==footer)throw new Error('資料檔包含非標準程式碼；只允許正式資料包裝與 JSON literals');
 // Uploaded JavaScript is never evaluated.
 return {periods:JSON.parse(periodMatch[1]),rows:JSON.parse(rowMatch[1])};
}
function readMaster(){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),literal=html.match(/const PX_Q3_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
 if(!literal)throw new Error('正式商品主檔不存在');
 // The existing trusted repository master is an object literal, not imported input.
 const vm=require('node:vm'),master=vm.runInNewContext('('+literal[1]+')',{}, {timeout:1000});
 return [...master,...JSON.parse(fs.readFileSync(path.join(root,'px-product-additions.json'),'utf8'))];
}
module.exports={root,readData,readMaster};
