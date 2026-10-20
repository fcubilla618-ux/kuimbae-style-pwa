// Alcance BETA independiente. No guardar datos en cache; Firebase exige internet.
const CACHE='kuimbae-beta-v1';
const STATIC=['./','./index.html','./manifest.webmanifest','./firebase-auth.js','./firebase-sync.js','../icon-192.png','../icon-512.png'];
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));
 self.skipWaiting();
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kuimbae-beta-')&&k!==CACHE).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==location.origin)return;
 e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
