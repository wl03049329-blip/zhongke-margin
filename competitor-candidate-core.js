/* Read-only discovery. Never supplies prices, dimensions, or a new comparison formula. */
(function(root){
 'use strict';
 const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
 // Existing formal category mappings remain authoritative. Generic discovery is only
 // used outside them, and cannot equate broad categories such as sachets/diffusers.
 const FORMAL_CATEGORIES=new Set(['CLING_FILM','FOIL','BAKING_PAPER']);
 function purpose(category,text){
  const value=normalize(text);
  const rules={
   FRAGRANCE:[['sachet',/香氛包|礦石香氛|香包|sachet/],['diffuser',/擴香|diffuser/],['laundry',/香氛豆|衣物香氛|laundry/]],
   SPONGE:[['dish',/菜瓜布|洗碗海綿|木漿棉|dish.*sponge/]],
   GLOVES:[['household',/耐用.*手套|舒適.*手套|指尖.*手套|保護.*手套|快乾.*手套|洗碗手套|household/]],
   WIPES:[['floor',/濕拖巾|拖地|floor/],['alcohol',/酒精擦|酒精濕巾|酒精布|alcohol/]],
   DISH_CLOTH:[['dish',/瞬吸布|棉紗布|抹布|dish.*cloth/]],
   SPRAY:[['deodorant',/消臭|除臭|deodor/]]
  };
  if(!rules[category])return category;
  const matches=rules[category].filter(([,pattern])=>pattern.test(value));
  return matches.length===1?matches[0][0]:null;
 }
 function find(product,records,{category,metadata,categories}){
  const kind=category(product),meta=metadata(product)||{};
  if(!kind||kind==='OTHER'||!Object.prototype.hasOwnProperty.call(categories,kind))return {level:'NONE',category:kind||'OTHER',records:[]};
  // Reviewed public candidates can be restricted by size/use without copying the master.
  const sameCategory=records.filter(row=>row.category===kind&&(!row.eligibleProductCodes||row.eligibleProductCodes.includes(product.code||product.barcode)));
  if(FORMAL_CATEGORIES.has(kind))return {level:'FORMAL',category:kind,records:sameCategory};
  // Use actual product text, not broad category aliases or invented specifications.
  const ownPurpose=purpose(kind,[product.name,product.specText,meta.specSearchText].filter(Boolean).join(' '));
  const candidates=ownPurpose===null?[]:sameCategory.filter(row=>purpose(kind,[row.productName,row.specText,row.sourceSpecText].filter(Boolean).join(' '))===ownPurpose);
  return {level:candidates.length?'GENERIC':'NONE',category:kind,records:candidates};
 }
 function rank(rows,query=''){
  const q=normalize(query);
  const exact=row=>q&&[row.name,row.code,row.barcode,...(row.exactFields||[])].some(value=>normalize(value)===q);
  // Filtered rows only. Stable sort preserves the existing relevance within a tier.
  return rows.map((row,index)=>({row,index,tier:(row.own?0:2)+(exact(row)?0:1)})).sort((a,b)=>a.tier-b.tier||a.index-b.index).map(item=>item.row);
 }
 const supportsComparison=category=>FORMAL_CATEGORIES.has(category);
 const api={find,rank,purpose,supportsComparison};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompetitorCandidates=api;
})(typeof globalThis!=='undefined'?globalThis:this);
