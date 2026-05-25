/* PWA install + offline support */
(function () {
  /* Registrar service worker */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/centro-estudiantes-ues/sw.js')
      .catch(() => {});
  }

  /* Detectar plataforma */
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;

  if (isStandalone) return; // ya está instalada

  /* Crear banner */
  function crearBanner(html, onAceptar) {
    const banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.innerHTML = html;
    banner.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0',
      'background:#fff', 'border-top:1px solid #e0d6c5',
      'padding:16px 20px', 'padding-bottom:calc(16px + env(safe-area-inset-bottom))',
      'z-index:9999', 'display:flex', 'align-items:center', 'gap:14px',
      'box-shadow:0 -4px 24px rgba(26,19,16,.1)',
      'font-family:"Inter Tight",sans-serif',
      'transform:translateY(100%)',
      'transition:transform .3s ease'
    ].join(';');
    document.body.appendChild(banner);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { banner.style.transform = 'translateY(0)'; });
    });

    if (onAceptar) {
      const btn = banner.querySelector('#pwa-install-btn');
      if (btn) btn.addEventListener('click', onAceptar);
    }
    const cerrar = banner.querySelector('#pwa-close-btn');
    if (cerrar) cerrar.addEventListener('click', () => {
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => banner.remove(), 350);
      try { sessionStorage.setItem('pwa-dismissed', '1'); } catch (_) {}
    });
  }

  if (sessionStorage.getItem('pwa-dismissed')) return;

  /* Android: beforeinstallprompt */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
      crearBanner(`
        <img src="icon.svg" width="42" height="42" style="border-radius:10px;flex-shrink:0" alt="">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;color:#1a1310">Agregar al inicio</div>
          <div style="font-size:12px;color:#4a3f3a;margin-top:2px">Accedé rápido desde tu pantalla de inicio</div>
        </div>
        <button id="pwa-install-btn" style="background:#7a1f2b;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit">Instalar</button>
        <button id="pwa-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#4a3f3a;padding:4px 8px;flex-shrink:0">×</button>
      `, async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        document.getElementById('pwa-banner')?.remove();
      });
    }, 3000);
  });

  /* iOS: instrucciones "Compartir → Agregar a inicio" */
  if (isIOS) {
    setTimeout(() => {
      crearBanner(`
        <img src="icon.svg" width="42" height="42" style="border-radius:10px;flex-shrink:0" alt="">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;color:#1a1310">Guardar acceso directo</div>
          <div style="font-size:12px;color:#4a3f3a;margin-top:2px">Tocá <strong>Compartir</strong> <span style="font-size:14px">⬆️</span> y luego <strong>"Agregar a inicio"</strong></div>
        </div>
        <button id="pwa-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#4a3f3a;padding:4px 8px;flex-shrink:0">×</button>
      `);
    }, 3000);
  }
})();
