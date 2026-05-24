/* =========================================================================
   ADMIN — Lógica del panel de administración
   ========================================================================= */

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
function openModal(id) { document.getElementById(id).classList.add('open'); }
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
  const lista = Store.list('novedades');
  const cont = document.getElementById('tabla-novedades');
  if (lista.length === 0) {
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
  const n = Store.get('novedades', id);
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

function guardarNovedad(e) {
  e.preventDefault();
  const id = document.getElementById('nov-id').value;
  const data = {
    titulo: document.getElementById('nov-titulo').value.trim(),
    texto: document.getElementById('nov-texto').value.trim(),
    tag: document.getElementById('nov-tag').value.trim(),
    tagTipo: document.getElementById('nov-tagTipo').value,
    autor: document.getElementById('nov-autor').value.trim(),
    activa: document.getElementById('nov-activa').checked
  };
  if (id) {
    Store.update('novedades', id, data);
    toast('✓ Novedad actualizada', 'success');
  } else {
    Store.add('novedades', { ...data, fecha: new Date().toISOString(), likes: 0, comentarios: 0 });
    toast('✓ Novedad creada', 'success');
  }
  closeModal('modal-novedad');
  renderTodo();
}

function toggleNovedad(id) {
  const n = Store.get('novedades', id);
  Store.update('novedades', id, { activa: !n.activa });
  renderTodo();
  toast(n.activa ? 'Novedad oculta' : 'Novedad visible', 'success');
}

function borrarNovedad(id) {
  if (!confirm('¿Borrar esta novedad? No se puede deshacer.')) return;
  Store.remove('novedades', id);
  renderTodo();
  toast('Novedad eliminada', 'success');
}

/* ========================================================================
   EVENTOS
   ======================================================================== */

function renderEventos() {
  const lista = Store.list('eventos').sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
  const cont = document.getElementById('tabla-eventos');
  if (lista.length === 0) {
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
  const e = Store.get('eventos', id);
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

function guardarEvento(e) {
  e.preventDefault();
  const id = document.getElementById('ev-id').value;
  const data = {
    titulo: document.getElementById('ev-titulo').value.trim(),
    descripcion: document.getElementById('ev-descripcion').value.trim(),
    fecha: document.getElementById('ev-fecha').value + ':00',
    lugar: document.getElementById('ev-lugar').value.trim(),
    categoria: document.getElementById('ev-categoria').value,
    destacado: document.getElementById('ev-destacado').checked
  };
  if (id) {
    Store.update('eventos', id, data);
    toast('✓ Evento actualizado', 'success');
  } else {
    Store.add('eventos', data);
    toast('✓ Evento creado', 'success');
  }
  closeModal('modal-evento');
  renderTodo();
}

function borrarEvento(id) {
  if (!confirm('¿Borrar este evento?')) return;
  Store.remove('eventos', id);
  renderTodo();
  toast('Evento eliminado', 'success');
}

/* ========================================================================
   VOTACIONES
   ======================================================================== */

function renderVotaciones() {
  const lista = Store.list('votaciones');
  const cont = document.getElementById('tabla-votaciones');
  if (lista.length === 0) {
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
  const v = Store.get('votaciones', id);
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

function guardarVotacion(e) {
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
    // Mantener los votos existentes si la opción ya existía
    const v = Store.get('votaciones', id);
    opciones = textoOpciones.map((t, i) => {
      const existente = (v.opciones || []).find(o => o.texto === t);
      return { id: 'o' + (i+1), texto: t, votos: existente ? existente.votos : 0 };
    });
  } else {
    opciones = textoOpciones.map((t, i) => ({ id: 'o' + (i+1), texto: t, votos: 0 }));
  }

  const data = {
    titulo: document.getElementById('vt-titulo').value.trim(),
    descripcion: document.getElementById('vt-descripcion').value.trim(),
    cierre: document.getElementById('vt-cierre').value + ':00',
    estado: document.getElementById('vt-estado').value,
    vinculante: document.getElementById('vt-vinculante').checked,
    opciones,
    participantes: opciones.reduce((s,o) => s + o.votos, 0),
    totalElegibles: 580
  };

  if (id) {
    Store.update('votaciones', id, data);
    toast('✓ Votación actualizada', 'success');
  } else {
    Store.add('votaciones', data);
    toast('✓ Votación creada', 'success');
  }
  closeModal('modal-votacion');
  renderTodo();
}

function toggleVotacion(id) {
  const v = Store.get('votaciones', id);
  const nuevoEstado = v.estado === 'abierta' ? 'cerrada' : 'abierta';
  Store.update('votaciones', id, { estado: nuevoEstado });
  renderTodo();
  toast('Votación ' + nuevoEstado, 'success');
}

function borrarVotacion(id) {
  if (!confirm('¿Borrar esta votación? Se pierden todos los votos.')) return;
  Store.remove('votaciones', id);
  renderTodo();
  toast('Votación eliminada', 'success');
}

/* ========================================================================
   APUNTES
   ======================================================================== */

function renderApuntes() {
  const lista = Store.list('apuntes');
  const cont = document.getElementById('tabla-apuntes');
  if (lista.length === 0) {
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
          <span class="tag">${escapeHtml(ap.tipo)}</span>
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

function toggleApunte(id) {
  const a = Store.get('apuntes', id);
  Store.update('apuntes', id, { activo: a.activo === false ? true : false });
  renderTodo();
  toast('Apunte actualizado', 'success');
}

function borrarApunte(id) {
  if (!confirm('¿Borrar este apunte?')) return;
  Store.remove('apuntes', id);
  renderTodo();
  toast('Apunte eliminado', 'success');
}

/* ========================================================================
   MARKETPLACE
   ======================================================================== */

function renderMarketplace() {
  const lista = Store.list('marketplace');
  const cont = document.getElementById('tabla-marketplace');
  if (lista.length === 0) {
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

function toggleMP(id) {
  const p = Store.get('marketplace', id);
  Store.update('marketplace', id, { activo: p.activo === false ? true : false });
  renderTodo();
}

function borrarMP(id) {
  if (!confirm('¿Borrar esta publicación?')) return;
  Store.remove('marketplace', id);
  renderTodo();
  toast('Publicación eliminada', 'success');
}

/* ========================================================================
   CONFIG
   ======================================================================== */

function cargarConfig() {
  const c = Store.getConfig();
  document.getElementById('cfg-destino').value = c.viajeDestino || '';
  document.getElementById('cfg-fecha').value = (c.viajeFecha || '').slice(0,16);
  document.getElementById('cfg-confirmados').value = c.viajeConfirmados || 0;
  document.getElementById('cfg-total').value = c.viajeTotal || 0;
  document.getElementById('cfg-nota').value = c.viajeNota || '';
}

function guardarConfig() {
  Store.setConfig({
    viajeDestino: document.getElementById('cfg-destino').value.trim(),
    viajeFecha: document.getElementById('cfg-fecha').value + ':00',
    viajeConfirmados: parseInt(document.getElementById('cfg-confirmados').value || 0),
    viajeTotal: parseInt(document.getElementById('cfg-total').value || 0),
    viajeNota: document.getElementById('cfg-nota').value.trim()
  });
  toast('✓ Configuración guardada', 'success');
}

/* ========================================================================
   EXPORT / IMPORT
   ======================================================================== */

function exportarDatos() {
  const json = Store.exportAll();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `centro-estudiantes-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Archivo descargado', 'success');
}

function importarDatos() {
  const file = document.getElementById('import-file').files[0];
  if (!file) { toast('Elegí un archivo primero', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      Store.importAll(e.target.result);
      renderTodo();
      toast('✓ Datos importados correctamente', 'success');
    } catch (err) {
      toast('Error al importar: archivo inválido', 'error');
    }
  };
  reader.readAsText(file);
}

function resetTodo() {
  if (!confirm('¿Seguro? Esto borra TODO el contenido cargado y vuelve a los datos de ejemplo.')) return;
  Store.reset();
  renderTodo();
  toast('✓ Todo reiniciado', 'success');
}

/* ========================================================================
   RESUMEN
   ======================================================================== */

function renderResumen() {
  const novedadesActivas = Store.list('novedades').filter(n => n.activa).length;
  const eventosFuturos = Store.list('eventos').filter(e => new Date(e.fecha) > new Date()).length;
  const votacionesAbiertas = Store.list('votaciones').filter(v => v.estado === 'abierta').length;
  const apuntesPublicados = Store.list('apuntes').filter(a => a.activo !== false).length;

  document.getElementById('stat-novedades').textContent = novedadesActivas;
  document.getElementById('stat-eventos').textContent = eventosFuturos;
  document.getElementById('stat-votaciones').textContent = votacionesAbiertas;
  document.getElementById('stat-apuntes').textContent = apuntesPublicados;

  // contadores en sidebar
  document.getElementById('count-novedades').textContent = Store.list('novedades').length;
  document.getElementById('count-eventos').textContent = Store.list('eventos').length;
  document.getElementById('count-votaciones').textContent = Store.list('votaciones').length;
  document.getElementById('count-apuntes').textContent = Store.list('apuntes').length;
  document.getElementById('count-marketplace').textContent = Store.list('marketplace').length;

  // actividad reciente: últimas 5 cosas creadas
  const items = [];
  Store.list('novedades').forEach(n => items.push({ tipo:'Novedad', titulo:n.titulo, fecha:n.fecha, icono:'📢' }));
  Store.list('apuntes').forEach(a => items.push({ tipo:'Apunte', titulo:a.titulo, fecha:a.fecha, icono:'📚' }));
  Store.list('marketplace').forEach(m => items.push({ tipo:'Marketplace', titulo:m.titulo, fecha:m.fecha, icono:'🔁' }));
  items.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  const recientes = items.slice(0,6);

  const cont = document.getElementById('actividad-reciente');
  if (recientes.length === 0) {
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

document.addEventListener('DOMContentLoaded', () => {
  renderTodo();
});
