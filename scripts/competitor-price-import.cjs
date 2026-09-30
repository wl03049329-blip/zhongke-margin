const fs=require('node:fs'),path=require('node:path'),core=require('../competitor-price-core');
const root=path.resolve(__dirname,'..'),read=(file,fallback)=>fs.existsSync(path.join(root,file))?JSON.parse(fs.readFileSync(path.join(root,file),'utf8')):fallback;
function save(result){
 const write=(file,value)=>{const text=JSON.stringify(value,null,2)+'\n',target=path.join(root,file);if(!fs.existsSync(target)||fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==text)fs.writeFileSync(target,text)};
 write('competitor-prices.json',result.records);write('competitor-price-history.json',result.history);
 write('competitor-products.json',result.records.map(({competitorProductId,brand,productName,normalizedName,category,retailer,retailerProductId,sourceUrl,packQuantity,widthCm,lengthM,totalLengthM,material,specText})=>({competitorProductId,brand,productName,normalizedName,category,retailer,retailerProductId,sourceUrl,packQuantity,widthCm,lengthM,totalLengthM,material,specText})));
 // Runtime observations are deployed but never committed solely for a timestamp.
 write('competitor-runtime.json',result.runtime);write('COMPETITOR_VALIDATION.json',result.report);
 const wrapper='// Generated competitor snapshots; do not hand-code prices in UI.\nconst COMPETITOR_DATA = '+JSON.stringify({records:result.records,categoryMap:read('competitor-category-map.json',{})})+';\n';
 const file=path.join(root,'competitor-prices.js');if(!fs.existsSync(file)||fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==wrapper)fs.writeFileSync(file,wrapper);
}
function csv(text){const rows=[];let cells=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){cells.push(value.replace(/\r$/,''));value='';if(c==='\n'){rows.push(cells);cells=[];}}else value+=c;}if(value||cells.length){cells.push(value);rows.push(cells);}const headers=rows.shift().map(h=>h.replace(/^\uFEFF/,'').trim());return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,['currentPrice','originalPrice','widthCm','lengthM','packQuantity'].includes(h)?r[i]?.trim()?Number(r[i]):null:r[i]??''])));}
if(require.main===module){const file=process.argv[2],text=fs.readFileSync(file,'utf8'),rows=file.endsWith('.csv')?csv(text):JSON.parse(text);const result=core.applyObservations(read('competitor-prices.json',[]),read('competitor-price-history.json',{}),rows.map(r=>({...r,sourceMethod:'MANUAL'})));save(result);console.log(JSON.stringify(result.report,null,2));}
module.exports={root,read,save,csv};
