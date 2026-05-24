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
    const { data, error } = await _sb
      .from('profiles')
      .select('*')
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

    if (!profile) {
      chip.outerHTML = `<a href="login.html" class="btn btn-ghost" style="font-size:13px;padding:8px 16px">Iniciar sesión</a>`;
      return;
    }

    const display = profile.alias || profile.nombre;
    const initials = ((profile.nombre?.[0] || '') + (profile.apellido?.[0] || '')).toUpperCase() || '??';
    const curso = profile.anio
      ? `${profile.anio}° ${profile.nivel === 'primaria' ? 'gr.' : ''}`
      : '';

    chip.innerHTML = `
      <div class="avatar">${initials}</div>
      <span>${escapeHtml(display)}${curso ? ' · ' + curso : ''}</span>`;

    chip.style.cursor = 'pointer';
    chip.onclick = () => {
      if (confirm('¿Cerrar sesión?')) Auth.logout();
    };
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
