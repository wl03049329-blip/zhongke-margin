// Only the approved 2.1 version/cache identifiers normalize; no business code is removed.
function duelRelease(s){return s.replaceAll('4.2.1','4.2.0').replaceAll('檔期查價 2.1','檔期查價 2.0').replaceAll('price-center-duel','price-center');}
// Strip only this release's integration tags for historical whole-file contracts.
const fs=require('node:fs'),path=require('node:path');
const cache=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8').match(/const CACHE='([^']+)'/)[1];
function beforeHtml(s){s=duelRelease(s);return s.replace('VERSION 4.2.0','VERSION 4.1.3').replace('<span class="pill">檔期查價 2.0</span>','<span class="pill">開發新品 2.0</span>').replace('service-worker.js?v=4.2.0','service-worker.js?v=4.1.3-new-product-v2').replace('<link rel="stylesheet" href="price-center.css?v=4.2.0">\n','').replace('<script src="price-center-core.js?v=4.2.0"></script>\n','').replace('<script src="price-center-ui.js?v=4.2.0"></script>\n','');}
function beforeWorker(s){s=duelRelease(s);return s.replace("px-workbench-v4.2.0-price-center","px-workbench-v4.1.3-new-product-v2").replace("'./price-center-core.js?v=4.2.0','./price-center-ui.js?v=4.2.0','./price-center.css?v=4.2.0',",'');}
module.exports={cache,beforeHtml,beforeWorker};
