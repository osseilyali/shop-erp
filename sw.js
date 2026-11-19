// Keeps the app's own files on the device so it opens with no internet.
// Firebase traffic is never touched here; Firestore keeps its own offline copy of the data.
const CACHE = 'shop-erp-v5';
const SHELL = ['./', './index.html', './app.js', './config.js', './vendor/firebase.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('shop-erp-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !font) return;
  if (font){
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
      catch { return Response.error(); }
    }));
    return;
  }
  // App files: use the network when it answers quickly (so updates arrive), otherwise this device's copy.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = (await c.match(req, {ignoreSearch: true})) || (req.mode === 'navigate' ? await c.match('./index.html') : undefined);
    // no-cache: always ask GitHub whether the file changed, so a new version arrives on the next open.
    const net = fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
    if (!cached) return net.catch(() => Response.error());
    const slow = new Promise(r => setTimeout(() => r(cached), 2500));
    return Promise.race([net.catch(() => cached), slow]);
  })());
});
