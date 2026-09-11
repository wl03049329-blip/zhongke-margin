const CACHE='px-workbench-v4.1.2-social';
const ASSETS=['./','./index.html','./px-sales-data.js','./px-replacement-data.js','./manifest.webmanifest?v=4.1.2','./assets/brand/px-logo.svg','./assets/brand/px-icon.svg?v=4.1.2','./apple-touch-icon.png?v=4.1.2','./favicon-16.png?v=4.1.2','./favicon.png?v=4.1.2','./icon-192.png?v=4.1.2','./icon-512.png?v=4.1.2','./social-preview.png?v=4.1.2-social'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request))));
