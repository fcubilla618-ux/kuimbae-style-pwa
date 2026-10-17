// Kuimba'e PWA: solo archivos locales. Firebase Authentication requiere internet.
const CACHE_NAME = 'kuimbae-auth-etapa1-v1';
const LOCAL_ASSETS = ['./','./index.html','./manifest.webmanifest','./firebase-auth.js','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(LOCAL_ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)))});
