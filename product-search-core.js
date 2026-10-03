/* Search metadata never supplies prices, costs or comparison dimensions. */
(function(root){
 function normalize(value){return String(value??'').normalize('NFKC').toLowerCase()
  .replace(/(\d+(?:\.\d+)?)\s*(?:公斤|千克|kg)/g,(_,n)=>Number(n)*1000+'g')
  .replace(/(\d+(?:\.\d+)?)\s*(?:公升|升|litre\b|liter\b|l\b)/gi,(_,n)=>Number(n)*1000+'ml')
  .replace(/(\d+(?:\.\d+)?)\s*(?:公克|克)/g,'$1g')
  .replace(/(\d+(?:\.\d+)?)\s*(?:公分|厘米)/g,'$1cm')
  .replace(/(\d+(?:\.\d+)?)\s*(?:公尺|米)/g,'$1m')
  .replace(/(\d+(?:\.\d+)?)\s*(?:毫升|毫公升)/g,'$1ml')
  .replace(/[\s×✕*+／/()（）\-－_,，]/g,'');}
 function create(config){
  const entries=new Map(config.products.map(p=>[p.id,p]));
  const categories=config.categories;
  function expand(values){const result=[...values];for(const group of config.brands){if(values.some(v=>normalize(v).includes(normalize(group.name))))result.push(group.name,...group.aliases);}return result.map(normalize).filter(Boolean);}
  function ownFields(p){const e=entries.get(p.code||p.barcode)||{},c=categories[e.category]||{};return expand([p.name,p.code,p.barcode,e.brand,e.specSearchText,...(e.aliases||[]),c.label,...(c.aliases||[]),'OP'+(c.label||'')]);}
  function marketFields(p){const c=categories[p.category]||{},brand=config.brands.find(b=>normalize(p.brand).includes(normalize(b.name)));return expand([p.brand,p.productName,p.specText,p.retailer,p.retailerProductId,p.material,...(p.aliases||[]),c.label,...(c.aliases||[]),p.brand+(c.label||''),...(brand?.aliases||[]).map(a=>a+(c.label||''))]);}
  function terms(query){return String(query).normalize('NFKC').trim().split(/\s+/).map(normalize).filter(Boolean);}
  const matches=(query,fields)=>terms(query).length>0&&terms(query).every(t=>fields.some(f=>/^\d+(?:\.\d+)?(?:cm|m|ml|g)$/.test(t)?new RegExp('(?<![\\d.])'+t.replace(/\./g,'\\.')+'(?![a-z])').test(f):f.includes(t)));
  function searchOwn(products,query){return products.filter(p=>matches(query,ownFields(p)));}
  function searchMarket(records,query,products=[]){
   if(!terms(query).length)return [];
   const related=new Set(products.map(p=>entries.get(p.code||p.barcode)?.category).filter(Boolean));
   const explicitBrand=config.brands.filter(b=>b.name!=='OP'&&b.name!=='AMAZE'&&b.name!=='德適淨').find(b=>[b.name,...b.aliases].some(alias=>normalize(query).includes(normalize(alias))));
   return records.filter(p=>explicitBrand?matches(query,marketFields(p)):related.has(p.category)||matches(query,marketFields(p)));
  }
  return {searchOwn,searchMarket,ownFields,marketFields,matches,terms,category:p=>entries.get(p.code||p.barcode)?.category,label:id=>categories[id]?.label||id};
 }
 const api={normalize,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProductSearch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
