// Only our own public runtime metadata; no retailer/private API access.
const fs=require('node:fs');
(async()=>{try{const res=await fetch('https://wl03049329-blip.github.io/zhongke-margin/competitor-runtime.json',{signal:AbortSignal.timeout(15000)});if(res.ok){const value=await res.json();if(value&&typeof value==='object'&&!Array.isArray(value))fs.writeFileSync('competitor-runtime.json',JSON.stringify(value));}}catch(e){console.log('No prior runtime available; using last committed successful snapshot')}})();
