# Intranet Centro de Estudiantes · Sagrado Corazón Rosario

Prototipo funcional del Centro de Estudiantes del Colegio Sagrado Corazón de Rosario.

**Demo en vivo:** https://feders77.github.io/centro-estudiantes-ues/

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JS vanilla (sin frameworks) |
| Backend / DB | [Supabase](https://supabase.com) — proyecto `qllcdhxisawvitlavtog` |
| Hosting | GitHub Pages |

## Correr en local

```
python -m http.server 8000
```

Abrí `http://localhost:8000`. Requiere conexión a internet (consulta Supabase).

## Páginas

| Página | Qué hace |
|---|---|
| `index.html` | Home con countdown, novedades, eventos próximos y votación destacada |
| `apuntes.html` | Apuntes con jerarquía Año → Orientación/División, publicación abierta a alumnos |
| `eventos.html` | Agenda agrupada por mes |
| `votaciones.html` | Votar (no crear). Permite cambiar el voto |
| `marketplace.html` | Compra/venta/regalo + sección BUSCO |
| `buzon.html` | Buzón anónimo — los mensajes se leen desde el dashboard de Supabase |
| `admin.html` | Panel de administración — CRUD completo |

## Cómo agregar contenido

Abrí `admin.html` (o la URL de GitHub Pages + `/admin.html`) y usá el panel. Los cambios quedan guardados en Supabase y son visibles para todos en tiempo real.

## Base de datos (Supabase)

Dashboard: https://supabase.com/dashboard/project/qllcdhxisawvitlavtog

Tablas:

| Tabla | Uso |
|---|---|
| `config` | Configuración global (viaje a Bariloche, etc.) |
| `novedades` | Posts de novedades |
| `eventos` | Eventos de la agenda |
| `votaciones` | Votaciones con opciones y conteo de votos |
| `estructura_academica` | Jerarquía de años, orientaciones y materias |
| `apuntes` | Apuntes subidos por alumnos |
| `marketplace` | Publicaciones de compra/venta/regalo |
| `buzon_mensajes` | Mensajes del buzón anónimo |

RLS habilitado en todas las tablas. La `anon key` (pública) permite lectura y escritura de contenido. Los mensajes del buzón solo se leen desde el dashboard con la `service_role key`.

## Seguridad

- `supabase-config.js` contiene la `anon key` — es pública por diseño (Supabase RLS controla el acceso)
- `.env.local` y `.claude/settings.local.json` están en `.gitignore` y nunca se commitean
- La `service_role key` no aparece en ningún archivo del repo

---

Prototipo · No oficial · Sagrado Corazón Rosario · 2026
