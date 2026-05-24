/* =========================================================================
   ADMIN — Lógica del panel de administración (versión Supabase async)
   ========================================================================= */

/* ---------- cache en memoria para no hacer fetch en cada render ---------- */
let _cache = {
  novedades:  [],
  eventos:    [],
  votaciones: [],
  apuntes:    [],
  marketplace: []
};

async function loadAll() {
  const [novedades, eventos, votaciones, apuntes, marketplace] = await Promise.all([
    Store.list('novedades'),
    Store.list('eventos'),
    Store.list('votaciones'),
    Store.list('apuntes'),
    Store.list('marketplace')
  ]);
  _cache = { novedades, eventos, votaciones, apuntes, marketplace };
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
    if (section === 'config') cargarConfig();
    if (section === 'usuarios') openModal('modal-usuarios');
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
  const c = await Store.getConfig();
  document.getElementById('cfg-destino').value = c.viajeDestino || '';
  document.getElementById('cfg-fecha').value = (c.viajeFecha || '').slice(0,16);
  document.getElementById('cfg-confirmados').value = c.viajeConfirmados || 0;
  document.getElementById('cfg-total').value = c.viajeTotal || 0;
  document.getElementById('cfg-nota').value = c.viajeNota || '';
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
}

/* ========================================================================
   USUARIOS
   ======================================================================== */

let _tabUsuarios = 'pendientes';
let _usuarios = [];

async function cargarUsuarios() {
  const { data, error } = await window._sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { toast('Error al cargar usuarios: ' + error.message, 'error'); return; }
  _usuarios = data || [];

  const pendientes = _usuarios.filter(u => u.rol === 'pendiente').length;
  document.getElementById('count-pendientes').textContent = pendientes || '0';
  document.getElementById('badge-pend').textContent = pendientes;

  verTab(_tabUsuarios);
}

function verTab(tab) {
  _tabUsuarios = tab;
  ['pendientes','alumnos','admins'].forEach(t => {
    document.getElementById('tab-' + t).style.background = t === tab ? 'var(--burgundy)' : '';
    document.getElementById('tab-' + t).style.color      = t === tab ? 'var(--cream)' : '';
  });

  const rolMap = { pendientes: 'pendiente', alumnos: 'alumno', admins: 'administrador' };
  const lista = _usuarios.filter(u => u.rol === rolMap[tab]);
  const cont  = document.getElementById('usuarios-lista');

  if (!lista.length) {
    cont.innerHTML = `<p style="text-align:center;padding:32px;color:var(--ink-soft);font-size:14px">Sin usuarios en esta categoría.</p>`;
    return;
  }

  cont.innerHTML = lista.map(u => {
    const display = u.alias || u.nombre;
    const curso   = u.anio ? `${u.anio}° ${u.nivel === 'primaria' ? 'gr.' : ''}${u.orientacion ? ' ' + u.orientacion : ''}` : '—';
    const initials = ((u.nombre?.[0]||'') + (u.apellido?.[0]||'')).toUpperCase();
    let acciones = '';
    if (u.rol === 'pendiente') {
      acciones = `
        <button class="btn btn-primary" style="font-size:12px;padding:6px 12px" onclick="cambiarRol('${u.id}','alumno')">✓ Aprobar</button>
        <button class="btn btn-ghost"   style="font-size:12px;padding:6px 12px;color:#a73a1f" onclick="eliminarUsuario('${u.id}')">✗ Rechazar</button>`;
    } else if (u.rol === 'alumno') {
      acciones = `
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="cambiarRol('${u.id}','administrador')">⬆ Hacer admin</button>
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;color:#a73a1f" onclick="cambiarRol('${u.id}','pendiente')">Suspender</button>`;
    } else if (u.rol === 'administrador') {
      acciones = `
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="cambiarRol('${u.id}','alumno')">⬇ Quitar admin</button>`;
    }
    return `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--line)">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--burgundy);color:var(--cream);
             display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">
          ${initials}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${escapeHtml(display)} <span style="font-weight:400;color:var(--ink-soft)">${escapeHtml(u.apellido || '')}</span></div>
          <div style="font-size:12px;color:var(--ink-soft)">${curso} · ${escapeHtml(u.nombre || '')} · <span style="font-style:italic">registrado ${formatFechaRelativa(u.created_at)}</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">${acciones}</div>
      </div>`;
  }).join('');
}

async function cambiarRol(id, nuevoRol) {
  const { error } = await window._sb.from('profiles').update({ rol: nuevoRol }).eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(nuevoRol === 'alumno' ? '✓ Usuario aprobado' : nuevoRol === 'administrador' ? '✓ Rol actualizado a admin' : '✓ Rol actualizado', 'success');
  await cargarUsuarios();
}

async function eliminarUsuario(id) {
  if (!confirm('¿Rechazar y eliminar este usuario? Esta acción no se puede deshacer.')) return;
  // Eliminar el perfil (auth.users en cascada si está configurado)
  const { error } = await window._sb.from('profiles').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Usuario eliminado', 'success');
  await cargarUsuarios();
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
