# Todos Synyster

> Gestor de tareas personal completo, inspirado en Todoist con todas las funciones premium.
> Construido en PHP + SQLite + JavaScript vanilla. Sin dependencias externas. 100% offline.

[![Version](https://img.shields.io/badge/version-V1.0.0-e94560?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](LICENSE)
[![PHP](https://img.shields.io/badge/PHP-5.4%2B-777bb4?style=flat-square)](https://php.net)

---

## Funcionalidades

### Vistas
- **Inbox** — tareas sin proyecto
- **Hoy** — vencen hoy
- **Próximos 7 días** — agrupadas por día
- **Calendario** — vista mensual con tareas
- **Board / Kanban** — columnas por sección de proyecto
- **Estadísticas** — racha, heatmap, por proyecto
- **Búsqueda** — texto en tiempo real

### Tareas
- Título, descripción (texto libre)
- Prioridad 1-4 (🔴 Urgente / 🟠 Alta / 🟣 Media / ⚪ Ninguna)
- Fecha y hora límite
- Recurrencia (diaria / semanal / mensual / anual)
- Sub-tareas
- Etiquetas múltiples con color
- Comentarios
- Drag & drop para reordenar

### Features premium incluidas
- Recordatorios
- Vista Kanban / Board
- Etiquetas ilimitadas
- Estadísticas y productividad
- Adjuntos de archivos
- Temas oscuro / claro
- Filtros por etiqueta, proyecto, fecha

### Extra
- **Multi-idioma**: Español, English, Français
- **Sin cuenta, sin nube** — datos en SQLite local
- **Botón de apoyo** PayPal: "Invítame una cerveza"

---

## Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `Q` | Quick-add tarea |
| `N` | Nueva tarea |
| `Esc` | Cerrar modal |
| `/` | Búsqueda |
| `T` | Vista Hoy |
| `I` | Inbox |
| `U` | Próximos |

---

## Instalación

### Requisitos
- EasyPHP 14.1b2 (PHP 5.4+) o cualquier servidor Apache/PHP
- PHP con extensión PDO + SQLite3

### Pasos
```bash
# 1. Clonar en la carpeta www
git clone https://github.com/erickson558/todos-synyster.git
# 2. Abrir en el navegador
http://localhost:888/monitoreos/todossynyster/
```

La base de datos SQLite se crea automáticamente en `data/todos.db` al primer acceso.

---

## Estructura del proyecto

```
todossynyster/
├── index.php              # Shell HTML (SPA entry point)
├── backend/
│   ├── config.php         # Constantes globales
│   └── db.php             # Bootstrap SQLite
├── api/
│   ├── tasks.php          # CRUD tareas
│   ├── projects.php       # CRUD proyectos
│   ├── labels.php         # CRUD etiquetas
│   ├── sections.php       # CRUD secciones
│   ├── comments.php       # Comentarios
│   └── stats.php          # Estadísticas
├── frontend/
│   ├── css/style.css      # Tema dark/light
│   └── js/
│       ├── app.js         # Controlador principal
│       ├── api.js         # Cliente HTTP
│       ├── i18n.js        # Internacionalización
│       ├── dragdrop.js    # Drag & drop
│       └── shortcuts.js   # Atajos de teclado
├── locales/               # ES / EN / FR
├── data/                  # SQLite DB (ignorada en git)
├── SDD.md                 # Spec Driven Development
└── CHANGELOG.md
```

---

## Versionado

`Vx.y.z` (SemVer con prefijo V)

| Cambio | Segmento |
|--------|----------|
| Arquitectura / DB incompatible | major |
| Nueva feature completa | minor |
| Bug fix, ajuste visual | patch |

---

## Contribuir

1. Usa el agente `todos-dev` en Claude Code para cambios de código
2. Usa `/github-push` para commit y push
3. Usa `/release patch|minor|major` para publicar versión

---

## Apoyo

Si este proyecto te es útil, considera invitarme una cerveza:

[![Donate](https://img.shields.io/badge/PayPal-🍺%20Buy%20me%20a%20beer-FFD700?style=flat-square&logo=paypal)](https://www.paypal.com/donate/?hosted_button_id=ZABFRXC2P3JQN)

---

## Licencia

Apache License 2.0 — ver [LICENSE](LICENSE)

Desarrollado por **Synyster Rick** | erickson558
