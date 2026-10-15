// Generate only locally. Plaintext is delivered outside Git; never logged.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),target=process.argv[2];
if(!target||!path.isAbsolute(target))throw Error('Provide an absolute private delivery path outside the repository');
const relative=path.relative(root,path.resolve(target));if(!relative.startsWith('..')&&!path.isAbsolute(relative))throw Error('Private delivery must be outside repository');
if(fs.existsSync(target)&&!process.argv.includes('--replace'))throw Error('Delivery already exists; use --replace only for an intentional rotation');
let pin;do{pin=String(crypto.randomInt(0,10000)).padStart(4,'0')}while(/^(\d)\1{3}$/.test(pin)||['1234','4321','0123','9876','2468','1357','0001','1212','2580'].includes(pin));
const salt=crypto.randomBytes(24).toString('hex'),version=crypto.randomBytes(16).toString('hex'),digest=crypto.createHash('sha256').update(salt+':'+pin).digest('hex');
const content='PX 工作台登入 PIN：'+pin+'\n正式網址：https://wl03049329-blip.github.io/zhongke-margin/index.html\n登入有效時間：6 小時\n登出：按工作台右上角「登出」。\n更換 PIN：在正式程式本機工作目錄執行 node scripts/rotate-screen-pin.cjs "'+target+'" --replace，再更新 Service Worker cache、測試並正式發布；未發布前網站仍使用舊 PIN。\n此功能僅為前端畫面鎖，非資料加密或伺服器端存取控制。請妥善保存本檔。\n';
fs.writeFileSync(target,content,{encoding:'utf8',mode:0o600,flag:process.argv.includes('--replace')?'w':'wx'});
fs.writeFileSync(path.join(root,'px-pin-config.js'),'// Public verifier for a convenience screen lock, not a secret or access control.\nwindow.PX_PIN_CONFIG=Object.freeze('+JSON.stringify({version,salt,digest})+');\n');
console.log('Private PIN delivery and public verifier created; plaintext omitted.');
