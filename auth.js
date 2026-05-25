/* =========================================================================
   AUTH — Gestión de sesión con Supabase Auth (supabase-js CDN)
   Se carga después de supabase-config.js y supabase-js CDN.
   ========================================================================= */

const _sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
window._sb = _sb;

const Auth = {

  /* Inicializa la sesión y escucha cambios. Llamar con await en DOMContentLoaded. */
  async init() {
    const { data: { session } } = await _sb.auth.getSession();
    window._authToken = session?.access_token || null;
    window._userId    = session?.user?.id      || null;

    if (session) {
      // Registrar ingreso en background (no bloquea la carga)
      _sb.rpc('registrar_ingreso').then(() => {});
    }

    _sb.auth.onAuthStateChange((_event, session) => {
      window._authToken = session?.access_token || null;
    });

    return session;
  },

  async getSession() {
    const { data: { session } } = await _sb.auth.getSession();
    return session;
  },

  /* Devuelve el perfil del usuario logueado (con rol) o null */
  async getProfile() {
    if (!window._authToken) return null;
    const { data: { session } } = await _sb.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    const { data, error } = await _sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return error ? null : data;
  },

  async login(email, password) {
    return _sb.auth.signInWithPassword({ email, password });
  },

  async register(email, password, perfil) {
    return _sb.auth.signUp({
      email,
      password,
      options: {
        data: perfil,
        emailRedirectTo: 'https://feders77.github.io/centro-estudiantes-ues/login.html'
      }
    });
  },

  async logout() {
    window._authToken = null;
    await _sb.auth.signOut();
    window.location.href = 'login.html';
  },

  async resetPassword(email) {
    return _sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://feders77.github.io/centro-estudiantes-ues/login.html'
    });
  },

  /* Actualiza el chip de usuario en el header con datos reales */
  updateChip(profile) {
    const chip = document.querySelector('.user-chip');
    if (!chip) return;

    // Ocultar/mostrar link admin en topbar Y footer
    const _setAdminVisible = (visible) => {
      document.querySelectorAll('a[href="admin.html"]').forEach(el => {
        el.style.display = visible ? '' : 'none';
      });
    };

    if (!profile) {
      chip.outerHTML = `<a href="login.html" class="btn btn-ghost" style="font-size:13px;padding:8px 16px;opacity:1">Iniciar sesión</a>`;
      _setAdminVisible(false);
      return;
    }

    const display = profile.alias || profile.nombre;
    const initials = ((profile.nombre?.[0] || '') + (profile.apellido?.[0] || '')).toUpperCase() || '??';
    const curso = profile.anio ? `${profile.anio}°` : '';
    const avatarInner = profile.avatar_url
      ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`
      : initials;

    chip.innerHTML = `
      <div class="avatar">${avatarInner}</div>
      <span>${escapeHtml(display)}${curso ? ' · ' + curso : ''}</span>`;
    chip.style.opacity = '1';
    chip.style.cursor = 'pointer';

    if (!chip.parentElement.classList.contains('chip-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'chip-wrapper';
      chip.parentNode.insertBefore(wrapper, chip);
      wrapper.appendChild(chip);

      const menu = document.createElement('div');
      menu.className = 'chip-menu';
      menu.innerHTML = `
        <a href="perfil.html">👤 Mi perfil</a>
        <div class="menu-sep"></div>
        <button type="button">🚪 Cerrar sesión</button>`;
      wrapper.appendChild(menu);

      menu.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        Auth.logout();
      });
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      document.addEventListener('click', () => menu.classList.remove('open'));
    }

    _setAdminVisible(profile.rol === 'administrador');
  },

  /* Redirige a login.html si no hay sesión o el rol no está en la lista */
  async requireRol(roles = ['alumno', 'administrador']) {
    const session = await this.getSession();
    if (!session) { window.location.href = 'login.html'; return null; }
    const profile = await this.getProfile();
    if (!profile || !roles.includes(profile.rol)) return null;
    return profile;
  }
};

/* =========================================================================
   HAMBURGER MENU — inyecta botón y panel móvil en cualquier página
   ========================================================================= */
function _setupHamburger() {
  const header = document.querySelector('header');
  const navEl  = header ? header.querySelector('nav ul') : null;
  if (!header || !navEl || document.getElementById('hamburger')) return;

  const hamburger = document.createElement('button');
  hamburger.id    = 'hamburger';
  hamburger.type  = 'button';
  hamburger.className = 'hamburger';
  hamburger.setAttribute('aria-label', 'Menú');
  hamburger.innerHTML = '<span></span><span></span><span></span>';
  header.insertBefore(hamburger, header.lastElementChild);

  const links = Array.from(navEl.querySelectorAll('a')).map(a => {
    const href = a.getAttribute('href') || '#';
    const cls  = a.className;
    return `<a href="${href}"${cls ? ` class="${cls}"` : ''}>${a.textContent}</a>`;
  }).join('');

  const panel = document.createElement('div');
  panel.id        = 'nav-mobile-panel';
  panel.className = 'nav-mobile-panel';
  panel.innerHTML = `<div class="nav-mobile-inner">
    <div class="nav-mobile-close">
      <button type="button" aria-label="Cerrar menú">✕</button>
    </div>
    ${links}
  </div>`;
  document.body.appendChild(panel);

  const closePanel = () => {
    hamburger.classList.remove('open');
    panel.classList.remove('open');
  };

  panel.querySelector('.nav-mobile-close button').addEventListener('click', closePanel);
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburger.classList.toggle('open');
    panel.classList.toggle('open');
  });
  panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
}

document.addEventListener('DOMContentLoaded', _setupHamburger);
