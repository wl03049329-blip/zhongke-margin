/* Local-only sales import. No Git, network, credentials, or formal-file writes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),core=require('../px-sales-import-core'),XLSX=require('../assets/vendor/xlsx-0.20.3.full.min'),{root,readData,readMaster}=require('./sales-data-io.cjs');
const args=process.argv.slice(2),source=args[0],value=flag=>{const index=args.indexOf(flag);return index<0?undefined:args[index+1];};
try{
 if(!source||!/[.]xlsx?$/i.test(source))throw new Error('使用：node scripts/import-px-sales.cjs SOURCE.xls[x] --output DIRECTORY [--sheet NAME] [--end-period YYYY/MM] [--decisions JSON]');
 const input=path.resolve(source),output=path.resolve(value('--output')||path.join(root,'generated-sales'));
 if(output===root||output.startsWith(path.join(root,'.git')+path.sep))throw new Error('輸出必須是独立候選資料目錄，不得覆寫正式目錄');
 const filenames=['px-sales-data.next.js','sales-import-report.json','sales-validation-report.json'];
 for(const file of filenames)if(fs.existsSync(path.join(output,file)))throw new Error('輸出檔已存在；請使用新的輸出目錄以保留稽核紀錄');
 const stat=fs.statSync(input);if(stat.size>20*1024*1024)throw new Error('來源檔超過 20 MB');
 const base=readData(path.join(root,'px-sales-data.js')),master=readMaster(),decisionsFile=value('--decisions'),choices=decisionsFile?JSON.parse(fs.readFileSync(decisionsFile,'utf8')):{},parsed=core.parseWorkbook(XLSX,fs.readFileSync(input),{sheetName:value('--sheet'),endPeriod:value('--end-period')}),result=core.plan(parsed,base.periods,base.rows,master,choices.rows||{},{sourceFile:path.basename(input),includeNewProducts:choices.includeNewProducts||[]});
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,filenames[1]),JSON.stringify(result.report,null,2)+'\n',{flag:'wx'});fs.writeFileSync(path.join(output,filenames[2]),JSON.stringify(result.validation,null,2)+'\n',{flag:'wx'});
 if(!result.canGenerate){console.error('匯入未通過：只產生報告，不產生候選資料。Errors='+result.report.errors.length);process.exitCode=1;}
 else{fs.writeFileSync(path.join(output,filenames[0]),core.generate(result,base.periods,base.rows),{flag:'wx'});console.log(JSON.stringify({status:'PASS',output,newPeriods:result.report.newPeriods,products:result.rows.length}));}
}catch(error){console.error(error.message);process.exitCode=1;}
