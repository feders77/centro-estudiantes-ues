/* ── Service Worker — Centro de Estudiantes ──
   Estrategia: HTML siempre de la red (nunca cacheado).
   Assets (CSS/JS/imágenes): network-first con caché de respaldo.
   Al activar una versión nueva: notifica a todos los clientes para recargar.
*/
const CACHE = 'ce-v7';

self.addEventListener('install', e => {
  // Activa inmediatamente, sin esperar a que cierren las tabs viejas
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Avisar a todos los clientes que hay una versión nueva → ellos recargan
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase, CDN externas y resend: siempre red, sin interceptar
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('resend')
  ) return;

  // HTML: NUNCA cachear — siempre red para que el usuario vea la versión más nueva
  const esHTML = e.request.headers.get('accept')?.includes('text/html') ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');
  if (esHTML) return; // el navegador lo maneja solo

  // Assets (CSS, JS, imágenes, fuentes): network-first con fallback a caché
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
