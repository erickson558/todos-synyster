# Changelog – Todos Synyster

## [V1.1.0] – 2026-06-10

### Fixed
- **Bug crítico:** tareas nuevas aparecían con texto tachado — PHP PDO SQLite devuelve `completed` como string `"0"` que es truthy en JS; se castean ahora a integer en `api/tasks.php`

### Added
- **Alertas de fecha límite:** sistema de notificaciones que revisa cada 60 segundos si alguna tarea vence; muestra toast naranja + notificación del navegador (requiere permiso); persiste alertas ya disparadas en `localStorage` para no repetir
- **Agente QA** (`.claude/agents/qa.md`): agente especializado para verificar bugs, probar API y detectar regresiones
- **Skill `/test-api`** (`.claude/commands/test-api.md`): smoke-test de todos los endpoints REST con PowerShell

### Changed
- **Visual — fuentes más grandes y legibles:**
  - Base `font-size`: 14px → 15px, `line-height`: 1.5 → 1.6
  - `task-title`: 13px → 15px
  - Sidebar `nav-item`: 13px → 14px; padding 7px → 8px
  - `view-title`: 22px → 24px; `view-subtitle`: 13px → 14px
  - Modal title: 16px → 18px; empty-state h3: 16px → 18px
  - Task padding: 8px 12px → 10px 14px; gap 10px → 12px
  - `view-container` max-width: 740px → 780px; padding 32px → 36px
- **Toast warning** `#f0932b` para alertas de deadline

## [V1.0.0] – 2026-06-09

### Added
- Proyecto inicial completo: SPA PHP + SQLite + JS vanilla
- Vistas: Inbox, Hoy, Próximos 7 días, Calendario, Completadas, Estadísticas
- Vista Board (Kanban) por proyecto con secciones
- CRUD completo de tareas con: título, descripción, prioridad 1-4, fecha/hora límite, recurrencia, sub-tareas, etiquetas, comentarios
- Proyectos con colores y emoji
- Secciones dentro de proyectos
- Etiquetas con colores
- Drag & drop para reordenar tareas
- Quick-add con tecla Q
- Atajos de teclado completos (Q, N, T, I, U, /, Esc)
- Búsqueda en tiempo real
- Estadísticas: tareas completadas hoy/semana/total, racha de días, heatmap, gráfica por proyecto
- Multi-idioma: Español, English, Français
- Tema oscuro / claro (toggle en header)
- Botón "Invítame una cerveza" con PayPal
- GitHub Actions workflow para release automático por tag
- SDD, agentes y skills para Claude Code
- Soporte de recordatorios (tabla reminders)
- Recurrencia automática: al completar una tarea recurrente, se crea la siguiente
