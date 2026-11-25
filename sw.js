// Service Worker: التثبيت كتطبيق + التشغيل بدون إنترنت.
// - ملفات الموقع نفسه: network-first (أحدث نسخة من النت، ولو النت قطع أو بطيء أكتر من 4 ثواني يفتح من الكاش).
// - مكتبات الـ CDN والخطوط (Tailwind, Supabase, Chart.js, QR, Excel, Font Awesome, Cairo): بتتخزن ويفتح منها فوراً بدون نت.
// - طلبات Supabase / تيليجرام: متتلمسش.
const CACHE = 'elagamy-v4';
const ASSETS = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

const FA = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/';
const CDN_NO_CORS = [
  'https://cdn.tailwindcss.com/3.4.1',
  FA + 'css/all.min.css',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap'
];
const CDN_CORS = [FA + 'webfonts/fa-solid-900.woff2', FA + 'webfonts/fa-regular-400.woff2', FA + 'webfonts/fa-brands-400.woff2'];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

const okToCache = res => res && (res.ok || res.type === 'opaque');
const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
});

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(a => c.add(a).catch(() => {})));
    await Promise.all(CDN_NO_CORS.map(u => fetch(new Request(u, { mode: 'no-cors' })).then(r => okToCache(r) && c.put(u, r)).catch(() => {})));
    await Promise.all(CDN_CORS.map(u => fetch(u, { mode: 'cors' }).then(r => okToCache(r) && c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // مكتبات CDN والخطوط: من الكاش فوراً + تحديث في الخلفية
  if (url.origin !== location.origin) {
    if (!CDN_HOSTS.includes(url.hostname)) return;   // Supabase / تيليجرام: متتلمسش
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const refresh = fetch(req).then(res => { if (okToCache(res)) cache.put(req, res.clone()).catch(() => {}); return res; });
      if (hit) { e.waitUntil(refresh.catch(() => {})); return hit; }
      return refresh;
    })());
    return;
  }

  // ملفات الموقع: network-first مع مهلة 4 ثواني
  e.respondWith((async () => {
    try {
      const res = await withTimeout(fetch(req), 4000);
      if (res && res.status === 200) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
      return Response.error();
    }
  })());
});
