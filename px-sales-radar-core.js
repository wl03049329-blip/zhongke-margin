/* Read-only radar selection/rankings. Sales arithmetic stays in the released explorer. */
((global)=>{
 'use strict';
 const node=typeof module==='object'&&module.exports;
 const explorer=node?require('./px-sales-explorer-core.js'):global.PX_SALES_EXPLORER;
 const dashboard=node?require('./px-sales-dashboard-core.js'):global.PX_SALES_DASHBOARD_CORE;
 const valid=explorer.valid,byName=(a,b)=>a.name.localeCompare(b.name,'zh-TW');
 const complete=row=>!row.comparison.error&&row.comparison.a.complete&&row.comparison.b.complete&&row.comparison.rate.status==='comparable'&&valid(row.comparison.rate.value);
 const numeric=(field,descending=true)=>(a,b)=>{const x=field(a),y=field(b);return valid(x)&&valid(y)?(descending?y-x:x-y)||byName(a,b):valid(x)?-1:valid(y)?1:byName(a,b)};
 function create(periods,data,products){
  const names=Object.keys(data).filter(name=>data[name]?.sales?.some(valid));
  const master=new Map(products.map(product=>[product.name,product])),index=dashboard.searchIndex(names.map(name=>master.get(name)||{name}));
  const sources=new Map(names.map(name=>[name,periods.map((period,i)=>({period:explorer.normalize(period),current:valid(data[name].sales[i])?data[name].sales[i]:null})).filter(row=>row.period).sort((a,b)=>explorer.ordinal(a.period)-explorer.ordinal(b.period))]));
  const cache=new Map();let calculations=0;
  function analyze(ranges){
   const key=JSON.stringify([ranges.aStart,ranges.aEnd,ranges.bStart,ranges.bEnd]);if(cache.has(key))return cache.get(key);
   calculations++;
   const rows=explorer.multi(periods,data,names,ranges).map(row=>{const c=row.comparison,full=complete(row),trend=c.error?null:dashboard.recentTrend(sources.get(row.name).filter(point=>explorer.ordinal(point.period)>=explorer.ordinal(c.a.start)&&explorer.ordinal(point.period)<=explorer.ordinal(c.a.end)));
    return {...row,complete:full,trend,status:dashboard.status(full?c.rate.value:null)};
   });
   const error=rows.find(row=>row.comparison.error)?.comparison.error||null;
   const full=rows.filter(row=>row.complete),growing=full.filter(row=>row.comparison.rate.value>0),declining=full.filter(row=>row.comparison.rate.value<0),flat=full.filter(row=>row.comparison.rate.value===0);
   const attention=declining.slice().sort((a,b)=>a.comparison.rate.value-b.comparison.rate.value||a.comparison.difference-b.comparison.difference||byName(a,b));
   const yearly=rows.length>0&&rows.every(row=>row.comparison.samePeriod),high=declining.filter(row=>row.comparison.rate.value<=-20);
   const summary=error?[]:[`目前 ${names.length} 支商品有實銷資料；${full.length} 支具完整${yearly?'同期':'期間'}可比資料，其中 ${growing.length} 支成長、${declining.length} 支衰退、${flat.length} 支持平。`,full.length?declining.length?`${high.length} 支商品下降至少 20%；需要注意列表依變化率最低、減少支數最多排序。`:'目前完整可比商品皆無負成長。':'目前沒有完整有效比較基準，暫不判讀成長或衰退。'];
   const result={ranges:{...ranges},rows,error,yearly,summary,counts:{total:names.length,complete:full.length,growing:growing.length,declining:declining.length,flat:flat.length,insufficient:rows.length-full.length,high:high.length,excluded:products.filter(p=>!names.includes(p.name)).length},attention,unavailable:rows.filter(row=>!row.complete),growth:growing.slice().sort(numeric(row=>row.comparison.rate.value)).slice(0,5),decline:attention.slice(0,5),volume:rows.filter(row=>valid(row.comparison.a.total)).sort(numeric(row=>row.comparison.a.total)).slice(0,10),units:full.filter(row=>row.comparison.difference>0).sort(numeric(row=>row.comparison.difference)).slice(0,5)};
   cache.set(key,result);return result;
  }
  function query(result,{search='',status='all',sort='total'}={}){
   const matched=search.trim()?new Set(dashboard.search(index,search).map(p=>p.name)):null;
   const rows=result.rows.filter(row=>(!matched||matched.has(row.name))&&(status==='all'||row.status.label===(status==='持平'?'穩定':status)));
   const sorters={name:byName,total:numeric(row=>row.comparison.a.total),growth:numeric(row=>row.complete?row.comparison.rate.value:null),difference:numeric(row=>row.comparison.difference)};
   return rows.sort(sorters[sort]||sorters.total);
  }
  return Object.freeze({analyze,query,diagnostics:()=>({calculations,cachedPeriods:cache.size,searchIndexBuilds:1,sourceBuilds:1,covered:names.length})});
 }
 const api=Object.freeze({create,complete});if(node)module.exports=api;else global.PX_SALES_RADAR_CORE=api;
})(typeof window==='object'?window:globalThis);
