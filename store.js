/* =========================================================================
   STORE — Capa de datos sobre Supabase REST API
   API pública idéntica a la versión localStorage; todas las funciones
   son async. Las páginas hacen await Store.init() al arrancar y después
   usan el mismo Store.list / get / add / update / remove de siempre.
   ========================================================================= */

/* ---------- CLIENTE SUPABASE ---------- */

const _URL  = window.SUPABASE_URL;
const _KEY  = window.SUPABASE_ANON_KEY;
const _BASE = _URL + '/rest/v1';

function _headers(extra = {}) {
  // Usa el JWT de sesión si hay usuario logueado; si no, la anon key (lectura pública)
  const token = window._authToken || _KEY;
  return {
    'apikey':        _KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    ...extra
  };
}

async function _get(path) {
  const r = await fetch(_BASE + path, { headers: _headers() });
  if (!r.ok) {
    const msg = await r.text();
    throw new Error(`GET ${path} → ${r.status}: ${msg}`);
  }
  return r.json();
}

async function _post(path, body) {
  const r = await fetch(_BASE + path, {
    method:  'POST',
    headers: _headers({ 'Prefer': 'return=representation' }),
    body:    JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return Array.isArray(data) ? data[0] : data;
}

async function _patch(path, body) {
  const r = await fetch(_BASE + path, {
    method:  'PATCH',
    headers: _headers({ 'Prefer': 'return=representation' }),
    body:    JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return Array.isArray(data) ? data[0] : data;
}

async function _delete(path) {
  const r = await fetch(_BASE + path, {
    method:  'DELETE',
    headers: _headers()
  });
  if (!r.ok) throw new Error(await r.text());
}

/* ---------- MAPEO snake_case ↔ camelCase ---------- */

const _MAP_FROM = {
  tag_tipo:        'tagTipo',
  autor_nombre:    'autorNombre',
  autor_curso:     'autorCurso',
  total_elegibles: 'totalElegibles',
  created_at:      'createdAt'
};

const _MAP_TO = {};
Object.entries(_MAP_FROM).forEach(([k, v]) => { _MAP_TO[v] = k; });

function fromApi(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = _MAP_FROM[k] || k;
    out[key] = v;
  }
  return out;
}

function toApi(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  // campos que no existen en ninguna tabla de Supabase
  const omitir = ['createdAt', 'participantes'];
  for (const [k, v] of Object.entries(obj)) {
    if (omitir.includes(k)) continue;
    const key = _MAP_TO[k] || k;
    out[key] = v;
  }
  return out;
}

/* ---------- NOMBRE DE TABLA ---------- */

function _tabla(coleccion) {
  // el frontend usa nombres en camelCase/plural igual que la DB salvo 'buzon'
  if (coleccion === 'buzon') return 'buzon_mensajes';
  return coleccion; // novedades, eventos, votaciones, apuntes, marketplace
}

/* =========================================================================
   API PÚBLICA
   ========================================================================= */

const Store = {

  /* ---- init ---- */
  async init() {
    try {
      const rows = await _get('/config?key=eq.hero&select=value');
      if (rows.length) {
        const val = rows[0].value || {};
        if (val.logo_url) {
          document.querySelectorAll('header .brand img').forEach(img => {
            img.src = val.logo_url;
            img.onerror = null;
          });
        }
      }
    } catch {}
    return true;
  },

  /* ---- list ---- */
  async list(coleccion, soloActivos = false) {
    const tabla = _tabla(coleccion);
    let path = `/${tabla}?order=fecha.desc`;

    // tablas sin columna 'fecha' usan created_at (o no tienen orden relevante)
    if (['votos', 'config', 'estructura_academica'].includes(tabla)) {
      path = `/${tabla}`;
    }
    if (tabla === 'votaciones') {
      path = `/${tabla}?order=created_at.desc`;
    }

    if (soloActivos) {
      // novedades usa 'activa', el resto usa 'activo'
      const col = (tabla === 'novedades') ? 'activa' : 'activo';
      path += `&${col}=eq.true`;
    }

    const rows = await _get(path);
    return rows.map(fromApi);
  },

  /* ---- get ---- */
  async get(coleccion, id) {
    const tabla = _tabla(coleccion);
    const rows = await _get(`/${tabla}?id=eq.${id}&select=*`);
    return rows.length ? fromApi(rows[0]) : null;
  },

  /* ---- add ---- */
  async add(coleccion, item) {
    const tabla = _tabla(coleccion);
    const payload = toApi({ ...item });
    // quitamos id si viene vacío, que lo genere la DB
    if (!payload.id) delete payload.id;
    const created = await _post(`/${tabla}`, payload);
    return fromApi(created);
  },

  /* ---- update ---- */
  async update(coleccion, id, cambios) {
    const tabla = _tabla(coleccion);
    const payload = toApi({ ...cambios });
    delete payload.id;
    const updated = await _patch(`/${tabla}?id=eq.${id}`, payload);
    return fromApi(updated);
  },

  /* ---- remove ---- */
  async remove(coleccion, id) {
    const tabla = _tabla(coleccion);
    await _delete(`/${tabla}?id=eq.${id}`);
  },

  /* ---- config ---- */
  async getConfig() {
    const rows = await _get('/config?key=eq.viaje&select=value');
    if (!rows.length) return {};
    const v = rows[0].value;
    // mapeo al formato que usan las páginas
    return {
      viajeDestino:     v.destino   || '',
      viajeFecha:       v.fecha     || '',
      viajeConfirmados: v.confirmados || 0,
      viajeTotal:       v.total     || 0,
      viajeNota:        v.nota      || ''
    };
  },

  async setConfig(cambios) {
    // trae el valor actual, mergea y guarda
    const rows = await _get('/config?key=eq.viaje&select=value');
    const actual = rows.length ? rows[0].value : {};

    // mapeo inverso: de claves del frontend a claves del JSON guardado
    const mapaInverso = {
      viajeDestino:     'destino',
      viajeFecha:       'fecha',
      viajeConfirmados: 'confirmados',
      viajeTotal:       'total',
      viajeNota:        'nota'
    };
    const nuevo = { ...actual };
    for (const [k, v] of Object.entries(cambios)) {
      const dbKey = mapaInverso[k] || k;
      nuevo[dbKey] = v;
    }

    await _patch('/config?key=eq.viaje', { value: nuevo });
    // devuelve en formato frontend
    return {
      viajeDestino:     nuevo.destino      || '',
      viajeFecha:       nuevo.fecha        || '',
      viajeConfirmados: nuevo.confirmados  || 0,
      viajeTotal:       nuevo.total        || 0,
      viajeNota:        nuevo.nota         || ''
    };
  },

  /* ---- estructura académica ---- */
  async getEstructura() {
    const rows = await _get('/estructura_academica?id=eq.1&select=data');
    return rows.length ? rows[0].data : {};
  },

  async setEstructura(nueva) {
    await _patch('/estructura_academica?id=eq.1', { data: nueva });
  },

  /* ---- export / import / reset ---- */
  async exportAll() {
    const [novedades, eventos, votaciones, apuntes, marketplace, config, estructura] =
      await Promise.all([
        _get('/novedades?order=fecha.desc'),
        _get('/eventos?order=fecha.desc'),
        _get('/votaciones?order=created_at.desc'),
        _get('/apuntes?order=fecha.desc'),
        _get('/marketplace?order=fecha.desc'),
        _get('/config'),
        _get('/estructura_academica')
      ]);
    return JSON.stringify({
      novedades: novedades.map(fromApi),
      eventos:   eventos.map(fromApi),
      votaciones: votaciones.map(fromApi),
      apuntes:   apuntes.map(fromApi),
      marketplace: marketplace.map(fromApi),
      config,
      estructura: estructura[0]?.data || {}
    }, null, 2);
  },

  async importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    const tablas = ['novedades', 'eventos', 'votaciones', 'apuntes', 'marketplace'];
    await Promise.all(tablas.map(async (t) => {
      if (!data[t] || !data[t].length) return;
      const r = await fetch(_BASE + `/${t}`, {
        method:  'POST',
        headers: _headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body:    JSON.stringify(data[t].map(toApi))
      });
      if (!r.ok) console.error(`importAll ${t}:`, await r.text());
    }));
    return data;
  },

  async reset() {
    if (!confirm('¿Seguro que querés borrar TODOS los datos y volver al seed inicial? Esta acción no se puede deshacer.')) return;
    const tablas = ['novedades', 'eventos', 'votaciones', 'apuntes', 'marketplace', 'votos'];
    for (const t of tablas) {
      // DELETE sin filtro borra todo (RLS política "escritura temporal" lo permite)
      const r = await fetch(_BASE + `/${t}?id=neq.00000000-0000-0000-0000-000000000000`, {
        method:  'DELETE',
        headers: _headers()
      });
      if (!r.ok) console.error(`reset ${t}:`, await r.text());
    }
    alert('Datos borrados. Recargá la página y el seed inicial se va a cargar desde la próxima vez que agregues contenido desde el admin.');
  },

  /* ---- secciones habilitadas ---- */
  async getSecciones() {
    try {
      const rows = await _get('/config_secciones?select=clave,habilitada');
      const mapa = {};
      rows.forEach(r => { mapa[r.clave] = r.habilitada; });
      return mapa;
    } catch { return {}; }
  },

  /* métodos legacy sync que ya no aplican — los dejamos como no-op para
     no romper si alguna página los llama sin await por error */
  load()   { return {}; },
  save()   { },
};

/* ─── Helpers compartidos para chequeo de secciones ───────────────────── */

const _HTML_PROXIMAMENTE = `
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
              min-height:54vh;text-align:center;gap:16px;padding:40px 20px">
    <span style="font-size:64px">🚧</span>
    <h2 style="font-family:'Fraunces',serif;font-size:32px;font-weight:600;letter-spacing:-.02em">Próximamente</h2>
    <p style="color:var(--ink-soft);font-size:15px;max-width:380px;line-height:1.6">
      Esta sección estará disponible pronto. El Centro de Estudiantes la está preparando.
    </p>
    <a href="index.html" class="btn btn-ghost" style="margin-top:4px">← Volver al inicio</a>
  </div>`;

function aplicarEstadoSecciones(secciones) {
  const MAPA = {
    apuntes:     'apuntes.html',
    votaciones:  'votaciones.html',
    buzon:       'buzon.html',
    marketplace: 'marketplace.html',
  };
  Object.entries(MAPA).forEach(([clave, href]) => {
    if (secciones[clave] === false) {
      document.querySelectorAll(`a[href="${href}"]`).forEach(a => {
        const toHide = a.parentElement?.tagName === 'LI' ? a.parentElement : a;
        toHide.style.display = 'none';
      });
    }
  });
}

/* ---------- HELPERS (sin cambios) ---------- */

function formatFechaCorta(iso) {
  const d = new Date(iso);
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return { dia: d.getDate(), mes: meses[d.getMonth()] };
}

function formatFechaRelativa(iso) {
  const d = new Date(iso);
  const ahora = new Date();
  const diff = (ahora - d) / 1000;
  if (diff < 60) return 'hace instantes';
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} hs`;
  if (diff < 86400*7) return `hace ${Math.floor(diff/86400)} días`;
  return d.toLocaleDateString('es-AR');
}

function formatPrecio(n) {
  if (n === null || n === undefined) return 'A combinar';
  if (n === 0) return 'REGALO';
  return '$' + n.toLocaleString('es-AR');
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
