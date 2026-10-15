/* All products, identifiers, prices and periods in this file are fictional. */
(function (root) {
  'use strict';
  const periods = ['2025/11','2025/12','2026/01','2026/02','2026/03','2026/04','2026/05','2026/06','2026/07','2026/08','2026/09','2026/10'];
  const single = priceCents => ({type:'SINGLE',priceCents,quantity:1});
  const series = (prices, overrides = {}) => prices.map((listedCents, i) => ({period:periods[i],listedCents,promotion:listedCents === null ? null : overrides[i] || single(listedCents)}));
  const products = [
    {id:'demo-film-a',name:'青葉示範｜日常保鮮膜 30m',brand:'青葉示範',barcode:'DEMO-10001',category:'保鮮膜',spec:{kind:'film',label:'30cm × 30m・1 卷',lengthCm:3000,widthCm:30,count:1,unit:'卷'},history:series([13900,13900,12900,12900,12900,12500,null,12500,11900,11900,11900,11900],{9:{type:'HALF',priceCents:13900,quantity:2},10:{type:'BUNDLE',priceCents:21900,quantity:2},11:{type:'BUNDLE',priceCents:19900,quantity:2}})},
    {id:'demo-film-b',name:'澄日示範｜輕巧保鮮膜 20m',brand:'澄日示範',barcode:'DEMO-10002',category:'保鮮膜',spec:{kind:'film',label:'30cm × 20m・1 卷',lengthCm:2000,widthCm:30,count:1,unit:'卷'},history:series([9900,9900,9500,9500,9500,8900,8900,8900,8900,8900,8900,8900],{11:{type:'HALF',priceCents:8900,quantity:2}})},
    {id:'demo-film-c',name:'沐光示範｜大卷保鮮膜 50m',brand:'沐光示範',barcode:'DEMO-10003',category:'保鮮膜',spec:{kind:'film',label:'30cm × 50m・1 卷',lengthCm:5000,widthCm:30,count:1,unit:'卷'},history:series([18900,18900,17900,17900,17900,17900,17500,17500,16900,16900,16900,16900])},
    {id:'demo-sponge-a',name:'青葉示範｜清潔海綿 4 片',brand:'青葉示範',barcode:'DEMO-20001',category:'清潔海綿',spec:{kind:'piece',label:'4 片／包',count:4,unit:'片'},history:series([6500,6500,6500,5900,5900,5900,5900,5900,5900,5900,5900,5900],{11:{type:'BUNDLE',priceCents:9900,quantity:2}})},
    {id:'demo-sponge-b',name:'澄日示範｜厚實海綿 6 片',brand:'澄日示範',barcode:'DEMO-20002',category:'清潔海綿',spec:{kind:'piece',label:'6 片／包',count:6,unit:'片'},history:series([8900,8900,8900,8500,8500,8500,7900,7900,7900,7900,7900,null])},
    {id:'demo-bag',name:'青葉示範｜日常垃圾袋 20 張',brand:'青葉示範',barcode:'DEMO-30001',category:'垃圾袋',spec:{kind:'piece',label:'20 張／包・45 × 55cm',count:20,unit:'張'},history:series([8900,8900,8900,8500,8500,8500,7900,7900,7900,7900,7900,7900],{11:{type:'BOGO',priceCents:7900,quantity:2}})},
    {id:'demo-scent',name:'沐光示範｜森林香氛包',brand:'沐光示範',barcode:'DEMO-40001',category:'香氛包',spec:{kind:'piece',label:'1 包／件',count:1,unit:'包'},history:series([null,null,null,null,null,null,null,null,null,null,null,9900],{11:{type:'HALF',priceCents:9900,quantity:2}})},
    {id:'demo-cleaner',name:'澄日示範｜日常清潔液 500ml',brand:'澄日示範',barcode:'DEMO-50001',category:'清潔液',spec:{kind:'volume',label:'500ml／瓶',volumeMl:500,count:1,unit:'瓶'},history:series([14900,14900,13900,13900,13900,13900,12900,12900,12900,12900,12900,12900],{11:{type:'BUNDLE',priceCents:21900,quantity:2}})}
  ];
  const data = {schemaVersion:1,fictional:true,label:'全站商品、條碼與價格皆為虛構示範資料',asOf:'2026/10/15',periods,products,channels:[{name:'家樂福',verified:false,price:null},{name:'寶雅',verified:false,price:null}]};
  const freeze = value => {if(value && typeof value === 'object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  root.PRICE_DEMO_DATA = freeze(data);
})(typeof window === 'object' ? window : globalThis);
