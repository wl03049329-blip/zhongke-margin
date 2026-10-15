'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{FILES,verify}=require('./safety.cjs');
function createServer(root=path.resolve(__dirname,'../dist')){
 verify(root);
 return http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let file;try{file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400).end();return;}
  if(file==='favicon.ico'){res.writeHead(204).end();return;}
  if(!FILES.includes(file)){res.writeHead(404).end('Not found');return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8'})[path.extname(file)]);
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  res.end(req.method==='HEAD'?undefined:fs.readFileSync(path.join(root,file)));
 });
}
module.exports={createServer};
if(require.main===module){const port=Number(process.env.DEMO_PORT||4178),server=createServer();server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+server.address().port));}
