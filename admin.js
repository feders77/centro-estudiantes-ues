/* =========================================================================
   ADMIN — Lógica del panel de administración (versión Supabase async)
   ========================================================================= */

/* ---------- cache en memoria para no hacer fetch en cada render ---------- */
let _cache = {
  novedades:   [],
  eventos:     [],
  votaciones:  [],
  apuntes:     [],
  marketplace: [],
  buzon_casos: []
};

async function loadAll() {
  const [novedades, eventos, votaciones, apuntes, marketplace] = await Promise.all([
    Store.list('novedades'),
    Store.list('eventos'),
    Store.list('votaciones'),
    Store.list('apuntes'),
    Store.list('marketplace')
  ]);
  _cache = { novedades, eventos, votaciones, apuntes, marketplace, buzon_casos: [] };
  await recargarBuzon();
}

async function recargarBuzon() {
  try {
    const r = await _get('/buzon_casos?order=created_at.desc');
    _cache.buzon_casos = r || [];
  } catch { _cache.buzon_casos = []; }
}

async function recargar(coleccion) {
  _cache[coleccion] = await Store.list(coleccion);
}

/* ---------- NAVEGACIÓN ENTRE SECCIONES ---------- */
document.querySelectorAll('.admin-nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const section = link.dataset.section;
    document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-section-id="${section}"]`).classList.add('active');
    if (section === 'config')       cargarConfig();
    if (section === 'usuarios')     verTab(_tabUsuarios);
    if (section === 'secciones')    cargarSecciones();
    if (section === 'emails')       cargarEmailTemplates();
    if (section === 'comentarios')  cargarTodosComentarios();
  });
});

/* ---------- TOAST ---------- */
function toast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + tipo;
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- MODALES ---------- */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) o.classList.remove('open');
  });
});

/* ========================================================================
   NOVEDADES
   ======================================================================== */

function renderNovedades() {
  const lista = _cache.novedades;
  const cont = document.getElementById('tabla-novedades');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">
      <h3>Sin novedades cargadas</h3>
      <p>Creá la primera con el botón "+ Nueva novedad"</p>
    </div>`;
    return;
  }
  cont.innerHTML = lista.map(n => `
    <div class="data-row ${n.activa ? '' : 'inactive'}">
      <div class="data-info">
        <h5 class="data-title">${escapeHtml(n.titulo)}</h5>
        <div class="data-meta">
          ${n.tag ? `<span class="tag ${n.tagTipo || ''}">${escapeHtml(n.tag)}</span>` : ''}
          <span>👤 ${escapeHtml(n.autor)}</span>
          <span>📅 ${formatFechaRelativa(n.fecha)}</span>
        </div>
      </div>
      <div class="data-actions">
        <button class="icon-btn ${n.activa ? 'on' : 'off'}" onclick="toggleNovedad('${n.id}')" title="${n.activa ? 'Visible' : 'Oculta'}">
          ${n.activa ? '👁' : '🙈'}
        </button>
        <button class="icon-btn" onclick="editarNovedad('${n.id}')" title="Editar">✏️</button>
        <button class="icon-btn danger" onclick="borrarNovedad('${n.id}')" title="Borrar">🗑</button>
      </div>
    </div>
  `).join('');
}

function openNovedadModal() {
  document.getElementById('modal-novedad-title').textContent = 'Nueva novedad';
  document.getElementById('nov-id').value = '';
  document.getElementById('nov-titulo').value = '';
  document.getElementById('nov-texto').value = '';
  document.getElementById('nov-tag').value = '';
  document.getElementById('nov-tagTipo').value = '';
  document.getElementById('nov-autor').value = 'Centro de Estudiantes';
  document.getElementById('nov-activa').checked = true;
  openModal('modal-novedad');
}

function editarNovedad(id) {
  const n = _cache.novedades.find(x => x.id === id);
  if (!n) return;
  document.getElementById('modal-novedad-title').textContent = 'Editar novedad';
  document.getElementById('nov-id').value = n.id;
  document.getElementById('nov-titulo').value = n.titulo;
  document.getElementById('nov-texto').value = n.texto;
  document.getElementById('nov-tag').value = n.tag || '';
  document.getElementById('nov-tagTipo').value = n.tagTipo || '';
  document.getElementById('nov-autor').value = n.autor;
  document.getElementById('nov-activa').checked = n.activa !== false;
  openModal('modal-novedad');
}

async function guardarNovedad(e) {
  e.preventDefault();
  const id = document.getElementById('nov-id').value;
  const data = {
    titulo:  document.getElementById('nov-titulo').value.trim(),
    texto:   document.getElementById('nov-texto').value.trim(),
    tag:     document.getElementById('nov-tag').value.trim(),
    tagTipo: document.getElementById('nov-tagTipo').value,
    autor:   document.getElementById('nov-autor').value.trim(),
    activa:  document.getElementById('nov-activa').checked
  };
  if (id) {
    await Store.update('novedades', id, data);
    toast('✓ Novedad actualizada', 'success');
  } else {
    await Store.add('novedades', { ...data, fecha: new Date().toISOString(), likes: 0, comentarios: 0 });
    toast('✓ Novedad creada', 'success');
  }
  closeModal('modal-novedad');
  await recargar('novedades');
  renderTodo();
}

async function toggleNovedad(id) {
  const n = _cache.novedades.find(x => x.id === id);
  if (!n) return;
  await Store.update('novedades', id, { activa: !n.activa });
  toast(n.activa ? 'Novedad oculta' : 'Novedad visible', 'success');
  await recargar('novedades');
  renderTodo();
}

async function borrarNovedad(id) {
  if (!confirm('¿Borrar esta novedad? No se puede deshacer.')) return;
  await Store.remove('novedades', id);
  await recargar('novedades');
  renderTodo();
  toast('Novedad eliminada', 'success');
}

/* ========================================================================
   EVENTOS
   ======================================================================== */

function renderEventos() {
  const lista = [..._cache.eventos].sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
  const cont = document.getElementById('tabla-eventos');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">
      <h3>Sin eventos cargados</h3>
      <p>Creá el primero con el botón "+ Nuevo evento"</p>
    </div>`;
    return;
  }
  cont.innerHTML = lista.map(e => {
    const fechaF = new Date(e.fecha).toLocaleString('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    return `
    <div class="data-row">
      <div class="data-info">
        <h5 class="data-title">${e.destacado ? '⭐ ' : ''}${escapeHtml(e.titulo)}</h5>
        <div class="data-meta">
          <span class="tag ${e.categoria}">${escapeHtml(e.categoria)}</span>
          <span>📅 ${fechaF}</span>
          ${e.lugar ? `<span>📍 ${escapeHtml(e.lugar)}</span>` : ''}
        </div>
      </div>
      <div class="data-actions">
        <button class="icon-btn" onclick="editarEvento('${e.id}')" title="Editar">✏️</button>
        <button class="icon-btn danger" onclick="borrarEvento('${e.id}')" title="Borrar">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function openEventoModal() {
  document.getElementById('modal-evento-title').textContent = 'Nuevo evento';
  document.getElementById('ev-id').value = '';
  document.getElementById('ev-titulo').value = '';
  document.getElementById('ev-descripcion').value = '';
  document.getElementById('ev-fecha').value = '';
  document.getElementById('ev-lugar').value = '';
  document.getElementById('ev-categoria').value = 'centro';
  document.getElementById('ev-destacado').checked = false;
  openModal('modal-evento');
}

function editarEvento(id) {
  const e = _cache.eventos.find(x => x.id === id);
  if (!e) return;
  document.getElementById('modal-evento-title').textContent = 'Editar evento';
  document.getElementById('ev-id').value = e.id;
  document.getElementById('ev-titulo').value = e.titulo;
  document.getElementById('ev-descripcion').value = e.descripcion || '';
  document.getElementById('ev-fecha').value = e.fecha.slice(0,16);
  document.getElementById('ev-lugar').value = e.lugar || '';
  document.getElementById('ev-categoria').value = e.categoria || 'centro';
  document.getElementById('ev-destacado').checked = !!e.destacado;
  openModal('modal-evento');
}

async function guardarEvento(e) {
  e.preventDefault();
  const id = document.getElementById('ev-id').value;
  const data = {
    titulo:      document.getElementById('ev-titulo').value.trim(),
    descripcion: document.getElementById('ev-descripcion').value.trim(),
    fecha:       document.getElementById('ev-fecha').value + ':00',
    lugar:       document.getElementById('ev-lugar').value.trim(),
    categoria:   document.getElementById('ev-categoria').value,
    destacado:   document.getElementById('ev-destacado').checked
  };
  if (id) {
    await Store.update('eventos', id, data);
    toast('✓ Evento actualizado', 'success');
  } else {
    await Store.add('eventos', data);
    toast('✓ Evento creado', 'success');
  }
  closeModal('modal-evento');
  await recargar('eventos');
  renderTodo();
}

async function borrarEvento(id) {
  if (!confirm('¿Borrar este evento?')) return;
  await Store.remove('eventos', id);
  await recargar('eventos');
  renderTodo();
  toast('Evento eliminado', 'success');
}

/* ========================================================================
   VOTACIONES
   ======================================================================== */

function renderVotaciones() {
  const lista = _cache.votaciones;
  const cont = document.getElementById('tabla-votaciones');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">
      <h3>Sin votaciones</h3>
      <p>Creá una con el botón "+ Nueva votación"</p>
    </div>`;
    return;
  }
  cont.innerHTML = lista.map(v => {
    const totalVotos = (v.opciones || []).reduce((s,o) => s + (o.votos||0), 0);
    return `
    <div class="data-row">
      <div class="data-info">
        <h5 class="data-title">${escapeHtml(v.titulo)}</h5>
        <div class="data-meta">
          <span class="tag ${v.estado === 'abierta' ? 'vote' : ''}">${v.estado}</span>
          ${v.vinculante ? '<span class="tag urgent">🔗 vinculante</span>' : ''}
          <span>📊 ${totalVotos} votos · ${(v.opciones||[]).length} opciones</span>
          <span>⏰ Cierra: ${new Date(v.cierre).toLocaleDateString('es-AR')}</span>
        </div>
      </div>
      <div class="data-actions">
        <button class="icon-btn" onclick="toggleVotacion('${v.id}')" title="${v.estado === 'abierta' ? 'Cerrar' : 'Reabrir'}">
          ${v.estado === 'abierta' ? '🔒' : '🔓'}
        </button>
        <button class="icon-btn" onclick="editarVotacion('${v.id}')" title="Editar">✏️</button>
        <button class="icon-btn danger" onclick="borrarVotacion('${v.id}')" title="Borrar">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function openVotacionModal() {
  document.getElementById('modal-votacion-title').textContent = 'Nueva votación';
  document.getElementById('vt-id').value = '';
  document.getElementById('vt-titulo').value = '';
  document.getElementById('vt-descripcion').value = '';
  document.getElementById('vt-cierre').value = '';
  document.getElementById('vt-estado').value = 'abierta';
  document.getElementById('vt-opciones').value = '';
  document.getElementById('vt-vinculante').checked = false;
  openModal('modal-votacion');
}

function editarVotacion(id) {
  const v = _cache.votaciones.find(x => x.id === id);
  if (!v) return;
  document.getElementById('modal-votacion-title').textContent = 'Editar votación';
  document.getElementById('vt-id').value = v.id;
  document.getElementById('vt-titulo').value = v.titulo;
  document.getElementById('vt-descripcion').value = v.descripcion || '';
  document.getElementById('vt-cierre').value = v.cierre.slice(0,16);
  document.getElementById('vt-estado').value = v.estado;
  document.getElementById('vt-opciones').value = (v.opciones||[]).map(o => o.texto).join('\n');
  document.getElementById('vt-vinculante').checked = !!v.vinculante;
  openModal('modal-votacion');
}

async function guardarVotacion(e) {
  e.preventDefault();
  const id = document.getElementById('vt-id').value;
  const textoOpciones = document.getElementById('vt-opciones').value
    .split('\n').map(s => s.trim()).filter(s => s.length > 0);

  if (textoOpciones.length < 2) {
    toast('Necesitás al menos 2 opciones', 'error');
    return;
  }

  let opciones;
  if (id) {
    const v = _cache.votaciones.find(x => x.id === id);
    opciones = textoOpciones.map((t, i) => {
      const existente = (v.opciones || []).find(o => o.texto === t);
      return { id: 'o' + (i+1), texto: t, votos: existente ? existente.votos : 0 };
    });
  } else {
    opciones = textoOpciones.map((t, i) => ({ id: 'o' + (i+1), texto: t, votos: 0 }));
  }

  const data = {
    titulo:         document.getElementById('vt-titulo').value.trim(),
    descripcion:    document.getElementById('vt-descripcion').value.trim(),
    cierre:         document.getElementById('vt-cierre').value + ':00',
    estado:         document.getElementById('vt-estado').value,
    vinculante:     document.getElementById('vt-vinculante').checked,
    opciones,
    participantes:  opciones.reduce((s,o) => s + o.votos, 0),
    totalElegibles: 580
  };

  if (id) {
    await Store.update('votaciones', id, data);
    toast('✓ Votación actualizada', 'success');
  } else {
    await Store.add('votaciones', data);
    toast('✓ Votación creada', 'success');
  }
  closeModal('modal-votacion');
  await recargar('votaciones');
  renderTodo();
}

async function toggleVotacion(id) {
  const v = _cache.votaciones.find(x => x.id === id);
  if (!v) return;
  const nuevoEstado = v.estado === 'abierta' ? 'cerrada' : 'abierta';
  await Store.update('votaciones', id, { estado: nuevoEstado });
  await recargar('votaciones');
  renderTodo();
  toast('Votación ' + nuevoEstado, 'success');
}

async function borrarVotacion(id) {
  if (!confirm('¿Borrar esta votación? Se pierden todos los votos.')) return;
  await Store.remove('votaciones', id);
  await recargar('votaciones');
  renderTodo();
  toast('Votación eliminada', 'success');
}

/* ========================================================================
   APUNTES
   ======================================================================== */

function renderApuntes() {
  const lista = _cache.apuntes;
  const cont = document.getElementById('tabla-apuntes');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">
      <h3>Sin apuntes</h3>
      <p>Cuando los alumnos suban apuntes desde el sitio, vas a poder moderarlos acá.</p>
    </div>`;
    return;
  }
  cont.innerHTML = lista.map(ap => {
    const curso = `${ap.anio}°${ap.orientacion ? ' ' + ap.orientacion : ''}${ap.division ? ' ' + ap.division : ''}`;
    return `
    <div class="data-row ${ap.activo === false ? 'inactive' : ''}">
      <div class="data-info">
        <h5 class="data-title">${escapeHtml(ap.titulo)}</h5>
        <div class="data-meta">
          <span class="tag">${escapeHtml(ap.tipo || '')}</span>
          <span>📘 ${escapeHtml(ap.materia)}</span>
          <span>🎓 ${escapeHtml(curso)}</span>
          <span>👤 ${escapeHtml(ap.autorNombre)}</span>
          <span>📅 ${formatFechaRelativa(ap.fecha)}</span>
        </div>
      </div>
      <div class="data-actions">
        <button class="icon-btn ${ap.activo !== false ? 'on' : 'off'}" onclick="toggleApunte('${ap.id}')" title="${ap.activo !== false ? 'Visible' : 'Oculto'}">
          ${ap.activo !== false ? '👁' : '🙈'}
        </button>
        <button class="icon-btn danger" onclick="borrarApunte('${ap.id}')" title="Borrar">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function toggleApunte(id) {
  const a = _cache.apuntes.find(x => x.id === id);
  if (!a) return;
  await Store.update('apuntes', id, { activo: a.activo === false ? true : false });
  await recargar('apuntes');
  renderTodo();
  toast('Apunte actualizado', 'success');
}

async function borrarApunte(id) {
  if (!confirm('¿Borrar este apunte?')) return;
  await Store.remove('apuntes', id);
  await recargar('apuntes');
  renderTodo();
  toast('Apunte eliminado', 'success');
}

/* ========================================================================
   MARKETPLACE
   ======================================================================== */

function renderMarketplace() {
  const lista = _cache.marketplace;
  const cont = document.getElementById('tabla-marketplace');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">
      <h3>Sin publicaciones</h3>
      <p>Los alumnos van a publicar desde el sitio público.</p>
    </div>`;
    return;
  }
  cont.innerHTML = lista.map(p => `
    <div class="data-row ${p.activo === false ? 'inactive' : ''}">
      <div class="data-info">
        <h5 class="data-title">${escapeHtml(p.titulo)}</h5>
        <div class="data-meta">
          <span class="tag ${p.tipo === 'busca' ? 'urgent' : (p.tipo === 'regala' ? 'vote' : '')}">${p.tipo}</span>
          <span>📁 ${escapeHtml(p.categoria)}</span>
          <span>💰 ${formatPrecio(p.precio)}</span>
          <span>👤 ${escapeHtml(p.vendedor)} · ${escapeHtml(p.curso)}</span>
        </div>
      </div>
      <div class="data-actions">
        <button class="icon-btn ${p.activo !== false ? 'on' : 'off'}" onclick="toggleMP('${p.id}')" title="${p.activo !== false ? 'Visible' : 'Oculta'}">
          ${p.activo !== false ? '👁' : '🙈'}
        </button>
        <button class="icon-btn danger" onclick="borrarMP('${p.id}')" title="Borrar">🗑</button>
      </div>
    </div>
  `).join('');
}

async function toggleMP(id) {
  const p = _cache.marketplace.find(x => x.id === id);
  if (!p) return;
  await Store.update('marketplace', id, { activo: p.activo === false ? true : false });
  await recargar('marketplace');
  renderTodo();
}

async function borrarMP(id) {
  if (!confirm('¿Borrar esta publicación?')) return;
  await Store.remove('marketplace', id);
  await recargar('marketplace');
  renderTodo();
  toast('Publicación eliminada', 'success');
}

/* ========================================================================
   CONFIG
   ======================================================================== */

async function cargarConfig() {
  const [c, { data: heroRow }] = await Promise.all([
    Store.getConfig(),
    window._sb.from('config').select('value').eq('key', 'hero').maybeSingle()
  ]);
  document.getElementById('cfg-destino').value    = c.viajeDestino     || '';
  document.getElementById('cfg-fecha').value      = (c.viajeFecha||'').slice(0,16);
  document.getElementById('cfg-confirmados').value = c.viajeConfirmados || 0;
  document.getElementById('cfg-total').value      = c.viajeTotal       || 0;
  document.getElementById('cfg-nota').value       = c.viajeNota        || '';

  const hero = heroRow?.value || {};
  document.getElementById('cfg-hero-eyebrow').value     = hero.eyebrow     || '';
  document.getElementById('cfg-hero-titulo').value      = hero.titulo      || '';
  document.getElementById('cfg-hero-descripcion').value = hero.descripcion || '';

  const prevEl    = document.getElementById('cfg-logo-preview');
  const removeBtn = document.getElementById('cfg-logo-remove');
  if (hero.logo_url) {
    prevEl.src = hero.logo_url;
    prevEl.style.display = 'block';
    removeBtn.style.display = '';
  } else {
    prevEl.style.display = 'none';
    removeBtn.style.display = 'none';
  }
}

async function guardarHeroConfig() {
  const eyebrow     = document.getElementById('cfg-hero-eyebrow').value.trim();
  const titulo      = document.getElementById('cfg-hero-titulo').value.trim();
  const descripcion = document.getElementById('cfg-hero-descripcion').value.trim();
  // Mantener logo_url existente
  const { data: existing } = await window._sb.from('config').select('value').eq('key','hero').maybeSingle();
  const logo_url = existing?.value?.logo_url || '';
  const { error } = await window._sb
    .from('config')
    .upsert({ key: 'hero', value: { eyebrow, titulo, descripcion, logo_url } }, { onConflict: 'key' });
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('✓ Portada actualizada', 'success');
}

async function subirLogoAdmin(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('La imagen no puede superar 2 MB', 'error'); input.value = ''; return; }
  toast('Subiendo logo...', '');
  const ext  = file.name.split('.').pop().toLowerCase() || 'png';
  const path = `logo/main.${ext}`;
  const { error: upErr } = await window._sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) { toast('Error al subir: ' + upErr.message, 'error'); input.value = ''; return; }
  const { data: urlData } = window._sb.storage.from('avatars').getPublicUrl(path);
  const logo_url = urlData.publicUrl + '?t=' + Date.now();
  const { data: existing } = await window._sb.from('config').select('value').eq('key','hero').maybeSingle();
  const val = { ...(existing?.value || {}), logo_url };
  await window._sb.from('config').upsert({ key: 'hero', value: val }, { onConflict: 'key' });
  const prevEl = document.getElementById('cfg-logo-preview');
  prevEl.src = logo_url;
  prevEl.style.display = 'block';
  document.getElementById('cfg-logo-remove').style.display = '';
  toast('✓ Logo actualizado', 'success');
  input.value = '';
}

async function quitarLogo() {
  if (!confirm('¿Quitar el logo personalizado y volver al logo por defecto?')) return;
  const { data: existing } = await window._sb.from('config').select('value').eq('key','hero').maybeSingle();
  const val = { ...(existing?.value || {}), logo_url: '' };
  await window._sb.from('config').upsert({ key: 'hero', value: val }, { onConflict: 'key' });
  document.getElementById('cfg-logo-preview').style.display = 'none';
  document.getElementById('cfg-logo-remove').style.display = 'none';
  toast('Logo quitado — se usa el logo por defecto', 'success');
}

async function guardarConfig() {
  await Store.setConfig({
    viajeDestino:     document.getElementById('cfg-destino').value.trim(),
    viajeFecha:       document.getElementById('cfg-fecha').value + ':00',
    viajeConfirmados: parseInt(document.getElementById('cfg-confirmados').value || 0),
    viajeTotal:       parseInt(document.getElementById('cfg-total').value || 0),
    viajeNota:        document.getElementById('cfg-nota').value.trim()
  });
  toast('✓ Configuración guardada', 'success');
}

/* ========================================================================
   EXPORT / IMPORT
   ======================================================================== */

async function exportarDatos() {
  const json = await Store.exportAll();
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `centro-estudiantes-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Archivo descargado', 'success');
}

async function importarDatos() {
  const file = document.getElementById('import-file').files[0];
  if (!file) { toast('Elegí un archivo primero', 'error'); return; }
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      await Store.importAll(e.target.result);
      await loadAll();
      renderTodo();
      toast('✓ Datos importados correctamente', 'success');
    } catch (err) {
      toast('Error al importar: archivo inválido', 'error');
    }
  };
  reader.readAsText(file);
}

async function resetTodo() {
  await Store.reset(); // Store.reset ya pide confirm internamente
  await loadAll();
  renderTodo();
}

/* ========================================================================
   RESUMEN
   ======================================================================== */

function renderResumen() {
  const { novedades, eventos, votaciones, apuntes, marketplace } = _cache;
  const ahora = new Date();

  document.getElementById('stat-novedades').textContent  = novedades.filter(n => n.activa).length;
  document.getElementById('stat-eventos').textContent    = eventos.filter(e => new Date(e.fecha) > ahora).length;
  document.getElementById('stat-votaciones').textContent = votaciones.filter(v => v.estado === 'abierta').length;
  document.getElementById('stat-apuntes').textContent    = apuntes.filter(a => a.activo !== false).length;

  document.getElementById('count-novedades').textContent  = novedades.length;
  document.getElementById('count-eventos').textContent    = eventos.length;
  document.getElementById('count-votaciones').textContent = votaciones.length;
  document.getElementById('count-apuntes').textContent    = apuntes.length;
  document.getElementById('count-marketplace').textContent = marketplace.length;

  const items = [];
  novedades.forEach(n  => items.push({ tipo:'Novedad',      titulo:n.titulo, fecha:n.fecha, icono:'📢' }));
  apuntes.forEach(a    => items.push({ tipo:'Apunte',       titulo:a.titulo, fecha:a.fecha, icono:'📚' }));
  marketplace.forEach(m => items.push({ tipo:'Marketplace', titulo:m.titulo, fecha:m.fecha, icono:'🔁' }));
  items.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  const recientes = items.slice(0,6);

  const cont = document.getElementById('actividad-reciente');
  if (!recientes.length) {
    cont.innerHTML = `<div class="empty-state"><p>Sin actividad por ahora.</p></div>`;
  } else {
    cont.innerHTML = recientes.map(r => `
      <div class="data-row">
        <div class="data-info">
          <h5 class="data-title">${r.icono} ${escapeHtml(r.titulo)}</h5>
          <div class="data-meta">
            <span class="tag">${r.tipo}</span>
            <span>📅 ${formatFechaRelativa(r.fecha)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
}

/* ========================================================================
   RENDER GLOBAL
   ======================================================================== */

function renderTodo() {
  renderResumen();
  renderNovedades();
  renderEventos();
  renderVotaciones();
  renderApuntes();
  renderMarketplace();
  renderBuzon();
}

/* ========================================================================
   BUZON CASOS
   ======================================================================== */

function renderBuzon() {
  const lista = _cache.buzon_casos;
  const cont  = document.getElementById('tabla-buzon');
  if (!cont) return;

  const countEl = document.getElementById('count-buzon');
  if (countEl) countEl.textContent = lista.length;

  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">
      <h3>Sin casos cargados</h3>
      <p>Creá el primero con el botón "+ Nuevo caso"</p>
    </div>`;
    return;
  }

  const estadoBadge = { resuelto: '✓ Resuelto', gestion: '⚙ En gestión', recibido: '● Recibido' };
  cont.innerHTML = lista.map(c => `
    <div class="data-row">
      <div class="data-info">
        <h5 class="data-title">${escapeHtml(c.titulo)}</h5>
        <div class="data-meta">
          <span class="tag ${c.estado}">${estadoBadge[c.estado] || c.estado}</span>
          <span>📁 ${escapeHtml(c.categoria || 'Sin categoría')}</span>
          <span>#${escapeHtml(c.numero)}</span>
          ${c.dias_gestion > 0 ? `<span>${c.dias_gestion} días en gestión</span>` : ''}
          <span>👏 ${c.agradecimientos}</span>
        </div>
      </div>
      <div class="data-actions">
        <button class="icon-btn" onclick="openCasoModal('${c.id}')" title="Editar">✏️</button>
        <button class="icon-btn danger" onclick="borrarCaso('${c.id}')" title="Borrar">🗑</button>
      </div>
    </div>`).join('');
}

function openCasoModal(id) {
  const c = id ? _cache.buzon_casos.find(x => x.id === id) : null;
  document.getElementById('modal-caso-title').textContent = c ? 'Editar caso' : 'Nuevo caso';
  document.getElementById('caso-id').value               = c ? c.id : '';
  document.getElementById('caso-numero').value           = c ? c.numero : '';
  document.getElementById('caso-estado').value           = c ? c.estado : 'recibido';
  document.getElementById('caso-titulo').value           = c ? c.titulo : '';
  document.getElementById('caso-descripcion').value      = c ? c.descripcion : '';
  document.getElementById('caso-categoria').value        = c ? (c.categoria || '') : '';
  document.getElementById('caso-dias').value             = c ? (c.dias_gestion || 0) : 0;
  document.getElementById('caso-agradecimientos').value  = c ? (c.agradecimientos || 0) : 0;
  openModal('modal-caso');
}

async function guardarCaso(e) {
  e.preventDefault();
  const id = document.getElementById('caso-id').value;
  const data = {
    numero:          document.getElementById('caso-numero').value.trim(),
    estado:          document.getElementById('caso-estado').value,
    titulo:          document.getElementById('caso-titulo').value.trim(),
    descripcion:     document.getElementById('caso-descripcion').value.trim(),
    categoria:       document.getElementById('caso-categoria').value.trim() || 'Otro',
    dias_gestion:    parseInt(document.getElementById('caso-dias').value) || 0,
    agradecimientos: parseInt(document.getElementById('caso-agradecimientos').value) || 0
  };
  try {
    if (id) {
      await _patch(`/buzon_casos?id=eq.${id}`, data);
      toast('✓ Caso actualizado', 'success');
    } else {
      await _post('/buzon_casos', data);
      toast('✓ Caso publicado', 'success');
    }
    closeModal('modal-caso');
    await recargarBuzon();
    renderTodo();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

async function borrarCaso(id) {
  if (!confirm('¿Borrar este caso del buzón? No se puede deshacer.')) return;
  try {
    await _delete(`/buzon_casos?id=eq.${id}`);
    await recargarBuzon();
    renderTodo();
    toast('Caso eliminado', 'success');
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

/* ========================================================================
   SECCIONES
   ======================================================================== */

let _secciones = [];

async function cargarSecciones() {
  const { data } = await window._sb.from('config_secciones').select('*').order('clave');
  _secciones = data || [];
  renderSecciones();
}

function renderSecciones() {
  const cont = document.getElementById('secciones-lista');
  if (!cont || !_secciones.length) return;

  cont.innerHTML = _secciones.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--line)">
      <div>
        <div style="font-weight:600;font-size:14px">${escapeHtml(s.label)}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-top:2px">${s.habilitada ? '✅ Activa — visible para los alumnos' : '⏸ Desactivada — muestra "Próximamente"'}</div>
      </div>
      <label class="toggle-pill" title="${s.habilitada ? 'Desactivar' : 'Activar'}">
        <input type="checkbox" ${s.habilitada ? 'checked' : ''} onchange="toggleSeccion('${s.clave}', this.checked)">
        <span></span>
      </label>
    </div>`).join('').replace(/<div[^>]*style="[^"]*border-bottom[^"]*"[^>]*>(?=[\s\S]*?$)/, s => s.replace('border-bottom:1px solid var(--line)', 'border-bottom:none'));
}

async function toggleSeccion(clave, habilitada) {
  const { error } = await window._sb
    .from('config_secciones')
    .update({ habilitada, updated_at: new Date().toISOString() })
    .eq('clave', clave);
  if (error) { toast('Error al guardar: ' + error.message, 'error'); await cargarSecciones(); return; }
  const s = _secciones.find(x => x.clave === clave);
  toast(`${s?.label || clave} ${habilitada ? 'activada' : 'desactivada'}`, 'success');
  await cargarSecciones();
}

/* ========================================================================
   EMAIL TEMPLATES
   ======================================================================== */

let _templates = [];

const TPL_LABELS = {
  invitacion:         'Invitación',
  confirmacion_email: 'Confirmación de email',
  recuperar_password: 'Recuperar contraseña'
};

async function cargarEmailTemplates() {
  const { data } = await window._sb.from('email_templates').select('*').order('tipo');
  _templates = data || [];
  renderEmailTemplatesList();
}

function renderEmailTemplatesList() {
  const cont = document.getElementById('email-tpl-lista');
  if (!cont) return;
  cont.innerHTML = _templates.map((t, i) => `
    <div onclick="editarTemplate('${t.tipo}')"
         style="padding:14px 18px;border-bottom:1px solid var(--line);cursor:pointer;transition:background .1s"
         onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''"
         id="tpl-item-${t.tipo}">
      <div style="font-weight:600;font-size:14px">${escapeHtml(TPL_LABELS[t.tipo] || t.tipo)}</div>
      <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.asunto)}</div>
    </div>`).join('');
}

function editarTemplate(tipo) {
  const t = _templates.find(x => x.tipo === tipo);
  if (!t) return;

  document.getElementById('tpl-tipo').value = tipo;
  document.getElementById('tpl-editor-titulo').textContent = TPL_LABELS[tipo] || tipo;
  document.getElementById('tpl-asunto').value = t.asunto;
  document.getElementById('tpl-cuerpo').value = t.cuerpo_html;
  document.getElementById('tpl-vars-hint').textContent =
    t.variables?.length ? 'Variables disponibles: ' + t.variables.join(', ') : '';

  const editor = document.getElementById('email-tpl-editor');
  editor.style.display = '';

  document.querySelectorAll('[id^="tpl-item-"]').forEach(el => el.style.fontWeight = '');
  const active = document.getElementById('tpl-item-' + tipo);
  if (active) active.style.background = 'var(--cream)';

  switchTemplateTab('code');
}

async function guardarTemplate(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-guardar-tpl');
  btn.disabled = true; btn.textContent = 'Guardando…';

  const tipo        = document.getElementById('tpl-tipo').value;
  const asunto      = document.getElementById('tpl-asunto').value.trim();
  const cuerpo_html = document.getElementById('tpl-cuerpo').value.trim();
  if (!cuerpo_html) { toast('El cuerpo del email no puede estar vacío', 'error'); btn.disabled = false; btn.textContent = 'Guardar y aplicar'; return; }

  try {
    const r = await fetch(window.SUPABASE_URL + '/functions/v1/actualizar-templates', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + window._authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, asunto, cuerpo_html })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Error');
    if (data.warning) toast('⚠️ ' + data.warning, '');
    else toast(data.supabase_updated ? '✓ Template guardado y aplicado en Supabase' : '✓ Template guardado', 'success');
    await cargarEmailTemplates();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar y aplicar';
  }
}

function previewTemplate() {
  const asunto = document.getElementById('tpl-asunto').value;
  const cuerpo = document.getElementById('tpl-cuerpo').value;
  document.getElementById('preview-subject').textContent = 'Asunto: ' + asunto;
  const iframe = document.getElementById('preview-iframe');
  iframe.srcdoc = `<!DOCTYPE html><html><body style="font-family:Inter Tight,sans-serif;font-size:14px;color:#1a1310;padding:20px;max-width:560px;margin:auto">${cuerpo}</body></html>`;
  openModal('modal-tpl-preview');
}

function switchTemplateTab(tab) {
  const textarea = document.getElementById('tpl-cuerpo');
  const iframe   = document.getElementById('tpl-iframe-inline');
  const tabCode  = document.getElementById('tpl-tab-code');
  const tabView  = document.getElementById('tpl-tab-view');
  if (!textarea) return;
  if (tab === 'code') {
    textarea.style.display = '';
    if (iframe)   iframe.style.display   = 'none';
    if (tabCode) { tabCode.style.background = 'var(--burgundy)'; tabCode.style.color = 'var(--cream)'; }
    if (tabView) { tabView.style.background = 'transparent';     tabView.style.color = 'var(--ink-soft)'; }
  } else {
    if (iframe) {
      iframe.srcdoc = `<!DOCTYPE html><html><body style="font-family:'Inter Tight',sans-serif;font-size:14px;color:#1a1310;padding:20px 24px;max-width:560px;margin:auto;line-height:1.6">${textarea.value}</body></html>`;
      iframe.style.display = '';
    }
    textarea.style.display = 'none';
    if (tabView) { tabView.style.background = 'var(--burgundy)'; tabView.style.color = 'var(--cream)'; }
    if (tabCode) { tabCode.style.background = 'transparent';     tabCode.style.color = 'var(--ink-soft)'; }
  }
}

/* ========================================================================
   USUARIOS
   ======================================================================== */

let _tabUsuarios = 'pendientes';
let _usuarios = [];
let _invitaciones = [];

async function cargarUsuarios() {
  const [{ data: usuarios, error }, { data: invs }] = await Promise.all([
    window._sb.from('profiles').select('*').order('created_at', { ascending: false }),
    window._sb.from('invitaciones').select('*').order('created_at', { ascending: false })
  ]);
  if (error) { toast('Error al cargar usuarios: ' + error.message, 'error'); return; }
  _usuarios     = usuarios || [];
  _invitaciones = invs || [];

  const pendientes = _usuarios.filter(u => u.rol === 'pendiente').length;
  document.getElementById('count-pendientes').textContent = pendientes || '0';
  document.getElementById('badge-pend').textContent = pendientes;

  _renderUserStats();
  _renderUserChart();
  verTab(_tabUsuarios);
}

function _renderUserStats() {
  const cont = document.getElementById('user-stats-row');
  if (!cont) return;
  const total    = _usuarios.length;
  const alumnos  = _usuarios.filter(u => u.rol === 'alumno').length;
  const admins   = _usuarios.filter(u => u.rol === 'administrador').length;
  const pend     = _usuarios.filter(u => u.rol === 'pendiente').length;

  // Nuevos en los últimos 30 días
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const nuevos = _usuarios.filter(u => u.created_at > hace30).length;

  const chip = (label, val, bg = 'var(--cream)', col = 'var(--ink)') =>
    `<div style="background:${bg};color:${col};border-radius:10px;padding:12px 18px;display:flex;flex-direction:column;gap:2px;min-width:90px">
      <span style="font-size:22px;font-weight:700;font-family:Fraunces,serif">${val}</span>
      <span style="font-size:11px;opacity:.75">${label}</span>
    </div>`;

  cont.innerHTML =
    chip('Total', total) +
    chip('Alumnos', alumnos, '#d8ecdc', '#2d6a3e') +
    chip('Admins', admins, '#e8dff5', '#5a2d8a') +
    chip('Pendientes', pend, '#fad6cd', '#a73a1f') +
    chip('Últimos 30 días', nuevos, 'var(--cream)', 'var(--ink)');
}

function _renderUserChart() {
  const wrap = document.getElementById('user-chart-wrap');
  const cont = document.getElementById('user-chart-svg');
  if (!wrap || !cont) return;

  const aprobados = _usuarios.filter(u => u.rol === 'alumno' || u.rol === 'administrador');
  if (!aprobados.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  // Agrupar por nivel+año
  const grupos = {};
  aprobados.forEach(u => {
    if (!u.anio) return;
    const niv = u.nivel === 'primaria' ? 'P' : 'S';
    const key = `${niv}${u.anio}`;
    grupos[key] = (grupos[key] || 0) + 1;
  });

  const ordenSecundaria = ['S1','S2','S3','S4','S5','S6'];
  const ordenPrimaria   = ['P1','P2','P3','P4','P5','P6','P7'];
  const orden = [...ordenSecundaria.filter(k => grupos[k]), ...ordenPrimaria.filter(k => grupos[k])];
  if (!orden.length) { wrap.style.display = 'none'; return; }

  const labelMap = (k) => {
    const num = k.slice(1);
    return k[0] === 'S' ? `${num}° sec.` : `${num}° grad.`;
  };

  const max = Math.max(...orden.map(k => grupos[k]));
  const barW = 240;
  const rowH = 28;
  const gap  = 6;
  const labelW = 72;
  const svgH = orden.length * (rowH + gap);
  const total = aprobados.length;

  document.getElementById('chart-total-label').textContent = `${total} alumnos activos`;

  const bars = orden.map((k, i) => {
    const val = grupos[k];
    const w   = Math.max(4, Math.round((val / max) * barW));
    const y   = i * (rowH + gap);
    const pct = Math.round((val / total) * 100);
    return `
      <text x="0" y="${y + rowH * .72}" font-size="12" fill="#6b5c57" font-family="Inter Tight,sans-serif">${labelMap(k)}</text>
      <rect x="${labelW}" y="${y + 2}" width="${w}" height="${rowH - 4}" rx="4" fill="#7a1f2b" opacity=".82"/>
      <text x="${labelW + w + 6}" y="${y + rowH * .72}" font-size="12" fill="#6b5c57" font-family="Inter Tight,sans-serif">${val} <tspan fill="#9e8c87">(${pct}%)</tspan></text>`;
  }).join('');

  cont.innerHTML = `<svg width="${labelW + barW + 80}" height="${svgH}" overflow="visible">${bars}</svg>`;
}

function _avatarHtml(u, size = 38) {
  if (u.avatar_url) {
    return `<img src="${escapeHtml(u.avatar_url)}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.outerHTML=this.nextElementSibling.outerHTML">`;
  }
  const initials = ((u.nombre?.[0]||'') + (u.apellido?.[0]||'')).toUpperCase() || '?';
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--burgundy);color:var(--cream);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.34)}px;font-weight:700;flex-shrink:0">${initials}</div>`;
}

function _cursoLabel(u) {
  if (!u.anio) return '—';
  const nivel = u.nivel === 'primaria' ? 'grado' : 'año';
  const ori   = u.orientacion ? ` · ${u.orientacion.charAt(0).toUpperCase() + u.orientacion.slice(1)}` : '';
  return `${u.anio}° ${nivel}${ori}`;
}

function _metricaHtml(u) {
  const ingreso = u.last_login
    ? `Último ingreso: <strong>${formatFechaRelativa(u.last_login)}</strong>`
    : 'Sin ingresos aún';
  const total = u.login_count ? `${u.login_count} ${u.login_count === 1 ? 'ingreso' : 'ingresos'}` : '';
  return `${ingreso}${total ? ' · ' + total : ''}`;
}

function verTab(tab) {
  _tabUsuarios = tab;
  ['pendientes','alumnos','admins','invitar'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (!el) return;
    el.style.background = t === tab ? 'var(--burgundy)' : '';
    el.style.color      = t === tab ? 'var(--cream)' : '';
  });

  const cont = document.getElementById('usuarios-lista');
  if (tab === 'invitar') { renderInvitar(); return; }

  const rolMap = { pendientes: 'pendiente', alumnos: 'alumno', admins: 'administrador' };
  let lista = _usuarios.filter(u => u.rol === rolMap[tab]);

  // Filtrar por búsqueda
  const q = (document.getElementById('user-search')?.value || '').trim().toLowerCase();
  if (q) {
    lista = lista.filter(u => {
      const haystack = [u.nombre, u.apellido, u.alias, u.email].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  if (!lista.length) {
    cont.innerHTML = `<p style="text-align:center;padding:32px;color:var(--ink-soft);font-size:14px">${q ? 'Sin resultados para "' + escapeHtml(q) + '"' : 'Sin usuarios en esta categoría.'}</p>`;
    return;
  }

  cont.innerHTML = lista.map(u => {
    const display = escapeHtml(u.alias || u.nombre || '—');
    let acciones = '';
    if (u.rol === 'pendiente') {
      acciones = `
        <button class="btn btn-primary" style="font-size:12px;padding:6px 14px" onclick="cambiarRol('${u.id}','alumno')">✓ Aprobar</button>
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 14px;color:#a73a1f" onclick="eliminarUsuario('${u.id}')">✗ Rechazar</button>`;
    } else if (u.rol === 'alumno') {
      acciones = `
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 14px" onclick="cambiarRol('${u.id}','administrador')">⬆ Admin</button>
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 14px;color:#a73a1f" onclick="cambiarRol('${u.id}','pendiente')">Suspender</button>`;
    } else {
      acciones = `<button class="btn btn-ghost" style="font-size:12px;padding:6px 14px" onclick="cambiarRol('${u.id}','alumno')">⬇ Quitar admin</button>`;
    }
    return `
      <div style="display:flex;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid var(--line)">
        ${_avatarHtml(u)}
        <div style="flex:1;min-width:0;overflow:hidden">
          <div style="font-weight:600;font-size:14px">${display} <span style="font-weight:400">${escapeHtml(u.apellido || '')}</span>
            <span style="font-size:11px;background:var(--cream);color:var(--burgundy);padding:2px 8px;border-radius:999px;margin-left:6px;font-weight:600">${_cursoLabel(u)}</span>
          </div>
          <div style="font-size:12px;color:var(--ink-soft);margin-top:2px">
            ${u.email ? `<span style="font-family:monospace">${escapeHtml(u.email)}</span> ·` : ''}
            ${u.nivel ? `${u.nivel.charAt(0).toUpperCase()+u.nivel.slice(1)}` : ''}
          </div>
          <div style="font-size:11px;color:var(--ink-soft);margin-top:3px">${_metricaHtml(u)} · Registro: ${new Date(u.created_at).toLocaleDateString('es-AR')}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">${acciones}</div>
      </div>`;
  }).join('');
}

function renderInvitar() {
  const cont = document.getElementById('usuarios-lista');
  const pendInvs = _invitaciones.filter(i => !i.used);
  const usadas   = _invitaciones.filter(i => i.used);
  const regUrl   = 'https://feders77.github.io/centro-estudiantes-ues/registro.html';

  cont.innerHTML = `
    <div style="padding:16px 0">
      <p style="font-size:13px;color:var(--ink-soft);margin-bottom:16px">
        Agregá el email y hacé click en <strong>Invitar</strong>. Se va a abrir tu cliente de email con el mensaje ya redactado — solo tenés que enviarlo. Cuando la persona se registre con ese email, su cuenta queda activa de inmediato.
      </p>
      <div style="display:flex;gap:10px;margin-bottom:24px">
        <input type="email" id="inv-email" placeholder="email@ejemplo.com"
          style="flex:1;padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px">
        <button class="btn btn-primary" style="padding:10px 18px" onclick="crearInvitacion()">Invitar</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:12px;font-weight:600;color:var(--ink-soft)">LINK DE REGISTRO PARA COMPARTIR</span>
        <button class="btn btn-ghost" style="font-size:12px;padding:5px 12px" onclick="copiarLink()">📋 Copiar link</button>
      </div>
      <div style="background:var(--cream);border-radius:8px;padding:10px 14px;font-size:12px;font-family:monospace;color:var(--ink-soft);word-break:break-all;margin-bottom:24px">${regUrl}</div>

      ${pendInvs.length ? `
        <div style="font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:8px">INVITACIONES PENDIENTES (${pendInvs.length})</div>
        ${pendInvs.map(i => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
            <div>
              <div style="font-size:14px;font-weight:500">${escapeHtml(i.email)}</div>
              <div style="font-size:11px;color:var(--ink-soft)">Invitado ${formatFechaRelativa(i.created_at)}</div>
            </div>
            <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#a73a1f" onclick="borrarInvitacion('${i.id}')">✕</button>
          </div>`).join('')}
      ` : ''}

      ${usadas.length ? `
        <div style="font-size:12px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px">YA REGISTRADOS (${usadas.length})</div>
        ${usadas.map(i => `
          <div style="font-size:13px;color:var(--ink-soft);padding:6px 0;border-bottom:1px solid var(--line)">✓ ${escapeHtml(i.email)}</div>`).join('')}
      ` : ''}
    </div>`;
}

async function crearInvitacion() {
  const emailEl = document.getElementById('inv-email');
  const email = emailEl?.value?.trim().toLowerCase();
  if (!email) return;

  const btn = document.querySelector('button[onclick="crearInvitacion()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const r = await fetch(window.SUPABASE_URL + '/functions/v1/invitar', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + window._authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Error al enviar invitación');

    if (emailEl) emailEl.value = '';
    toast('✓ Invitación enviada a ' + email, 'success');
    await cargarUsuarios();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Invitar'; }
  }
}

async function borrarInvitacion(id) {
  await window._sb.from('invitaciones').delete().eq('id', id);
  toast('Invitación eliminada', 'success');
  await cargarUsuarios();
}

function copiarLink() {
  navigator.clipboard.writeText('https://feders77.github.io/centro-estudiantes-ues/registro.html')
    .then(() => toast('✓ Link copiado', 'success'))
    .catch(() => toast('No se pudo copiar', 'error'));
}

async function cambiarRol(id, nuevoRol) {
  const { error } = await window._sb.from('profiles').update({ rol: nuevoRol }).eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  const msgs = { alumno: '✓ Usuario aprobado', administrador: '✓ Promovido a admin', pendiente: 'Usuario suspendido' };
  toast(msgs[nuevoRol] || '✓ Rol actualizado', 'success');
  await cargarUsuarios();
}

async function eliminarUsuario(id) {
  if (!confirm('¿Rechazar y eliminar este usuario? Esta acción no se puede deshacer.')) return;
  const { error } = await window._sb.from('profiles').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Usuario eliminado', 'success');
  await cargarUsuarios();
}

/* ========================================================================
   MODERACIÓN DE COMENTARIOS
   ======================================================================== */

let _tabComentarios = 'novedades';
let _comentariosNov = [];
let _comentariosEv  = [];
let _comCacheAdmin  = {};
let _comAdminElimId = null;

async function cargarTodosComentarios() {
  const [{ data: comNov }, { data: comEv }] = await Promise.all([
    window._sb.from('novedades_comentarios')
      .select('*,profiles(nombre,apellido,alias,email),novedades(titulo)')
      .order('created_at', { ascending: false }),
    window._sb.from('eventos_comentarios')
      .select('*,profiles(nombre,apellido,alias,email),eventos(titulo)')
      .order('created_at', { ascending: false })
  ]);
  _comentariosNov = comNov || [];
  _comentariosEv  = comEv  || [];

  const total = _comentariosNov.length + _comentariosEv.length;
  const countEl = document.getElementById('count-comentarios');
  if (countEl) countEl.textContent = total || '0';

  filtrarComentarios(_tabComentarios);
}

function filtrarComentarios(tab) {
  _tabComentarios = tab;
  ['novedades','eventos'].forEach(t => {
    const el = document.getElementById('tab-com-' + t);
    if (!el) return;
    el.style.background = t === tab ? 'var(--burgundy)' : '';
    el.style.color      = t === tab ? 'var(--cream)'    : '';
  });
  renderComentariosAdmin(tab);
}

function renderComentariosAdmin(tab) {
  const lista = tab === 'novedades' ? _comentariosNov : _comentariosEv;
  const cont  = document.getElementById('comentarios-lista');
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state"><p>Sin comentarios en ${tab === 'novedades' ? 'novedades' : 'eventos'}.</p></div>`;
    return;
  }

  _comCacheAdmin = {};
  cont.innerHTML = lista.map(c => {
    const p    = c.profiles || {};
    const nom  = p.alias || p.nombre || 'Usuario';
    const ini  = ((p.nombre?.[0]||'') + (p.apellido?.[0]||'')).toUpperCase() || '?';
    const ref  = tab === 'novedades' ? c.novedades?.titulo : c.eventos?.titulo;
    const itemId = tab === 'novedades' ? c.novedad_id : c.evento_id;
    _comCacheAdmin[c.id] = {
      tipo: tab === 'novedades' ? 'novedad' : 'evento',
      itemId, itemRef: ref || '—',
      userId: c.user_id, userEmail: p.email || '', userNombre: nom, texto: c.texto
    };
    return `
      <div style="display:flex;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line);align-items:flex-start">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--coral),var(--accent));color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${escapeHtml(ini)}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:600;font-size:13px">${escapeHtml(nom)}</span>
            <span style="font-size:11px;color:var(--ink-soft)">${formatFechaRelativa(c.created_at)}</span>
            ${ref ? `<span class="tag" style="font-size:10px">${escapeHtml(ref)}</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--ink);line-height:1.5">${escapeHtml(c.texto)}</div>
        </div>
        <button onclick="abrirEliminarComAdmin('${c.id}')" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#a73a1f;flex-shrink:0">🗑 Eliminar</button>
      </div>`;
  }).join('');
}

function abrirEliminarComAdmin(comId) {
  _comAdminElimId = comId;
  document.querySelectorAll('#modal-com-elim input[type=radio]').forEach(r => r.checked = false);
  openModal('modal-com-elim');
}

async function confirmarEliminarComAdmin() {
  const motivo = document.querySelector('#modal-com-elim input[type=radio]:checked')?.value;
  if (!motivo) { toast('Elegí un motivo', 'error'); return; }
  const com = _comCacheAdmin[_comAdminElimId];
  if (!com) return;
  const btn = document.getElementById('btn-confirmar-com-elim');
  btn.disabled = true; btn.textContent = 'Eliminando…';
  try {
    const r = await fetch(window.SUPABASE_URL + '/functions/v1/notificar-eliminacion', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + window._authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: com.tipo, com_id: _comAdminElimId,
        item_id: com.itemId, item_ref: com.itemRef,
        user_id: com.userId, user_email: com.userEmail, user_nombre: com.userNombre,
        texto: com.texto, motivo
      })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    closeModal('modal-com-elim');
    toast('Comentario eliminado', 'success');
    await cargarTodosComentarios();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Eliminar comentario';
  }
}

/* ========================================================================
   INIT
   ======================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.init();

  if (!session) {
    window.location.href = 'login.html?next=admin.html';
    return;
  }
  const profile = await Auth.getProfile();
  if (!profile || profile.rol !== 'administrador') {
    alert('Esta sección es solo para administradores.');
    window.location.href = 'index.html';
    return;
  }

  // Mostrar nombre del admin en el header
  Auth.updateChip(profile);

  await Store.init();
  await loadAll();
  renderTodo();
  cargarConfig();
  await cargarUsuarios();
});
