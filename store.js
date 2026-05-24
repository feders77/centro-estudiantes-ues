/* =========================================================================
   STORE — Capa de datos sobre localStorage
   Todas las páginas (públicas y admin) leen/escriben acá.
   ========================================================================= */

const STORE_KEY = 'ce_intranet_v1';
const STORE_VERSION = 1;

/* ---------- SEED INICIAL (se carga sólo la primera vez) ---------- */
const SEED = {
  version: STORE_VERSION,
  config: {
    viajeFecha: '2026-08-09T06:00:00',
    viajeDestino: 'Bariloche',
    viajeConfirmados: 142,
    viajeTotal: 156,
    viajeNota: 'fecha tentativa'
  },

  /* ---------- NOVEDADES ---------- */
  novedades: [
    {
      id: 'n1',
      activa: true,
      tag: 'Urgente',
      tagTipo: 'urgent',
      autor: 'Centro de Estudiantes',
      fecha: '2026-05-22T10:00:00',
      titulo: 'Asamblea general el viernes 23/05 a las 12:30',
      texto: 'Tema único: definición del proyecto solidario que vamos a acompañar en el segundo cuatrimestre. Hay 4 propuestas sobre la mesa. Necesitamos a todos los delegados y a quien quiera sumarse. Salón de actos.',
      likes: 84,
      comentarios: 23
    },
    {
      id: 'n2',
      activa: true,
      tag: 'Votación abierta',
      tagTipo: 'vote',
      autor: 'Comisión Egresados',
      fecha: '2026-05-21T15:00:00',
      titulo: '¿Color de las camperas de promo?',
      texto: 'Quedamos en 3 opciones después de la asamblea del lunes. La votación cierra el sábado a las 23:59. Resultado vinculante: lo que gane se manda a producción.',
      likes: 126,
      comentarios: 41
    },
    {
      id: 'n3',
      activa: true,
      tag: 'Logística',
      tagTipo: '',
      autor: 'Comisión Remeras',
      fecha: '2026-05-20T11:00:00',
      titulo: 'Remeras del intercolegial: cierre de talles el viernes',
      texto: 'Ya pasamos los 80 pedidos. Si todavía no anotaste tu talle ni hiciste la transferencia, andá al link antes del viernes 23. Después no entran al lote.',
      likes: 47,
      comentarios: 12
    },
    {
      id: 'n4',
      activa: true,
      tag: 'Deportes',
      tagTipo: '',
      autor: 'Sub-comisión Deportes',
      fecha: '2026-05-19T18:00:00',
      titulo: 'Ganamos el clasificatorio de vóley femenino 🏐',
      texto: '3-1 contra Marianista. La semana que viene jugamos la semi contra San Bartolomé. Vamos todos a alentar — el partido es en el polideportivo de Fisherton.',
      likes: 312,
      comentarios: 58
    }
  ],

  /* ---------- EVENTOS ---------- */
  eventos: [
    {
      id: 'e1',
      titulo: 'Asamblea general',
      fecha: '2026-05-23T12:30:00',
      lugar: 'Salón de actos',
      categoria: 'centro',
      descripcion: 'Tema único: proyecto solidario del 2° cuatrimestre.',
      destacado: true
    },
    {
      id: 'e2',
      titulo: 'Parcial Matemática',
      fecha: '2026-05-28T09:00:00',
      lugar: '5° A y B',
      categoria: 'parcial',
      descripcion: 'Temas: trigonometría + logaritmos.',
      destacado: false
    },
    {
      id: 'e3',
      titulo: 'Cierre votación: jornada bienestar',
      fecha: '2026-05-30T23:59:00',
      lugar: 'Online',
      categoria: 'centro',
      descripcion: 'Última hora para votar la propuesta de la jornada de salud mental.',
      destacado: false
    },
    {
      id: 'e4',
      titulo: 'Semi vóley femenino',
      fecha: '2026-06-02T19:00:00',
      lugar: 'Polideportivo Fisherton',
      categoria: 'deportes',
      descripcion: 'vs. San Bartolomé. Vamos todos a alentar.',
      destacado: false
    },
    {
      id: 'e5',
      titulo: 'Kermesse solidaria',
      fecha: '2026-06-07T10:00:00',
      lugar: 'Patio del cole',
      categoria: 'centro',
      descripcion: 'Stands, comida, música. Recaudación al proyecto solidario elegido.',
      destacado: false
    },
    {
      id: 'e6',
      titulo: 'Viaje de egresados · Bariloche',
      fecha: '2026-08-09T06:00:00',
      lugar: 'Salida desde el cole',
      categoria: 'institucional',
      descripcion: '7 días, 6 noches. Fecha tentativa, sujeta a confirmación.',
      destacado: true
    }
  ],

  /* ---------- VOTACIONES ---------- */
  votaciones: [
    {
      id: 'v1',
      estado: 'abierta',
      titulo: 'Color de las camperas de promo',
      descripcion: 'Las 3 propuestas que salieron de la asamblea del lunes. La que gane se manda a producción.',
      cierre: '2026-05-24T23:59:00',
      participantes: 134,
      totalElegibles: 156,
      vinculante: false,
      opciones: [
        { id: 'o1', texto: 'Negro con detalles bordó', votos: 72 },
        { id: 'o2', texto: 'Bordó pleno con letras crema', votos: 42 },
        { id: 'o3', texto: 'Crema con detalles bordó', votos: 20 }
      ]
    },
    {
      id: 'v2',
      estado: 'abierta',
      titulo: 'Proyecto solidario del cuatrimestre',
      descripcion: 'Las recaudaciones de la kermesse van al proyecto que gane.',
      cierre: '2026-05-26T12:00:00',
      participantes: 89,
      totalElegibles: 580,
      vinculante: false,
      opciones: [
        { id: 'o1', texto: 'Hogar de niños "Casita"', votos: 37 },
        { id: 'o2', texto: 'Comedor barrial Tablada', votos: 25 },
        { id: 'o3', texto: 'Refugio animal Pelusa', votos: 16 },
        { id: 'o4', texto: 'Centro de adultos mayores', votos: 11 }
      ]
    },
    {
      id: 'v3',
      estado: 'abierta',
      titulo: 'Jornada de salud mental en convivencia',
      descripcion: 'Sub-comisión Bienestar propone destinar la jornada de junio a un taller con profesionales sobre ansiedad, presión académica y redes.',
      cierre: '2026-05-30T23:59:00',
      participantes: 247,
      totalElegibles: 580,
      vinculante: true,
      opciones: [
        { id: 'o1', texto: '👍 De acuerdo, que se haga', votos: 193 },
        { id: 'o2', texto: '🤔 Indiferente', votos: 35 },
        { id: 'o3', texto: '👎 En desacuerdo', votos: 19 }
      ]
    }
  ],

  /* ---------- ESTRUCTURA ACADÉMICA ---------- */
  estructura: {
    /* Materias por año + orientación.
       1°-2°: divisiones A/B/C, materias comunes.
       3°-5°: orientaciones Humanidades / Naturales / Economía. */
    '1': {
      divisiones: ['A', 'B', 'C'],
      materias: [] // pendiente que las cargue Fede
    },
    '2': {
      divisiones: ['A', 'B', 'C'],
      materias: [] // pendiente
    },
    '3': {
      orientaciones: {
        'Humanidades': [
          'Matemática','Historia','Teatro','Geografía','Biología',
          'Lengua y Literatura','Física','EDI','Inglés','Ciudadanía','Informática'
        ],
        'Naturales': [],   // pendiente
        'Economía': []     // pendiente
      }
    },
    '4': {
      orientaciones: {
        'Humanidades': [
          'Problemática Educativa','Psicología','Ciudadanía','Sociología',
          'Historia','Matemática','Geografía','EDI','Lengua y Literatura',
          'Química','Inglés','Informática','Robótica'
        ],
        'Naturales': [],   // pendiente
        'Economía': []     // pendiente
      }
    },
    '5': {
      orientaciones: {
        'Humanidades': [], // pendiente
        'Naturales': [],   // pendiente
        'Economía': []     // pendiente
      }
    }
  },

  /* ---------- APUNTES ---------- */
  apuntes: [
    {
      id: 'ap1',
      anio: '4',
      orientacion: 'Humanidades',
      division: null,
      materia: 'Historia',
      tipo: 'Resumen',
      titulo: 'Línea de tiempo Siglo XX argentino',
      descripcion: 'Resumen con todos los hitos. Ideal para repaso pre-parcial.',
      autorNombre: 'Sofía R.',
      autorCurso: '4° Humanidades',
      fecha: '2026-05-15T14:00:00',
      activo: true,
      descargas: 156,
      rating: 4.9
    },
    {
      id: 'ap2',
      anio: '4',
      orientacion: 'Humanidades',
      division: null,
      materia: 'Matemática',
      tipo: 'Parcial viejo',
      titulo: 'Parcial 1 - 2025 resuelto',
      descripcion: 'El parcial del año pasado con todas las respuestas explicadas paso a paso.',
      autorNombre: 'Tomás B.',
      autorCurso: '4° Humanidades',
      fecha: '2026-05-12T10:00:00',
      activo: true,
      descargas: 412,
      rating: 4.9
    },
    {
      id: 'ap3',
      anio: '3',
      orientacion: 'Humanidades',
      division: null,
      materia: 'Biología',
      tipo: 'Resumen',
      titulo: 'Sistema endocrino — resumen visual',
      descripcion: 'Con esquemas hechos a mano y los puntos clave del parcial.',
      autorNombre: 'Camila V.',
      autorCurso: '3° Humanidades',
      fecha: '2026-05-10T16:00:00',
      activo: true,
      descargas: 167,
      rating: 4.7
    }
  ],

  /* ---------- MARKETPLACE ---------- */
  marketplace: [
    {
      id: 'mp1',
      tipo: 'vende',
      categoria: 'libro',
      titulo: '"Pedro Páramo" + guía',
      precio: 4000,
      descripcion: 'El de Lit del año pasado. Marcado pero útil, vienen las notas de la prof.',
      vendedor: 'Sofía R.',
      curso: '4° Humanidades',
      fecha: '2026-05-17T10:00:00',
      activo: true
    },
    {
      id: 'mp2',
      tipo: 'vende',
      categoria: 'calculadora',
      titulo: 'Casio fx-991 Spanish',
      precio: 28000,
      descripcion: 'Funciona perfecto, le entran las funciones del CBC. Cargador no incluye.',
      vendedor: 'Juan Pablo G.',
      curso: '5° Humanidades',
      fecha: '2026-05-21T15:00:00',
      activo: true
    },
    {
      id: 'mp3',
      tipo: 'regala',
      categoria: 'libro',
      titulo: 'Manual de Historia Argentina',
      precio: 0,
      descripcion: 'No lo uso más. Lo pasa primero el que escriba. Buen estado.',
      vendedor: 'Camila V.',
      curso: '3° Humanidades',
      fecha: '2026-05-22T08:00:00',
      activo: true
    },
    {
      id: 'mp4',
      tipo: 'vende',
      categoria: 'utiles',
      titulo: 'Set geométrico completo',
      precio: 5500,
      descripcion: 'Regla, escuadra, compás, transportador. Sin estrenar — me lo regalaron 2 veces.',
      vendedor: 'Lucía M.',
      curso: '2° A',
      fecha: '2026-05-20T12:00:00',
      activo: true
    },
    {
      id: 'mp5',
      tipo: 'vende',
      categoria: 'arte',
      titulo: 'Caja de óleos casi llena',
      precio: 12000,
      descripcion: '18 colores, faltan 2 que ya se gastaron. Compré para Arte 4° y me quedó.',
      vendedor: 'Valentina T.',
      curso: '4° Humanidades',
      fecha: '2026-05-14T17:00:00',
      activo: true
    },
    {
      id: 'mp6',
      tipo: 'busca',
      categoria: 'libro',
      titulo: 'BUSCO: "El túnel" de Sábato',
      precio: null,
      descripcion: 'Necesito el de Lit para 4°. Si alguien tiene uno que ya no use, escribime.',
      vendedor: 'Pedro N.',
      curso: '4° Humanidades',
      fecha: '2026-05-21T09:00:00',
      activo: true
    }
  ]
};

/* ---------- API DEL STORE ---------- */

const Store = {
  /* Carga toda la data. Si no hay nada en localStorage, siembra el seed. */
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        this.save(SEED);
        return JSON.parse(JSON.stringify(SEED));
      }
      const data = JSON.parse(raw);
      // migración simple: si falta una sección la rellena
      for (const k of Object.keys(SEED)) {
        if (!(k in data)) data[k] = SEED[k];
      }
      return data;
    } catch (e) {
      console.error('Store.load error, restaurando seed', e);
      this.save(SEED);
      return JSON.parse(JSON.stringify(SEED));
    }
  },

  save(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  },

  reset() {
    localStorage.removeItem(STORE_KEY);
    return this.load();
  },

  /* CRUD genérico por colección */
  list(coleccion, soloActivos = false) {
    const data = this.load();
    const arr = data[coleccion] || [];
    if (!soloActivos) return arr;
    return arr.filter(x => x.activo !== false && x.activa !== false);
  },

  get(coleccion, id) {
    const arr = this.list(coleccion);
    return arr.find(x => x.id === id);
  },

  add(coleccion, item) {
    const data = this.load();
    if (!data[coleccion]) data[coleccion] = [];
    if (!item.id) item.id = coleccion.slice(0,2) + Date.now() + Math.floor(Math.random()*1000);
    data[coleccion].unshift(item);
    this.save(data);
    return item;
  },

  update(coleccion, id, cambios) {
    const data = this.load();
    const arr = data[coleccion] || [];
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return null;
    arr[idx] = { ...arr[idx], ...cambios };
    this.save(data);
    return arr[idx];
  },

  remove(coleccion, id) {
    const data = this.load();
    data[coleccion] = (data[coleccion] || []).filter(x => x.id !== id);
    this.save(data);
  },

  /* Config (objeto, no array) */
  getConfig() {
    return this.load().config || {};
  },
  setConfig(cambios) {
    const data = this.load();
    data.config = { ...data.config, ...cambios };
    this.save(data);
    return data.config;
  },

  /* Estructura académica */
  getEstructura() {
    return this.load().estructura || {};
  },
  setEstructura(nueva) {
    const data = this.load();
    data.estructura = nueva;
    this.save(data);
  },

  /* Export / Import */
  exportAll() {
    return JSON.stringify(this.load(), null, 2);
  },
  importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    this.save(data);
    return data;
  }
};

/* ---------- HELPERS ---------- */

function formatFechaCorta(iso) {
  const d = new Date(iso);
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return { dia: d.getDate(), mes: meses[d.getMonth()] };
}

function formatFechaRelativa(iso) {
  const d = new Date(iso);
  const ahora = new Date();
  const diff = (ahora - d) / 1000; // segundos
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
