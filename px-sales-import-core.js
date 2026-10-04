/* Sales import 2.4: preview-only, shared by the browser and repository tools. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PXSalesImport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/公分/g,'cm').replace(/毫升/g,'ml').replace(/[\s\p{P}\p{S}]/gu,'');
 const periodValid=p=>/^\d{4}\/(0[1-9]|1[0-2])$/.test(p);
 const issue=(code,message,extra={})=>({code,message,...extra});
 const id=value=>String(value??'').normalize('NFKC').trim();
 function quantity(value){
  if(value===null||value===undefined||value==='')return {value:null};
  if(typeof value==='string'){
   const s=value.trim();if(!s)return {value:null};
   if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s))return {error:'銷量必須是非負有限數字或空白'};
   value=Number(s.replace(/,/g,''));
  }
  return typeof value==='number'&&Number.isFinite(value)&&value>=0?{value}:{error:'銷量必須是非負有限數字或空白'};
 }
 function headerPeriod(value){
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return `${value.getFullYear()}/${String(value.getMonth()+1).padStart(2,'0')}`;
  const s=String(value??'').normalize('NFKC').trim();
  const m=s.match(/^(20\d{2})\s*[\/\-.年]\s*(\d{1,2})\s*月?$/);
  return m&&Number(m[2])>=1&&Number(m[2])<=12?`${m[1]}/${m[2].padStart(2,'0')}`:null;
 }
 const monthOnly=v=>{const m=String(v??'').normalize('NFKC').trim().match(/^(\d{1,2})\s*月$/);return m&&Number(m[1])>=1&&Number(m[1])<=12?Number(m[1]):null;};
 function parseRows(matrix,options={}){
  const errors=[],warnings=[],skippedRows=[];let headerRow=-1,nameColumn=-1;
  for(let r=0;r<Math.min(matrix.length,30);r++){const c=matrix[r].findIndex(v=>/^(品名|商品名稱|產品名稱|商品名|productname|name)$/.test(normalize(v)));if(c>=0){headerRow=r;nameColumn=c;break;}}
  if(headerRow<0)return {errors:[issue('HEADER','找不到商品名稱欄位')],warnings,rows:[],periods:[],headerRow:null,skippedRows};
  const header=matrix[headerRow],find=names=>header.findIndex(v=>names.includes(normalize(v))),codeColumn=find(['商品編號','商品代號','全聯商品代號','px品號','品號','產品編號','code']),barcodeColumn=find(['商品條碼','條碼','barcode']);
  let columns=header.flatMap((v,column)=>{const period=headerPeriod(v),month=monthOnly(v);return period||month?[{column,period,month}]:[];});
  if(!columns.length)errors.push(issue('MONTHS','找不到月份欄位'));
  if(columns.some(c=>!c.period)){
   if(columns.some(c=>c.period))errors.push(issue('AMBIGUOUS_YEAR','月份混用完整日期與未標示年份，請統一日期格式'));
   else{
    const anchors=header.flatMap(v=>{const m=String(v??'').normalize('NFKC').match(/(?:\d{4})\s*[~～至]\s*(\d{2})(\d{2})\s*均銷/);return m&&Number(m[2])>=1&&Number(m[2])<=12?[`20${m[1]}/${m[2]}`]:[];});
    const end=options.endPeriod||([...new Set(anchors)].length===1?anchors[0]:null);
    if(!periodValid(end)||Number(end.slice(5))!==columns.at(-1)?.month)errors.push(issue('YEAR_CONFIRMATION','月份未標示年份；請明確指定最後一欄月份（YYYY/MM），不可由今天日期推定'));
    else{let year=Number(end.slice(0,4)),month=Number(end.slice(5));for(let i=columns.length-1;i>=0;i--){if(columns[i].month!==month){errors.push(issue('MONTH_SEQUENCE','未標示年份的月份必須連續且順序明確'));break;}columns[i].period=`${year}/${String(month).padStart(2,'0')}`;if(--month===0){month=12;year--;}}warnings.push(issue('LEGACY_YEAR','依明確的最後月份錨點還原年份',{endPeriod:end}));}
   }
  }
  const periods=columns.map(c=>c.period).filter(Boolean);
  if(new Set(periods).size!==periods.length)errors.push(issue('DUPLICATE_PERIOD','來源包含重複月份'));
  // Unlabelled A/B identifiers in the legacy PX worksheet have confirmed structural misalignment.
  const legacy=codeColumn<0&&barcodeColumn<0&&nameColumn===2&&header.some(v=>normalize(v)==='前毛');
  if(legacy)warnings.push(issue('UNTRUSTED_IDENTIFIERS','此舊格式 A/B 品號／條碼欄有已確認錯位，不用作自動配對；沿用已確認來源品名或人工指定'));
  const rows=[];let numericCounts=0,zeroCounts=0,nullCounts=0;
  for(let r=headerRow+1;r<matrix.length;r++){
   const raw=matrix[r],name=String(raw[nameColumn]??'').trim();
   if(!name){if(columns.some(c=>raw[c.column]!==null&&raw[c.column]!==undefined&&raw[c.column]!==''))errors.push(issue('MISSING_NAME','有月份數值但缺少商品名稱',{row:r+1}));continue;}
   if(/^(合計|總計|小計)$/.test(name)||/^PX\s*實銷\s*x/i.test(name)){skippedRows.push({row:r+1,name,reason:'明確標示的彙總列，非商品'});continue;}
   const row={key:`${options.sheetName||'sheet'}:${r+1}`,row:r+1,name,code:id(raw[codeColumn>=0?codeColumn:legacy?0:-1]),barcode:id(raw[barcodeColumn>=0?barcodeColumn:legacy?1:-1]),identifiersTrusted:!legacy,values:{},errors:[]};
   for(const c of columns){if(!c.period)continue;const q=quantity(raw[c.column]);if(q.error)row.errors.push(issue('INVALID_QUANTITY',q.error,{row:r+1,name,period:c.period,rawValue:String(raw[c.column])}));else{row.values[c.period]=q.value;if(q.value===null)nullCounts++;else{numericCounts++;if(q.value===0)zeroCounts++;}}}
   errors.push(...row.errors);rows.push(row);
  }
  if(!rows.length)errors.push(issue('NO_PRODUCTS','來源沒有商品資料'));
  return {rows,periods,errors,warnings,skippedRows,headerRow:headerRow+1,sheetName:options.sheetName||'sheet',counts:{products:rows.length,numeric:numericCounts,zero:zeroCounts,null:nullCounts},columns,legacy};
 }
 function parseWorkbook(XLSX,buffer,options={}){
  const workbook=XLSX.read(buffer,{type:buffer instanceof ArrayBuffer?'array':'buffer',cellDates:true});
  const sheets=workbook.SheetNames;const sheetName=options.sheetName||sheets[0];
  if(!sheets.includes(sheetName))throw new Error('指定工作表不存在');
  const sheet=workbook.Sheets[sheetName];const range=XLSX.utils.decode_range(sheet['!ref']||'A1');
  if(range.e.r>50000||range.e.c>250)throw new Error('工作表超過安全解析範圍（50,000 列／250 欄）');
  const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:null});
  const result=parseRows(matrix,{...options,sheetName});
  for(const row of result.rows)for(const c of result.columns){const cell=sheet[XLSX.utils.encode_cell({r:row.row-1,c:c.column})];if(cell&&(cell.t==='e'||(cell.f&&(cell.v===undefined||cell.v===null))))result.errors.push(issue('UNRESOLVED_CELL','公式無有效快取值或 Excel 錯誤，不能作為實銷',{row:row.row,name:row.name,period:c.period}));}
  return {...result,sheets};
 }
 function validate(periods,rows,master){
  const errors=[],keys=new Set(),names=new Set(master.map(p=>p.name));
  if(!rows.length)errors.push(issue('EMPTY_DATA','實銷商品資料不得為空'));
  if(!Array.isArray(periods)||!periods.length||periods.some(p=>!periodValid(p)))errors.push(issue('PERIOD_FORMAT','月份必須是 YYYY/MM'));
  if(new Set(periods).size!==periods.length)errors.push(issue('PERIOD_DUPLICATE','月份不可重複'));
  if(periods.some((p,i)=>i&&p<=periods[i-1]))errors.push(issue('PERIOD_ORDER','月份必須依時間遞增'));
  for(const row of rows){const name=row[0],sales=row[8];if(keys.has(name))errors.push(issue('KEY_DUPLICATE','商品鍵不可重複',{name}));keys.add(name);if(!names.has(name))errors.push(issue('MASTER_LINK','商品不存在於正式主檔',{name}));if(row.length!==9||!Array.isArray(sales)||sales.length!==periods.length)errors.push(issue('ARRAY_LENGTH','每支商品 sales 長度必須等於月份數',{name}));if(Array.isArray(sales))sales.forEach((v,i)=>{if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0))errors.push(issue('VALUE_TYPE','實銷只能是非負有限 number 或 null',{name,period:periods[i]}));});}
  return {status:errors.length?'FAIL':'PASS',products:rows.length,periods:periods.length,errors};
 }
 function rowsFromData(data){return Object.entries(data).map(([name,r])=>[name,r.sourceRow??null,r.sourceName??name,r.matchMethod??null,r.pxMargin??null,r.warehouse??null,r.listingRate??null,r.stores??null,[...r.sales]]);}
 function matchRow(row,master,formalRows,decision){
  if(decision?.exclude===true)return {status:'EXCLUDED',method:'explicit_exclusion',reason:decision.reason?.trim()||'使用者明確排除此來源列'};
  if(decision?.name){const p=master.find(p=>p.name===decision.name);return p?{status:'MATCHED',name:p.name,method:'manual',reason:'本次匯入人工指定（不寫入主檔）'}:{status:'UNMATCHED',reason:'人工指定商品不存在於正式主檔'};}
  const unique=items=>[...new Set(items.map(p=>p.name))],names=unique(master.filter(p=>normalize(p.name)===normalize(row.name))),aliases=unique(formalRows.filter(r=>r[3]!=='manual'&&normalize(r[2])===normalize(row.name)).map(r=>({name:r[0]}))),codes=row.identifiersTrusted&&/^\d{8}$/.test(row.code)?unique(master.filter(p=>p.code===row.code)):[],barcodes=row.identifiersTrusted&&/^\d{13}$/.test(row.barcode)&&validBarcode(row.barcode)?unique(master.filter(p=>p.barcode===row.barcode)):[];
  const all=[...new Set([...names,...aliases,...codes,...barcodes])];
  if(all.length>1)return {status:'CONFLICT',reason:'品號、條碼或已確認品名指向不同商品，需人工確認',candidates:all};
  for(const [method,matches] of [['valid_code',codes],['valid_barcode',barcodes],['normalized_name',names],['confirmed_source_name',aliases]]){if(matches.length===1)return {status:'MATCHED',name:matches[0],method,reason:method==='confirmed_source_name'?'沿用正式實銷已確認來源品名（不使用列號）':'有效欄位完全符合'};}
  return {status:'UNMATCHED',reason:'無唯一精確對應；僅提供人工搜尋，不自動模糊配對'};
 }
 function validBarcode(s){return /^\d{13}$/.test(s)&&(10-[...s.slice(0,12)].reduce((sum,c,i)=>sum+Number(c)*(i%2?3:1),0)%10)%10===Number(s[12]);}
 function plan(parsed,periods,formalRows,master,decisions={},options={}){
  const validation=validate(periods,formalRows,master),errors=[...validation.errors,...parsed.errors],warnings=[...parsed.warnings],matches=parsed.rows.map(row=>({...row,match:matchRow(row,master,formalRows,decisions[row.key])})),newPeriods=[...new Set(parsed.periods.filter(p=>p>periods.at(-1)))].sort(),existingPeriods=parsed.periods.filter(p=>periods.includes(p)),conflicts=[],changes=[],seen=new Map(),unknownNames=new Set();
  for(const p of parsed.periods)if(p<=periods.at(-1)&&!periods.includes(p))errors.push(issue('HISTORY_INSERT','不得插入未存在的歷史月份',{period:p}));
  for(const row of matches){if(row.match.status==='EXCLUDED')continue;if(row.match.status!=='MATCHED'){const key=normalize(row.name);if(unknownNames.has(key))errors.push(issue('DUPLICATE_PRODUCT','同一來源商品重複，不可自動加總',{name:row.name,row:row.row}));unknownNames.add(key);errors.push(issue('MAPPING_PENDING','來源商品尚未對應或有識別衝突',{row:row.row,name:row.name,status:row.match.status}));continue;}if(seen.has(row.match.name)){errors.push(issue('DUPLICATE_PRODUCT','同一商品多列來源，不可自動加總',{name:row.match.name,rows:[seen.get(row.match.name).row,row.row]}));}else seen.set(row.match.name,row);}
  const candidateRows=formalRows.map(row=>[...row.slice(0,8),[...row[8],...newPeriods.map(p=>seen.get(row[0])?.values[p]??null)]]);
  for(const row of matches){if(row.match.status!=='MATCHED')continue;const formal=formalRows.find(r=>r[0]===row.match.name);
   for(const p of existingPeriods){const old=formal?.[8][periods.indexOf(p)]??null,next=row.values[p];if(old!==next){const c={name:row.match.name,period:p,formal:old,imported:next,delta:typeof old==='number'&&typeof next==='number'?next-old:null};conflicts.push(c);errors.push(issue('HISTORY_CONFLICT','歷史月份差異：保留正式值，禁止產生覆寫檔',c));}}
   if(!formal){if(!options.includeNewProducts?.includes(row.match.name)){errors.push(issue('NEW_PRODUCT_CONFIRMATION','主檔商品尚無實銷；需明確確認新增，歷史月份不會補 0',{name:row.match.name}));continue;}candidateRows.push([row.match.name,row.row,row.name,row.match.method,null,null,null,null,[...periods.map(()=>null),...newPeriods.map(p=>row.values[p]??null)]]);}
  }
  const candidatePeriods=[...periods,...newPeriods];
  for(const row of candidateRows)for(const p of newPeriods){const index=candidatePeriods.indexOf(p),value=row[8][index];changes.push({name:row[0],period:p,from:null,to:value});const priorPeriod=shiftPeriod(p,-1),priorIndex=candidatePeriods.indexOf(priorPeriod),prior=priorIndex>=0?row[8][priorIndex]:null;if(typeof prior==='number'&&prior>0&&typeof value==='number'){const rate=(value-prior)/prior*100;if(rate>200||rate< -70)warnings.push(issue('MONTH_ANOMALY','月銷量變動超過檢查範圍，僅提醒不阻止',{name:row[0],period:p,prior,value,changePercent:rate}));}}
  const candidateValidation=validate(candidatePeriods,candidateRows,master);errors.push(...candidateValidation.errors);
  const monthlyCounts=newPeriods.map(period=>{const values=candidateRows.map(r=>r[8][candidatePeriods.indexOf(period)]);return {period,products:values.length,valid:values.filter(v=>typeof v==='number').length,zero:values.filter(v=>v===0).length,null:values.filter(v=>v===null).length};});
  const report={sourceFile:options.sourceFile||'',importedAt:options.importedAt||new Date().toISOString(),sheetName:parsed.sheetName,detectedPeriods:parsed.periods,newPeriods,existingPeriods,conflictPeriods:[...new Set(conflicts.map(c=>c.period))],matchedProducts:matches.filter(r=>r.match.status==='MATCHED').map(r=>({sourceName:r.name,sourceRow:r.row,productName:r.match.name,method:r.match.method})),unmatchedProducts:matches.filter(r=>['UNMATCHED','CONFLICT'].includes(r.match.status)).map(r=>({name:r.name,row:r.row,status:r.match.status,reason:r.match.reason})),excludedProducts:matches.filter(r=>r.match.status==='EXCLUDED').map(r=>({name:r.name,row:r.row,reason:r.match.reason})),masterWithoutSource:master.filter(p=>!seen.has(p.name)).map(p=>p.name),warnings,errors,rowCounts:{source:parsed.rows.length,matched:matches.filter(r=>r.match.status==='MATCHED').length,unmatched:matches.filter(r=>r.match.status==='UNMATCHED').length,conflict:matches.filter(r=>r.match.status==='CONFLICT').length,duplicates:errors.filter(e=>e.code==='DUPLICATE_PRODUCT').length,excluded:matches.filter(r=>r.match.status==='EXCLUDED').length,candidate:candidateRows.length},numericCounts:parsed.counts?.numeric??0,zeroCounts:parsed.counts?.zero??0,nullCounts:parsed.counts?.null??0,monthlyCounts,conflicts,skippedRows:parsed.skippedRows};
  return {periods:candidatePeriods,rows:candidateRows,matches,report,changes,validation:{...candidateValidation,status:errors.length?'FAIL':'PASS',errors},canGenerate:errors.length===0};
 }
 function shiftPeriod(p,offset){const [y,m]=p.split('/').map(Number),d=new Date(Date.UTC(y,m-1+offset,1));return `${d.getUTCFullYear()}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
 function generate(result,basePeriods,baseRows){
  if(!result.canGenerate||result.report.errors.length)throw new Error('Errors 必須為 0 才能產生候選資料');
  for(const old of baseRows){const next=result.rows.find(r=>r[0]===old[0]);if(!next||JSON.stringify(next.slice(0,8))!==JSON.stringify(old.slice(0,8))||JSON.stringify(next[8].slice(0,basePeriods.length))!==JSON.stringify(old[8]))throw new Error('更新範圍異常，停止產生正式資料。歷史資料安全檢查失敗');}
  if(JSON.stringify(result.periods.slice(0,basePeriods.length))!==JSON.stringify(basePeriods))throw new Error('更新範圍異常，停止產生正式資料。歷史月份安全檢查失敗');
  return '// PX monthly sales candidate — preview only; repository validation required before replacement.\nwindow.PX_SALES_PERIODS=Object.freeze('+JSON.stringify(result.periods)+');\nconst PX_SALES_ROWS='+JSON.stringify(result.rows)+';\nwindow.PX_SALES_DATA=Object.freeze(Object.fromEntries(PX_SALES_ROWS.map(([name,sourceRow,sourceName,matchMethod,pxMargin,warehouse,listingRate,stores,sales])=>[name,Object.freeze({sourceRow,sourceName,matchMethod,pxMargin,warehouse,listingRate,stores,sales:Object.freeze(sales)})])));\n';
 }
 return {normalize,periodValid,quantity,parseRows,parseWorkbook,validate,rowsFromData,matchRow,validBarcode,plan,generate,shiftPeriod};
});
