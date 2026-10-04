'use strict';
const path=require('node:path'),{root,readData,readMaster}=require('./sales-data-io.cjs'),core=require('../px-sales-import-core');
function validateFile(filename){const data=readData(filename);return core.validate(data.periods,data.rows,readMaster());}
if(require.main===module){try{const filename=path.resolve(process.argv[2]||path.join(root,'px-sales-data.js')),report=validateFile(filename);console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={validateFile};
