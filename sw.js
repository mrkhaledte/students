// Service Worker بسيط: بيخلّي الموقع قابل للتثبيت كتطبيق، ويفتح آخر نسخة لو النت قطع لحظياً.
// network-first: الموقع بيجيب أحدث نسخة دايماً من النت، والكاش احتياطي بس.
const CACHE = 'elagamy-v2';
const ASSETS = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;   // Supabase / تلجرام / CDN: متتلمسش
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
