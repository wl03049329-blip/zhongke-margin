// Product Replacement supplemental data
// Source: @PX實銷_0902(1).xls / sheet: PX實銷
// Historical products are not part of the 54 active-product master.
// Source blanks remain null. No historical cost is inferred.
(function(){
 const historicalProducts={
  "historical-cling-film-420":{
   id:"historical-cling-film-420",name:"OP 專科抗菌保鮮膜30公分*420尺",sourceName:"OP 專科抗菌保鮮膜30公分*420尺",sourceRow:35,sourceProductId:"65020125",sourceBarcode:"4710660887076",status:"DISCONTINUED",cost:null,pxMargin:null,warehouse:null,listingRate:null,stores:null,
   sales:[3410,4186,2950,3086,2353,2062,2301,3275,3319,5639,3546,null,null,null,null,null,null,null,null,null,null]
  },
  "historical-lemon-glove-m":{
   id:"historical-lemon-glove-m",name:"OP檸檬細絨香氛手套M",sourceName:"OP檸檬細絨香氛手套M",sourceRow:49,sourceProductId:"65020200",sourceBarcode:"4710660887106",status:"DISCONTINUED",cost:null,pxMargin:0.2468,warehouse:"寄",listingRate:0.99,stores:1263,
   sales:[13358,18126,7776,7064,5491,5838,5683,5121,5447,5593,5648,5629,7699,11740,10861,8585,6503,6416,7793,7059,1173]
  },
  "historical-lemon-glove-l":{
   id:"historical-lemon-glove-l",name:"OP檸檬細絨香氛手套L",sourceName:"OP檸檬香氛細絨手套Ｌ",sourceRow:50,sourceProductId:"65020204",sourceBarcode:"4710660887090",status:"DISCONTINUED",cost:null,pxMargin:0.2469,warehouse:"寄",listingRate:0.98,stores:1243,
   sales:[7305,11838,4593,3842,3437,3920,3768,3715,3851,3837,3636,3589,5289,7479,6504,4980,4017,4077,4826,4547,827]
  }
 };
 Object.values(historicalProducts).forEach(product=>{product.sales=Object.freeze(product.sales);Object.freeze(product)});
 const replacementMapping=[
  {
   id:"cling-film-420-to-plant-300",label:"保鮮膜",comparisonType:"single",oldSeriesLabel:"OP 專科抗菌保鮮膜30公分*420尺",newSeriesLabel:"OP植材抗菌保鮮膜300尺",
   oldProductIds:["historical-cling-film-420"],activeProductNames:["OP植材抗菌保鮮膜300尺"],sizeMappings:[]
  },
  {
   id:"lemon-to-lavender-gloves",label:"香氛手套系列",comparisonType:"series",oldSeriesLabel:"檸檬細絨香氛手套 M + L",newSeriesLabel:"薰衣紫指尖強化手套 M + L",
   oldProductIds:["historical-lemon-glove-m","historical-lemon-glove-l"],activeProductNames:["OP指尖強化手套-薰衣紫M","OP指尖強化手套-薰衣紫L"],
   sizeMappings:[
    {size:"M",oldProductId:"historical-lemon-glove-m",activeProductName:"OP指尖強化手套-薰衣紫M"},
    {size:"L",oldProductId:"historical-lemon-glove-l",activeProductName:"OP指尖強化手套-薰衣紫L"}
   ]
  }
 ];
 replacementMapping.forEach(group=>{group.oldProductIds=Object.freeze(group.oldProductIds);group.activeProductNames=Object.freeze(group.activeProductNames);group.sizeMappings=Object.freeze(group.sizeMappings.map(item=>Object.freeze(item)));Object.freeze(group)});
 window.PX_HISTORICAL_PRODUCTS=Object.freeze(historicalProducts);
 window.PRODUCT_REPLACEMENT_MAPPING=Object.freeze(replacementMapping);
})();
