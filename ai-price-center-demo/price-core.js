(function (root) {
  'use strict';
  // Public-price arithmetic only. Money is stored as integer cents or exact fractions of cents.
  const validInt = n => Number.isSafeInteger(n) && n >= 0;
  function rational(n, d = 1) {if(!validInt(n) || !Number.isSafeInteger(d) || d <= 0) return null;return {n,d};}
  function rounded(n, d) {return (n * 2n + d) / (2n * d);}
  function fixed(r, places = 2, divisor = 1) {
    if(!r) return '—';
    const scale = 10n ** BigInt(places), value = rounded(BigInt(Math.abs(r.n)) * scale, BigInt(r.d) * BigInt(divisor));
    const raw = value.toString().padStart(places + 1, '0');
    return (r.n < 0 ? '−' : '') + (places ? raw.slice(0,-places) + '.' + raw.slice(-places) : raw);
  }
  const money = r => r ? '$' + fixed(r,2,100) : '—';
  const decimal = r => r ? r.n / r.d : null;
  function parseCents(text) {
    const s = String(text ?? '').trim();
    if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s)) return null;
    const [a,b = ''] = s.split('.');const n = Number(a) * 100 + Number(b.padEnd(2,'0'));
    return n > 0 && n <= 100000000 ? n : null;
  }
  function promotion(type, priceCents, quantity = 1) {
    if(!validInt(priceCents) || priceCents <= 0 || priceCents > 100000000) return null;
    let units, total, steps;
    if(type === 'SINGLE'){units=1;total=priceCents;steps=`1 件 × ${money(rational(priceCents))} = ${money(rational(total))}`;}
    else if(type === 'BOGO'){units=2;total=priceCents;steps=`付 1 件、取得 2 件；總實付 ${money(rational(total))}`;}
    else if(type === 'HALF'){units=2;const second=Number(rounded(BigInt(priceCents),2n));total=priceCents+second;steps=`${money(rational(priceCents))} + ${money(rational(priceCents))} × 50% = ${money(rational(total))}（第二件金額四捨五入至分）`;}
    else if(type === 'BUNDLE' && Number.isInteger(quantity) && quantity >= 2 && quantity <= 99){units=quantity;total=priceCents;steps=`${quantity} 件組合總價 ${money(rational(total))}`;}
    else return null;
    const average = rational(total,units);
    return {units,total:rational(total),average,steps:[steps,`${money(rational(total))} ÷ ${units} 件 = ${money(average)}／件（平均值內部保留完整精度）`]};
  }
  const labels = Object.freeze({SINGLE:'一般售價',BOGO:'買一送一',HALF:'第二件五折',BUNDLE:'多件組合價'});
  const at = (product, period) => product?.history.find(h => h.period === period) || null;
  function price(record, basis = 'average') {if(!record || record.listedCents === null)return null;return basis === 'listed' ? rational(record.listedCents) : record.promotion ? promotion(record.promotion.type,record.promotion.priceCents,record.promotion.quantity)?.average || null : null;}
  function change(before, after) {
    if(!before || !after)return {status:!before && after ? 'NEW' : before && !after ? 'REMOVED' : 'MISSING',delta:null,percent:null};
    const n = after.n * before.d - before.n * after.d, d = after.d * before.d;
    return {status:n === 0 ? 'SAME' : n > 0 ? 'UP' : 'DOWN',delta:{n,d},percent:before.n === 0 ? null : {n:n * 100,d:after.d * before.n}};
  }
  const signedMoney = r => r ? (r.n < 0 ? '−' : r.n > 0 ? '+' : '') + money({n:Math.abs(r.n),d:r.d}) : '—';
  const percent = r => r ? (r.n > 0 ? '+' : '') + fixed(r) + '%' : '無法計算百分比';
  function unitPrice(product, average, mode = 'length') {
    if(!average || !product?.spec)return null;
    const s=product.spec;let numerator=average.n, denominator=average.d, key, label;
    if(s.kind === 'film'){
      if(!validInt(s.lengthCm)||!s.lengthCm||!validInt(s.count)||!s.count)return null;
      if(mode === 'area'){if(!validInt(s.widthCm)||!s.widthCm)return null;numerator*=10000;denominator*=s.lengthCm*s.widthCm*s.count;key='film:m2';label='每平方公尺';}
      else {numerator*=100;denominator*=s.lengthCm*s.count;key='film:m';label='每公尺';}
    }else if(s.kind === 'volume'){
      if(!validInt(s.volumeMl)||!s.volumeMl||!validInt(s.count)||!s.count)return null;
      numerator*=100;denominator*=s.volumeMl*s.count;key=product.category+':100ml';label='每 100ml';
    }else if(s.kind === 'piece'){
      if(!validInt(s.count)||!s.count)return null;denominator*=s.count;key=product.category+':'+s.unit;label='每'+s.unit;
    }else return null;
    const value=rational(numerator,denominator);return value ? {value,key,label} : null;
  }
  function pk(products, period, mode) {
    const entries=products.map(product=>({product,average:price(at(product,period)),unit:unitPrice(product,price(at(product,period)),mode)}));
    const available=entries.filter(e=>e.unit),comparable=entries.length >= 2 && available.length === entries.length && new Set(available.map(e=>e.unit.key)).size === 1;
    let winners=[];
    if(comparable){const best=available.reduce((a,b)=>BigInt(a.unit.value.n)*BigInt(b.unit.value.d) <= BigInt(b.unit.value.n)*BigInt(a.unit.value.d) ? a : b);winners=available.filter(e=>BigInt(e.unit.value.n)*BigInt(best.unit.value.d) === BigInt(best.unit.value.n)*BigInt(e.unit.value.d)).map(e=>e.product.id);}
    return {entries,comparable,winners};
  }
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu,'');
  function distance(a,b) {let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}return prev[b.length];}
  function search(products, query) {
    const q=normalize(query);if(!q)return products.slice();
    const tokens=String(query).trim().split(/\s+/).map(normalize).filter(Boolean);
    return products.map((product,index)=>{
      const name=normalize(product.name),code=normalize(product.barcode),all=normalize([product.name,product.brand,product.barcode,product.spec.label,product.category].join(' '));
      let score=code===q?1000:name===q?900:tokens.every(t=>all.includes(t))?700:0;
      if(!score&&q.length>=3&&q.length<=24&&!/\d/.test(q))for(let i=0;i<name.length;i++)if(distance(q,name.slice(i,i+q.length))<=1){score=300;break;}
      return {product,index,score};
    }).filter(r=>r.score).sort((a,b)=>b.score-a.score||a.index-b.index).map(r=>r.product);
  }
  function ticks(max) {if(!Number.isFinite(max)||max<=0)return [0,1,2,3,4];const rough=max/4,power=10**Math.floor(Math.log10(rough)),step=[1,2,5,10].map(n=>n*power).find(n=>n>=rough);return Array.from({length:Math.ceil(max/step)+1},(_,i)=>i*step);}
  function summaries(product, periods) {
    if(!product)return [];
    const current=at(product,periods.at(-1)),previous=at(product,periods.at(-2)),now=price(current),prior=price(previous),delta=change(prior,now),rows=[];
    if(now&&prior){const text=delta.status==='SAME'?'平均單件實付價與前檔持平。':`平均單件實付價較前檔${delta.status==='DOWN'?'降低':'增加'} ${money({n:Math.abs(delta.delta.n),d:delta.delta.d})}／件（${percent(delta.percent)}）。`;rows.push({text,source:`${previous.period} ${money(prior)} → ${current.period} ${money(now)}；差額 ÷ 前檔平均單件實付價 × 100%。`});}
    else rows.push({text:'缺少相鄰兩檔有效價格，暫不判讀價格變化。',source:`只比較 ${periods.at(-2)} 與 ${periods.at(-1)}，不跨越缺值尋找基準。`});
    if(current?.promotion&&now){const p=promotion(current.promotion.type,current.promotion.priceCents,current.promotion.quantity);rows.push({text:`本檔為${labels[current.promotion.type]}，取得 ${p.units} 件，總實付 ${money(p.total)}，平均 ${money(p.average)}／件。`,source:p.steps.join('；')});}
    const valid=product.history.filter(h=>price(h));rows.push({text:`12 個示範月份中有 ${valid.length} 個月具有效價格${valid.length<12?'，缺值月份保留空白':''}。`,source:'來源：獨立虛構示範資料集；不代表任何通路的實際報價。'});
    return rows;
  }
  const api=Object.freeze({rational,money,decimal,parseCents,promotion,labels,at,price,change,signedMoney,percent,unitPrice,pk,search,ticks,summaries});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PriceDemoCore=api;
})(typeof window==='object'?window:globalThis);
