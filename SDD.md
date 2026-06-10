# SDD – Todos Synyster
**Spec Driven Development Document**
Version: V1.1.0 | Last updated: 2026-06-10

---

## 1. Visión general

**Todos Synyster** es un gestor de tareas completo inspirado en Todoist (funciones free + premium), construido en PHP + SQLite + JavaScript vanilla. Se ejecuta en EasyPHP 14.1b2 (PHP 5.4, Windows) sin frameworks externos.

### Objetivo
Reemplazar Todoist como herramienta personal de gestión de tareas, con todas las funciones premium disponibles offline y sin suscripción.

---

## 2. Stack técnico

| Capa | Tecnología |
|------|-----------|
| Servidor | EasyPHP 14.1b2 – Apache + PHP 5.4.31 (Windows) |
| Backend | PHP puro + SQLite3 (PDO) |
| Frontend | JavaScript vanilla (ES5) + CSS3 |
| Persistencia | SQLite (`data/todos.db`) |
| i18n | JSON locale files (ES / EN / FR) |
| Versionado | Git + GitHub (erickson558/todos-synyster) |
| Releases | GitHub Actions (tag → release automático) |

---

## 3. Restricciones PHP 5.4

**NUNCA usar:**
- `??` null coalescing → usar `isset($x) ? $x : $default`
- `define()` con arrays → usar constantes separadas
- `random_bytes()` → usar `openssl_random_pseudo_bytes()` o `uniqid()`
- `match()` → usar `switch`
- `fn() =>` arrow functions → `function() use(...) {}`
- Typed properties de clase
- `1_000` numeric separator

---

## 4. Arquitectura de archivos

```
todossynyster/
├── index.php                    # Shell HTML, enrutamiento SPA
├── VERSION                      # Versión actual (Vx.x.x)
├── CHANGELOG.md                 # Historial de versiones
├── README.md                    # Documentación pública
├── SDD.md                       # Este documento
├── .gitignore
├── backend/
│   ├── config.php               # Constantes globales, versión, DB path
│   └── db.php                   # Bootstrap SQLite, CREATE TABLE, migrations
├── api/
│   ├── tasks.php                # CRUD tareas (GET/POST/PUT/DELETE)
│   ├── projects.php             # CRUD proyectos
│   ├── labels.php               # CRUD etiquetas
│   ├── comments.php             # Comentarios en tareas
│   ├── stats.php                # Estadísticas de productividad
│   └── upload.php               # Adjuntos (archivos en tareas)
├── frontend/
│   ├── css/
│   │   └── style.css            # Tema oscuro + claro, responsive
│   └── js/
│       ├── app.js               # Controlador principal, router SPA
│       ├── api.js               # Cliente HTTP (fetch/XHR wrapper)
│       ├── tasks.js             # Renderizado y lógica de tareas
│       ├── projects.js          # Renderizado sidebar de proyectos
│       ├── views.js             # Vistas: inbox, today, upcoming, board, calendar
│       ├── dragdrop.js          # Drag & drop de tareas
│       ├── shortcuts.js         # Atajos de teclado
│       └── i18n.js              # Sistema de internacionalización
├── locales/
│   ├── es.json                  # Español
│   ├── en.json                  # English
│   └── fr.json                  # Français
├── data/
│   └── .gitkeep                 # La DB SQLite se genera aquí en runtime
├── .claude/
│   ├── agents/
│   │   ├── todos-dev.md         # Agente principal de desarrollo
│   │   ├── devops.md            # Agente DevOps y releases
│   │   └── qa.md                # Agente QA y testing
│   └── commands/
│       ├── github-push.md       # Skill: commit y push
│       ├── release.md           # Skill: crear release
│       ├── comment-code.md      # Skill: comentar código
│       └── test-api.md          # Skill: smoke-test de endpoints REST
└── .github/
    └── workflows/
        └── release.yml          # Release automático por tag
```

---

## 5. Esquema de base de datos

### Tabla: `projects`
```sql
CREATE TABLE projects (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  color     TEXT DEFAULT '#ff6b6b',
  icon      TEXT DEFAULT '📋',
  sort_order INTEGER DEFAULT 0,
  archived  INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Tabla: `labels`
```sql
CREATE TABLE labels (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#4ecdc4'
);
```

### Tabla: `tasks`
```sql
CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority    INTEGER DEFAULT 4,   -- 1=urgent, 2=high, 3=med, 4=none
  due_date    TEXT,                -- ISO 8601
  due_time    TEXT,
  recurrence  TEXT,                -- 'daily','weekly','monthly','yearly' o null
  completed   INTEGER DEFAULT 0,
  completed_at TEXT,
  sort_order  INTEGER DEFAULT 0,
  section_id  INTEGER,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);
```

### Tabla: `task_labels` (pivot)
```sql
CREATE TABLE task_labels (
  task_id  INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
```

### Tabla: `sections`
```sql
CREATE TABLE sections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

### Tabla: `comments`
```sql
CREATE TABLE comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Tabla: `reminders`
```sql
CREATE TABLE reminders (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id   INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  remind_at TEXT NOT NULL,
  sent      INTEGER DEFAULT 0
);
```

---

## 6. API REST (PHP)

Todos los endpoints en `api/*.php`. Responden JSON con `Content-Type: application/json`.

### Autenticación
Simple sesión PHP (sin usuario/password para uso personal local). `session_start()` en config.

### Endpoint: `api/tasks.php`
| Método | Acción | Parámetros |
|--------|--------|------------|
| GET | Listar tareas | `project_id`, `view` (inbox/today/upcoming/completed), `label_id`, `search` |
| POST | Crear tarea | `title`, `project_id`, `priority`, `due_date`, `recurrence`, `description`, `parent_id`, `labels[]` |
| PUT | Actualizar | `id` + campos a cambiar |
| DELETE | Eliminar | `id` |

### Endpoint: `api/projects.php`
| Método | Acción |
|--------|--------|
| GET | Listar proyectos |
| POST | Crear proyecto |
| PUT | Actualizar |
| DELETE | Archivar / eliminar |

### Endpoint: `api/stats.php`
| Método | Retorna |
|--------|---------|
| GET | `tasks_today`, `tasks_week`, `streak_days`, `completed_total`, `by_project[]`, `heatmap[]` |

---

## 7. Features (Todoist Free + Premium completo)

### Vistas
- [x] **Inbox** – tareas sin proyecto
- [x] **Hoy** – vencen hoy
- [x] **Próximos 7 días** – upcoming con agrupación por día
- [x] **Filtros** – por prioridad, etiqueta, fecha
- [x] **Búsqueda** – texto en título y descripción
- [x] **Board (Kanban)** – columnas por sección
- [x] **Calendario** – vista mensual de fechas límite

### Tareas
- [x] Título, descripción (Markdown)
- [x] Prioridad 1–4 (colores: rojo/naranja/azul/gris)
- [x] Fecha y hora límite
- [x] Recurrencia (diaria/semanal/mensual/anual/personalizada)
- [x] Sub-tareas (un nivel de anidación)
- [x] Etiquetas múltiples
- [x] Comentarios
- [x] Quick-add (tecla `Q` o barra superior)
- [x] Completar con checkbox animado
- [x] Reordenar con drag & drop

### Proyectos
- [x] Nombre + color + emoji
- [x] Secciones dentro de proyecto
- [x] Archivar proyectos
- [x] Contador de tareas pendientes

### Premium features
- [x] Recordatorios (`reminders` table – modal de alerta)
- [x] Vista Kanban / Board
- [x] Etiquetas sin límite
- [x] Filtros guardados
- [x] Adjuntos (upload de archivos)
- [x] Estadísticas y productividad (streak, heatmap, gráficas)
- [x] Temas (dark / light)
- [x] Atajos de teclado completos

### Extra (sobre Todoist)
- [x] Multi-idioma (ES / EN / FR)
- [x] Botón "Buy me a beer" PayPal
- [x] Alertas automáticas de fecha límite (Notification API + toast, cada 60s)

---

## 8. Internacionalización

Archivo `frontend/js/i18n.js` carga `locales/{lang}.json`.
Idioma detectado de: `localStorage` → `navigator.language` → `'es'` (default).
Selector de idioma en la barra superior.

---

## 9. Versionado

Formato: `Vx.y.z`
- **major** `x`: cambio de arquitectura o DB schema incompatible
- **minor** `y`: nueva feature completa
- **patch** `z`: bug fix, ajuste visual, traducción

Archivos a sincronizar:
1. `VERSION`
2. `backend/config.php` → `APP_VERSION`
3. `CHANGELOG.md`
4. Git tag + GitHub Release

---

## 10. Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `Q` | Quick-add tarea |
| `N` | Nueva tarea en vista actual |
| `Esc` | Cerrar modal / cancelar |
| `Enter` | Guardar tarea en edición |
| `/` | Focus búsqueda |
| `1–4` | Filtrar por prioridad |
| `T` | Ir a vista Hoy |
| `I` | Ir a Inbox |
| `U` | Ir a Próximos |

---

## 11. Notas de implementación críticas

### Cast de enteros en API (bug histórico)
PHP PDO SQLite devuelve todos los valores como strings. `completed = 0` llega al JS como `"0"` (string truthy) → tarea aparece tachada. Solución en `api/tasks.php`: castear `id`, `completed`, `priority`, `sort_order` a `(int)` antes del `json_encode`.

### Sistema de alertas de deadline
`initDeadlineChecker()` en `app.js`:
- Solicita permiso `Notification` al arrancar
- `setInterval(checkDeadlines, 60000)` compara tareas pendientes con `new Date()`
- Persiste IDs alertados en `localStorage` key `ts_alerted_YYYY-MM-DD` para no repetir
- Limpia claves de días anteriores en cada arranque

---

## 12. Historial de cambios al SDD

| Versión | Fecha | Cambio |
|---------|-------|--------|
| V1.1.0 | 2026-06-10 | Bug fix completed string; alertas deadline; mejoras visuales; agente QA; skill test-api |
| V1.0.0 | 2026-06-09 | Creación inicial del SDD |
