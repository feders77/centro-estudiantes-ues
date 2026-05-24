# Intranet Centro de Estudiantes · v2

Prototipo funcional con **admin** y persistencia en `localStorage`.

## Cómo abrirlo

Doble click en `index.html`. Listo. Todo corre en el navegador, sin servidor ni dependencias.

## Páginas

| Página | Qué hace |
|---|---|
| `index.html` | Home pública con countdown, novedades, eventos próximos y votación destacada |
| `apuntes.html` | Apuntes con jerarquía Año → Orientación/División, publicación abierta a alumnos |
| `eventos.html` | Agenda agrupada por mes |
| `votaciones.html` | Votar (no crear). Permite cambiar el voto |
| `marketplace.html` | Compra/venta/regalo + sección **BUSCO** |
| `buzon.html` | Buzón anónimo (sin tocar) |
| `admin.html` | **Panel de administración** — CRUD completo |

## Cómo funciona la persistencia

- Todo se guarda en `localStorage` del navegador (clave `ce_intranet_v1`)
- **No se sincroniza entre dispositivos**: si cargás algo desde tu compu y abrís en el celu, no lo vas a ver
- Para pasar el contenido a otra máquina: Admin → **Datos** → Exportar JSON, después en la otra máquina, Importar
- La primera vez carga datos de ejemplo (para que se vea con vida)

## Admin

`admin.html` tiene 8 secciones:

1. **Resumen** — stats y actividad reciente
2. **Novedades** — crear, editar, borrar, activar/desactivar
3. **Eventos** — CRUD + marcar como destacado
4. **Votaciones** — crear, editar opciones (mantiene votos existentes), cerrar/reabrir, borrar
5. **Apuntes** — moderar lo que suben los alumnos (ocultar/borrar)
6. **Marketplace** — moderar publicaciones
7. **Config** — fecha del viaje a Bariloche, nota, confirmados
8. **Datos** — exportar JSON, importar JSON, reset completo

## Estructura académica

Cargada en `store.js` (línea ~110, sección `estructura`):

- **1° y 2°**: divisiones A/B/C, materias **pendientes de cargar**
- **3°**: Humanidades (cargada), Naturales y Economía pendientes
- **4°**: Humanidades (cargada), Naturales y Economía pendientes
- **5°**: las tres orientaciones pendientes

Cuando me pases las materias faltantes, edito directo `store.js`. Después podés "Resetear a datos de ejemplo" en el admin para recargar la nueva estructura.

> **Pendiente futuro:** sub-niveles de inglés (básico/intermedio/avanzado).

## Próximos pasos

Si esto se prende y el centro quiere usarlo posta:

1. **Backend real** (Supabase, gratis) → así todos los alumnos ven los mismos datos en tiempo real
2. **Login** → para que cada alumno publique con su identidad
3. **Subida de archivos real** → hoy es solo metadata; los PDFs habría que guardarlos en algún lado
4. **Notificaciones** → push/email cuando hay votación nueva o evento próximo

Pero por ahora, con esto tu hija puede verlo y mostrar la idea al resto.
