// Hollow Signal service worker: makes the app open offline after the first visit.
// When you change any file, bump VERSION so phones pick up the new copy.
const CACHE_PREFIX = 'hollow-signal-';
const VERSION = CACHE_PREFIX + 'v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the app page: try the network first so updates show up, fall back to the saved copy offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { if (!r.ok) throw new Error('App page unavailable'); const copy = r.clone(); e.waitUntil(caches.open(VERSION).then(c => c.put('index.html', copy))); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // everything else (icons, fonts): saved copy first, then network
  if (url.origin === location.origin || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); e.waitUntil(caches.open(VERSION).then(c => c.put(req, copy))); }
      return r;
    })));
  }
});
