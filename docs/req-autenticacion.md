# Requisitos — Autenticación y Gestión de Usuarios

**Estado:** Pendiente de implementación (release futuro)  
**Stack previsto:** Supabase Auth + supabase-js (CDN) + RLS

---

## Roles

| Rol | Descripción |
|---|---|
| `pendiente` | Recién registrado, sin acceso hasta que un admin apruebe |
| `alumno` | Usuario aprobado. Puede votar, buzón, marketplace, apuntes |
| `administrador` | Acceso total + gestión de usuarios |

---

## Flujo de registro

1. El alumno completa el formulario en `registro.html`
2. Supabase crea el usuario en `auth.users`
3. Un trigger crea automáticamente una fila en `profiles` con `rol = 'pendiente'`
4. El alumno ve un mensaje: *"Tu cuenta fue creada. Un administrador la va a aprobar pronto."*
5. El admin ve los pendientes en su panel → aprueba → `rol = 'alumno'`
6. El alumno puede loguearse y navegar

---

## Formulario de registro

| Campo | Tipo | Notas |
|---|---|---|
| Nombre | texto | requerido |
| Apellido | texto | requerido |
| Alias | texto | opcional, se muestra en la UI en lugar del nombre completo |
| Nivel | selector | Primaria / Secundaria |
| Año | selector | depende del nivel (ver abajo) |
| Email | email | requerido, único |
| Contraseña | password | mínimo 8 caracteres |

### Selector de Curso

**Primaria:**
- 1° grado / 2° grado / 3° grado / 4° grado / 5° grado / 6° grado / 7° grado

**Secundaria:**
- 1° año / 2° año / 3° año / 4° año (+ orientación: Humanidades / Naturales / Economía) / 5° año (+ orientación) / 6° año (+ orientación)

---

## Tabla `profiles`

```sql
id          uuid  PK, FK → auth.users.id
nombre      text  NOT NULL
apellido    text  NOT NULL
alias       text  NULLABLE
nivel       text  'primaria' | 'secundaria'
anio        text  Ej: '1', '2', '5'
orientacion text  NULLABLE — 'humanidades' | 'naturales' | 'economia'
rol         text  DEFAULT 'pendiente'
created_at  timestamptz DEFAULT now()
```

---

## Permisos por rol

| Acción | Sin login | Alumno | Admin |
|---|---|---|---|
| Ver home, novedades, eventos | ✓ | ✓ | ✓ |
| Ver apuntes | ✓ | ✓ | ✓ |
| Votar | — | ✓ | ✓ |
| Buzón anónimo | — | ✓ | ✓ |
| Publicar en marketplace | — | ✓ | ✓ |
| Subir apuntes | — | ✓ | ✓ |
| Crear/editar novedades, eventos, votaciones | — | — | ✓ |
| Moderar marketplace y apuntes | — | — | ✓ |
| Aprobar/rechazar usuarios | — | — | ✓ |
| Cambiar roles | — | — | ✓ |
| Panel admin completo | — | — | ✓ |

---

## Páginas nuevas

- `login.html` — email + contraseña + link a registro + link "olvidé la contraseña"
- `registro.html` — formulario completo con selector de curso

## Cambios en páginas existentes

- `admin.html` — nueva sección "Usuarios" (solo visible para admins): lista de pendientes + lista de alumnos activos + cambio de rol + baja de usuario
- Todas las páginas — chip de usuario real (nombre/alias + avatar con iniciales) en lugar del mock "Cata · 5° A"
- Redirect a `login.html` si la acción requiere autenticación y el usuario no está logueado

---

## Seguridad (RLS)

- Escrituras en todas las tablas requieren `auth.uid()` con rol = `alumno` o `administrador`
- El campo `rol` en `profiles` solo puede modificarlo alguien con rol = `administrador`
- Lectura pública solo para `novedades`, `eventos` y `config`
- `buzon_mensajes` solo lo leen los administradores (ya configurado)

---

## Primer admin

Se crea directamente desde el dashboard de Supabase (tabla `profiles`, cambio manual de `rol` a `administrador`). No pasa por el flujo de aprobación.

---

## Notas de implementación (para cuando se retome)

- Usar `supabase-js` vía CDN en todas las páginas
- Crear `auth.js` como módulo compartido: `getSession()`, `getUser()`, `getRol()`, `logout()`
- El alias se muestra en el chip de usuario; si está vacío, se usa el nombre
- Deshabilitar confirmación por email en Supabase (la aprobación la hace el admin manualmente)
- Trigger en Supabase: `on auth.users insert → insert into profiles`
