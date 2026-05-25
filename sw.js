const CACHE = 'ce-v1';
const PRECACHE = [
  '/centro-estudiantes-ues/',
  '/centro-estudiantes-ues/index.html',
  '/centro-estudiantes-ues/shared.css',
  '/centro-estudiantes-ues/auth.js',
  '/centro-estudiantes-ues/store.js',
  '/centro-estudiantes-ues/supabase-config.js',
  '/centro-estudiantes-ues/pwa.js',
  '/centro-estudiantes-ues/icon.svg',
  '/centro-estudiantes-ues/logo-fallback.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Supabase y CDN: siempre red
  if (url.hostname.includes('supabase') || url.hostname.includes('jsdelivr') ||
      url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    return;
  }
  // Estrategia: network-first con fallback a caché
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
