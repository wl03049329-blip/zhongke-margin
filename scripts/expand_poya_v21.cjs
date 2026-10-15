/* Explicit, reviewed public HTML URLs only. Dry-run unless --apply. No source guessing. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {read,save,root}=require('./competitor-price-import.cjs');
const {publicGet,robotsAllowed}=require('./scrape_competitor_prices.cjs');
const {collect}=require('./poya-price-source.cjs'),core=require('../competitor-price-core');
const ids=['9954920','10106242','11719515','10259138','11719531','10258951','11100777'];
async function run(){
 const source=read('competitor-poya-sources.json'),prior=read('competitor-prices.json',[]);
 const reviewed=source.products.filter(p=>ids.includes(p.id));assert.equal(reviewed.length,ids.length);
 const selected={...source,products:reviewed.filter(p=>!prior.some(r=>r.retailer==='寶雅'&&r.retailerProductId===p.id))};
 if(!selected.products.length){console.log('Reviewed batch already imported; snapshots and audit retained.');return;}
 const evidenceDir=process.env.PX_SOURCE_EVIDENCE; if(evidenceDir)fs.mkdirSync(evidenceDir,{recursive:true});
 const evidenceGet=async url=>{const html=await publicGet(url);if(evidenceDir){const id=url.match(/Index\/(\d+)$/)?.[1]||'robots';fs.writeFileSync(path.join(evidenceDir,id+'.txt'),html);}return html;};
 const collected=await collect(selected,{publicGet:evidenceGet,robotsAllowed});
 const rows=collected.rows.filter(r=>!r.error).map(r=>({...r,validFrom:null,validTo:null,barcode:null,imageVerification:'NOT_AUTHORIZED_NOT_LOADED',reviewBatch:'CAMPAIGN_V21',priceScope:'Observed public page price; eligibility and offer validity unconfirmed'}));
 const result=core.applyObservations(prior,read('competitor-price-history.json',{}),rows);
 // The legacy parser defaults an unspecified pack to 1. This reviewed batch must
 // retain unknown package counts as null; one purchased item is not one roll/piece.
 for(const r of result.records)if(!prior.some(p=>p.competitorProductId===r.competitorProductId))Object.assign(r,{packQuantity:null,pricePerPiece:null});
 // This batch is add-only. Existing records/IDs/prices cannot be rewritten by a refresh.
 for(const old of prior)assert.deepEqual(result.records.find(r=>r.competitorProductId===old.competitorProductId),old);
 if(result.report.errors||result.report.changed)throw Error('ADD_ONLY_REVIEW_FAILED');
 const report={checkedAt:new Date().toISOString(),sourcePolicy:'POYA public product HTML only; Carrefour redirects to a different retailer and is not relabelled',baselineProducts:48,...result.report,sourceChecks:collected.audit,limitations:['No inferred barcode, pack quantity, promotion validity or member eligibility','No remote images loaded without rights confirmation','Observed price does not imply eligibility for formal ranking']};
 if(process.argv.includes('--apply')){const priorValidation=fs.readFileSync(path.join(root,'COMPETITOR_VALIDATION.json'));save(result);fs.writeFileSync(path.join(root,'COMPETITOR_VALIDATION.json'),priorValidation);fs.writeFileSync(path.join(root,'COMPETITOR_V21_SOURCE_AUDIT.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
module.exports={ids};
