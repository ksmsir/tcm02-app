const CACHE = 'tcm-pwa-v18.1';   // 原来是 v1 或 v2，v3
const ASSETS = [
  './index.html',
  './manifest.json',
  './pinyin-pro.min.js',
  './icons/icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    const cp = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, cp));
    return res;
  })));
});