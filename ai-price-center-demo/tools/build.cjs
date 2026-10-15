'use strict';
const fs=require('node:fs'),path=require('node:path'),{FILES,verify}=require('./safety.cjs');
const source=path.resolve(__dirname,'..'),target=path.join(source,'dist');
verify(source);
fs.mkdirSync(target,{recursive:true});
// Never recurse through or copy from the parent workspace. Refuse stale foreign output.
for(const file of fs.readdirSync(target))if(!FILES.includes(file))throw Error('Unexpected artifact: '+file);
for(const file of FILES){const dest=path.join(target,file);if(fs.existsSync(dest)&&fs.lstatSync(dest).isSymbolicLink())throw Error('Symlink output forbidden');fs.copyFileSync(path.join(source,file),dest);}
console.log(JSON.stringify({build:'PASS',directory:target,...verify(target)},null,2));
