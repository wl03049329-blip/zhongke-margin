const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'public');
const validation=require('./validate-px-sales.cjs').validateFile(path.join(root,'px-sales-data.js'));if(validation.status!=='PASS')throw new Error('Sales data validation failed: '+JSON.stringify(validation.errors));
fs.mkdirSync(output,{recursive:true});
for(const file of fs.readdirSync(root)){if(fs.statSync(path.join(root,file)).isFile()&&/\.(html|css|js|json|webmanifest|png|svg)$/.test(file)&&!file.startsWith('PX_')&&!file.startsWith('COMPETITOR_'))fs.copyFileSync(path.join(root,file),path.join(output,file));}
fs.cpSync(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});
