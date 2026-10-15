'use strict';
// Normalize only the four approved release metadata changes for historical equality checks.
// Application code, formulas, product data and other markup remain byte-compared.
function normalizeReleaseMetadata(source){
 return require('./price-center-contract.cjs').beforeHtml(source).replaceAll('VERSION 4.1.3','VERSION 4.1.2')
  .replace('<span class="pill">開發新品 2.0</span>','')
  .replaceAll('new-product-calculator.css?v=4.1.3-new-product-v2','new-product-calculator.css?v=4.1.11-poya')
  .replaceAll('new-product-calculator.js?v=4.1.3-new-product-v2','new-product-calculator.js?v=4.1.11-poya')
  .replaceAll('service-worker.js?v=4.1.3-new-product-v2','service-worker.js?v=4.1.21-desktop-readability');
}
module.exports={normalizeReleaseMetadata};
