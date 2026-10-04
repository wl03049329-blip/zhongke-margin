'use strict';
// Explicit, reviewed name aliases. Formatting-only equality is handled separately.
// No fuzzy matching, identifier inference, or borrowing another product's price.
const aliases = Object.freeze({
 'AMAZE 礦石香氛包 玫瑰淡香水':'Amaze礦石香氛-玫瑰淡香水',
 'Amaze 礦石香氛 沁藍海洋淡香水':'礦石香氛-沁藍海洋淡香水',
 'Amaze 礦石香氛 月光舒眠薰衣草':'礦石香氛-月光舒眠薰衣草',
 'Amaze 法國植萃精油香氛豆-鳶尾粉邂逅淡香水':'香氛豆-鳶尾粉邂逅淡香水',
 'Amaze 法國淡香水香氛豆-挪威雪松森林':'Amaze 法國淡香水香氛豆-挪威雪松森林-(補充包)',
 'AMAZE 法國植萃衣物香氛豆 超值補充包-玫瑰淡香水':'香氛豆補充包-玫瑰淡香水(二)',
 'AMAZE 法國植萃衣物香氛豆 超值補充包-海洋中性白麝香':'香氛豆補充包-海洋中性白麝香(二)',
 'OP茶酚淨洗潔精-清雅茶香':'茶酚淨洗潔精-清雅茶香(黃)',
 'OP茶酚淨洗潔精-檸檬茶萃':'茶酚淨洗潔精-檸檬茶萃(黃)',
 'OP茶酚淨洗潔精補充包-清雅茶香':'茶酚淨洗潔精補充包-茶香(黃)',
 'OP日本愛宕柿小蘇打':'OP日本愛宕柿小蘇打(二)',
 'OP愛岩柿除菌消臭噴霧-抗病毒EX':'OP愛岩柿消臭噴霧-抗病毒EX(黃)',
 'OP抗菌消臭防螨噴霧-清新海洋':'OP抗菌消臭噴霧-清新海洋',
 'OP EcoDry凝膠型吊掛除濕袋-雪松清香':'凝膠型除濕袋-雪松清香',
 'OP生物分解保鮮膜360尺':'OP生物分解保鮮膜360尺(20入)',
 'OP植材來源無氯抗菌保鮮膜300尺':'OP植材抗菌保鮮膜300尺',
 'OP無雙酚A鋁箔800cm':'OP無雙酚A鋁箔800公分-12入',
 'OP無雙酚A鋁箔1500cm':'OP無雙酚A鋁箔1500公分-12入',
 'OP生物分解抗菌 平面密封袋 M':'OP生物抗菌密封袋M(PX)',
 'OP生物分解抗菌 平面密封袋 L':'OP生物抗菌密封袋L(PX)',
 'OP生物分解抗菌 立體密封袋 S':'OP生物分解抗菌立體密封袋S',
 'OP生物分解抗菌 立體密封袋 M+L':'OP抗菌立體密封袋M+L',
 'OP抗菌立體密封袋M':'OP長效抗菌立體密封袋M',
 'OP無雙酚A料理紙32M':'OP無雙酚A料理紙32M(12入)',
 'OP安全無毒耐熱袋-小':'OP安全無毒耐熱袋(小)PX(二)',
 'OP安全無毒耐熱袋-中':'OP安全無毒耐熱袋(中)PX(二)',
 'OP咖啡渣淨味濾水網80入':'OP咖啡渣淨味濾水網80入(PX)',
 'OP無漂白原色料理紙7+5M':'OP無漂白料理紙7M(加量)',
 'OP柑橘抗菌海棉菜瓜布':'OP柑橘抗菌EX菜瓜布(三)',
 'OP檸檬馬鞭草菜瓜布4入':'檸檬馬鞭草菜瓜布-萬用速淨4入',
 'OP環保舒適手套 綠茶香氛M':'OP環保舒適手套-綠茶香氛M(橘)',
 'OP環保舒適手套 綠茶香氛L':'OP環保舒適手套-綠茶香氛L(橘)',
 'OP加長耐用強化手套M':'OP加長保護手套耐用強化 M',
 'OP清新檸檬抗菌瞬吸布':'OP檸檬清新抗菌瞬吸布',
 '德適淨十抗菌酒精擦90抽':'德適淨十抗菌酒精擦(PX)',
 'OP超音波馬卡龍瞬吸布':'OP超音波馬卡龍瞬吸布PX',
 'OP天然棉紗布3入':'OP天然棉紗布(3片入)',
 '德適淨十抗病毒濕拖巾-雪松':'德適淨濕拖巾-雪松清香',
 '德適淨十抗病毒濕拖巾-海洋':'德適淨濕拖巾-海洋清新',
 '德適淨十抗病毒濕拖巾-薰衣草':'德適淨濕拖巾-薰衣草'
});
const normalize = name => String(name).normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu,'');
const expected = Object.freeze({sourceProducts:57,masterProducts:55,matched:54,matchedWithRsp:51,matchedWithoutRsp:3,masterMissingSource:1,sourceOnly:3});
function auditWorkbook(filename, master){
 const fs=require('node:fs'),crypto=require('node:crypto'),X=require('../assets/vendor/xlsx-0.20.3.full.min.js');
 const bytes=fs.readFileSync(filename),book=X.read(bytes,{type:'buffer'});
 if(book.SheetNames.length!==1)throw Error('RSP source must have one reviewed sheet');
 const sheet=book.Sheets[book.SheetNames[0]],rows=X.utils.sheet_to_json(sheet,{header:1,raw:true,defval:null});
 if(rows.length!==2||normalize(rows[0][0])!=='品名'||rows[1][0]!=='RSP')throw Error('Unexpected RSP source layout');
 const records=[],used=new Set(),values=Object.fromEntries(master.map(p=>[p.name,null]));
 rows[0].forEach((sourceName,c)=>{
  if(!c||!sourceName)return;
  const raw=rows[1][c],rsp=raw==null||raw===''?null:raw;
  if(rsp!==null&&(typeof rsp!=='number'||!Number.isFinite(rsp)||rsp<0))throw Error('Invalid RSP at '+X.utils.encode_cell({r:1,c}));
  const exact=master.filter(p=>normalize(p.name)===normalize(sourceName));
  const aliasEntry=Object.entries(aliases).find(([n])=>normalize(n)===normalize(sourceName));
  const targets=exact.length?exact:aliasEntry?master.filter(p=>p.name===aliasEntry[1]):[];
  if(targets.length>1||aliasEntry&&targets.length!==1)throw Error('Ambiguous/invalid mapping: '+sourceName);
  const productName=targets[0]?.name??null,mappingMethod=productName?(exact.length?'NORMALIZED_NAME':'EXPLICIT_ALIAS'):'NONE';
  if(productName){if(used.has(productName))throw Error('Duplicate mapping: '+productName);used.add(productName);values[productName]=rsp;}
  records.push({sourceName,productName,rsp,status:productName?(rsp===null?'MATCHED_RSP_MISSING':'MATCHED'):'SOURCE_ONLY',mappingMethod,nameCell:X.utils.encode_cell({r:0,c}),rspCell:X.utils.encode_cell({r:1,c})});
 });
 for(const p of master)if(!used.has(p.name))records.push({sourceName:null,productName:p.name,rsp:null,status:'MASTER_NO_SOURCE',mappingMethod:'NONE'});
 const count=s=>records.filter(r=>r.status===s).length,counts={sourceProducts:records.filter(r=>r.sourceName!==null).length,masterProducts:master.length,matched:used.size,matchedWithRsp:count('MATCHED'),matchedWithoutRsp:count('MATCHED_RSP_MISSING'),masterMissingSource:count('MASTER_NO_SOURCE'),sourceOnly:count('SOURCE_ONLY')};
 for(const [key,value]of Object.entries(expected))if(counts[key]!==value)throw Error(`Mapping gate failed: ${key} ${counts[key]} != ${value}`);
 return {audit:{...counts,source:{filename:'RSP.xlsx',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sheet:book.SheetNames[0],policy:'Only the RSP cell directly below each original name; blank values are never inferred.'},records},values};
}
module.exports={aliases,normalize,expected,auditWorkbook};
