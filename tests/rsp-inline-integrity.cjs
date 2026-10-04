'use strict';
// Exclude exactly the authorized, display-only RSP cell from historical inline
// equality checks. All model/calculator/master/search code remains byte-compared.
const cell='<div class="px-metric px-rsp"><span>RSP</span><b>${window.PX_RSP_REFERENCE.format(window.PX_RSP_REFERENCE.resolve(product))}</b></div>';
function withoutRsp(source){return source.replace(cell,'');}
module.exports={cell,withoutRsp};
