/**
 * app.js — Controlador principal de Todos Synyster.
 * Orquesta vistas, tareas, proyectos, etiquetas, modal, toast y shortcuts.
 *
 * Arquitectura SPA sin framework:
 * - Estado global en App.state
 * - Render siempre re-dibuja desde estado (no patching manual del DOM)
 * - Módulos externos: Api, i18n, DragDrop, Shortcuts
 */
var App = (function () {

  /* ── Estado global ─────────────────────────────────────── */
  var state = {
    view:       'inbox',   // vista activa
    projectId:  null,      // proyecto activo (null = inbox/global)
    labelId:    null,
    search:     '',
    tasks:      [],
    projects:   [],
    labels:     [],
    stats:      null,
    theme:      localStorage.getItem('ts_theme') || 'dark',
    editTask:   null,      // tarea que se está editando en el modal
    calMonth:   new Date().getMonth(),
    calYear:    new Date().getFullYear(),
  };

  /* ── Helpers ───────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  function showToast(msg, type) {
    var c   = $('toast-container');
    var div = document.createElement('div');
    div.className = 'toast ' + (type || 'info');
    div.textContent = msg;
    c.appendChild(div);
    setTimeout(function () {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, 3200);
  }

  function fmtDate(d) {
    if (!d) return '';
    var parts = d.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function dateClass(dueDate) {
    if (!dueDate) return '';
    var today = new Date(); today.setHours(0,0,0,0);
    var due   = new Date(dueDate + 'T00:00:00');
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  }

  function priorityLabel(p) {
    var map = { 1: i18n.t('prio_urgent'), 2: i18n.t('prio_high'), 3: i18n.t('prio_medium'), 4: i18n.t('prio_none') };
    return map[p] || 'P' + p;
  }

  /* ── Carga de datos ────────────────────────────────────── */
  function loadProjects() {
    return Api.projects.list().then(function (res) {
      if (res.ok) state.projects = res.data;
      renderSidebar();
    });
  }

  function loadLabels() {
    return Api.labels.list().then(function (res) {
      if (res.ok) state.labels = res.data;
    });
  }

  function loadTasks() {
    var params = { view: state.view };
    if (state.projectId) params.project_id = state.projectId;
    if (state.labelId)   params.label_id   = state.labelId;
    if (state.search)    params.search      = state.search;

    return Api.tasks.list(params).then(function (res) {
      if (res.ok) { state.tasks = res.data; renderTasks(); }
    });
  }

  function loadStats() {
    Api.stats.get().then(function (res) {
      if (res.ok) { state.stats = res.data; renderStats(); }
    });
  }

  /* ── Render sidebar ────────────────────────────────────── */
  function renderSidebar() {
    var t = i18n.t.bind(i18n);

    // Actualizar contadores de vistas
    var navItems = document.querySelectorAll('.nav-item[data-view]');
    for (var i = 0; i < navItems.length; i++) {
      var v = navItems[i].getAttribute('data-view');
      navItems[i].classList.toggle('active', v === state.view && !state.projectId && !state.labelId);
    }

    // Lista de proyectos
    var projList = $('sidebar-projects');
    if (!projList) return;
    projList.innerHTML = '';

    state.projects.forEach(function (p) {
      var li = document.createElement('div');
      li.className = 'nav-item' + (state.projectId === p.id ? ' active' : '');
      li.setAttribute('data-project', p.id);
      li.innerHTML =
        '<span class="project-dot" style="background:' + p.color + '"></span>' +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.icon + ' ' + p.name) + '</span>' +
        (p.task_count > 0 ? '<span class="nav-count">' + p.task_count + '</span>' : '');
      li.addEventListener('click', function () { setProject(p.id); });
      projList.appendChild(li);
    });

    // Lista de etiquetas
    var lblList = $('sidebar-labels');
    if (!lblList) return;
    lblList.innerHTML = '';
    state.labels.forEach(function (l) {
      var li = document.createElement('div');
      li.className = 'nav-item' + (state.labelId === l.id ? ' active' : '');
      li.innerHTML =
        '<span style="width:10px;height:10px;border-radius:50%;background:' + l.color + ';flex-shrink:0"></span>' +
        '<span>' + escHtml(l.name) + '</span>' +
        (l.task_count > 0 ? '<span class="nav-count">' + l.task_count + '</span>' : '');
      li.addEventListener('click', function () { setLabel(l.id); });
      lblList.appendChild(li);
    });
  }

  /* ── Render lista de tareas ────────────────────────────── */
  function renderTasks() {
    var container = $('view-container');
    if (!container) return;

    if (state.view === 'board') { renderBoard(); return; }
    if (state.view === 'calendar') { renderCalendar(); return; }
    if (state.view === 'stats') { loadStats(); return; }

    // Título de vista
    var title = viewTitle();
    var html = '<div class="view-header">' +
      '<div><div class="view-title">' + escHtml(title) + '</div>' +
      (state.tasks.length ? '<div class="view-subtitle">' + state.tasks.length + ' ' + i18n.t('tasks') + '</div>' : '') +
      '</div></div>';

    // Quick-add
    html += '<div id="quick-add-bar" role="button" tabindex="0">' +
      '<span class="plus-icon">+</span>' +
      '<span>' + i18n.t('add_task') + ' <span class="kbd">Q</span></span>' +
      '</div>';

    if (state.view === 'upcoming') {
      html += renderUpcomingGroups();
    } else {
      html += renderTaskList(state.tasks);
    }

    container.className = '';
    container.innerHTML = html;

    // Re-adjuntar DnD y eventos
    attachTaskEvents();
    var qab = $('quick-add-bar');
    if (qab) {
      qab.addEventListener('click', function () { openTaskModal(null); });
      qab.addEventListener('keydown', function (e) { if (e.key === 'Enter') openTaskModal(null); });
    }
  }

  function viewTitle() {
    if (state.projectId) {
      var proj = state.projects.find(function (p) { return p.id === state.projectId; });
      return proj ? (proj.icon + ' ' + proj.name) : i18n.t('project');
    }
    if (state.labelId) {
      var lbl = state.labels.find(function (l) { return l.id === state.labelId; });
      return lbl ? ('🏷 ' + lbl.name) : i18n.t('label');
    }
    var map = {
      inbox:     i18n.t('nav_inbox'),
      today:     i18n.t('nav_today'),
      upcoming:  i18n.t('nav_upcoming'),
      completed: i18n.t('nav_completed'),
      stats:     i18n.t('nav_stats'),
    };
    return map[state.view] || state.view;
  }

  function renderTaskList(tasks) {
    if (!tasks || tasks.length === 0) {
      return '<div class="empty-state">' +
        '<div class="empty-icon">✅</div>' +
        '<h3>' + i18n.t('no_tasks') + '</h3>' +
        '<p>' + i18n.t('no_tasks_hint') + '</p>' +
        '</div>';
    }
    return '<div class="tasks-list" id="tasks-list">' +
      tasks.map(function (t) { return renderTaskItem(t); }).join('') +
      '</div>';
  }

  function renderTaskItem(t, isSubtask) {
    var isDone  = +t.completed === 1;
    var dClass  = dateClass(t.due_date);
    var dText   = t.due_date ? fmtDate(t.due_date) + (t.due_time ? ' ' + t.due_time : '') : '';
    var labels  = (t.labels || []).map(function (l) {
      return '<span class="task-label" style="background:' + l.color + '22;color:' + l.color + '">' + escHtml(l.name) + '</span>';
    }).join('');

    var projectTag = (!state.projectId && !isSubtask && t.project_name)
      ? '<span class="task-project-tag"><span class="dot" style="background:' + t.project_color + '"></span>' + escHtml(t.project_name) + '</span>'
      : '';

    var subInfo = t.subtask_count > 0
      ? '<span class="task-sub-info">⋯ ' + t.subtask_count + ' sub</span>'
      : '';

    var dueHtml = dText
      ? '<span class="task-due ' + dClass + '">📅 ' + escHtml(dText) + '</span>'
      : '';

    return '<div class="task-item' + (isDone ? ' completed' : '') + '" data-id="' + t.id + '" data-priority="' + t.priority + '">' +
      '<span class="task-drag-handle" title="' + i18n.t('drag') + '">⠿</span>' +
      '<div class="task-check' + (isDone ? ' checked' : '') + '" data-id="' + t.id + '" data-done="' + t.completed + '"></div>' +
      '<div class="task-content">' +
        '<div class="task-title">' + escHtml(t.title) + '</div>' +
        '<div class="task-meta">' + dueHtml + projectTag + labels + subInfo + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderUpcomingGroups() {
    if (!state.tasks.length) {
      return '<div class="empty-state"><div class="empty-icon">📅</div><h3>' + i18n.t('no_upcoming') + '</h3></div>';
    }
    // Agrupar por fecha
    var groups = {};
    state.tasks.forEach(function (t) {
      var d = t.due_date || 'no_date';
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });
    var html = '';
    var keys = Object.keys(groups).sort();
    keys.forEach(function (d) {
      var dateLabel = d === 'no_date' ? i18n.t('no_date') : formatGroupDate(d);
      html += '<div class="day-group">' +
        '<div class="day-group-title">' + dateLabel + ' <span class="day-badge">' + groups[d].length + '</span></div>' +
        renderTaskList(groups[d]) +
        '</div>';
    });
    return html;
  }

  function formatGroupDate(d) {
    var today = new Date(); today.setHours(0,0,0,0);
    var tmrw  = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
    var dd    = new Date(d + 'T00:00:00');
    if (dd.getTime() === today.getTime()) return i18n.t('today');
    if (dd.getTime() === tmrw.getTime())  return i18n.t('tomorrow');
    return fmtDate(d);
  }

  /* ── Vista Board (Kanban) ──────────────────────────────── */
  function renderBoard() {
    var container = $('view-container');
    container.className = 'board-view';

    if (!state.projectId) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>' + i18n.t('board_select_project') + '</h3></div>';
      return;
    }

    var proj     = state.projects.find(function (p) { return p.id === state.projectId; });
    var sections = (proj && proj.sections) || [];

    var html = '<div class="view-header" style="padding:0 24px 16px">' +
      '<div class="view-title">' + escHtml(proj ? proj.icon + ' ' + proj.name : '') + '</div>' +
      '</div>' +
      '<div id="board-columns">';

    // Columna Inbox del proyecto (sin sección)
    var noSec = state.tasks.filter(function (t) { return !t.section_id; });
    html += buildBoardColumn(null, i18n.t('no_section'), '#5c6b8a', noSec);

    sections.forEach(function (sec) {
      var secTasks = state.tasks.filter(function (t) { return t.section_id === sec.id; });
      html += buildBoardColumn(sec.id, sec.name, '#a29bfe', secTasks);
    });

    // Botón nueva columna
    html += '<div style="flex-shrink:0;display:flex;align-items:flex-start;padding-top:4px">' +
      '<button class="btn btn-ghost" id="btn-add-section">+ ' + i18n.t('add_section') + '</button>' +
      '</div>';

    html += '</div>';
    container.innerHTML = html;

    attachTaskEvents();

    var btn = $('btn-add-section');
    if (btn) {
      btn.addEventListener('click', function () {
        var name = prompt(i18n.t('section_name'));
        if (!name) return;
        Api.sections.create({ project_id: state.projectId, name: name }).then(function () {
          refresh();
        });
      });
    }
  }

  function buildBoardColumn(sectionId, name, color, tasks) {
    var col = '<div class="board-column">' +
      '<div class="board-column-header" style="border-top:3px solid ' + color + '">' +
        '<span>' + escHtml(name) + '</span>' +
        '<span class="nav-count">' + tasks.length + '</span>' +
      '</div>' +
      '<div class="board-column-body" data-section="' + (sectionId || '') + '">' +
        tasks.map(function (t) { return renderTaskItem(t); }).join('') +
      '</div>' +
      '<div class="board-column-add" data-section="' + (sectionId || '') + '">+ ' + i18n.t('add_task') + '</div>' +
    '</div>';
    return col;
  }

  /* ── Vista Calendario ──────────────────────────────────── */
  function renderCalendar() {
    var container = $('view-container');
    container.className = '';

    var year  = state.calYear;
    var month = state.calMonth; // 0-indexed
    var today = new Date();

    var monthNames = [
      i18n.t('month_jan'), i18n.t('month_feb'), i18n.t('month_mar'),
      i18n.t('month_apr'), i18n.t('month_may'), i18n.t('month_jun'),
      i18n.t('month_jul'), i18n.t('month_aug'), i18n.t('month_sep'),
      i18n.t('month_oct'), i18n.t('month_nov'), i18n.t('month_dec'),
    ];

    var html = '<div class="view-header">' +
      '<div class="view-title">' + i18n.t('nav_calendar') + '</div>' +
      '<div class="view-actions">' +
        '<button class="btn btn-ghost" id="cal-prev">&#8249;</button>' +
        '<strong style="min-width:140px;text-align:center">' + monthNames[month] + ' ' + year + '</strong>' +
        '<button class="btn btn-ghost" id="cal-next">&#8250;</button>' +
      '</div>' +
    '</div>';

    html += '<div id="calendar-grid">';
    var dayNames = [i18n.t('d_mon'),i18n.t('d_tue'),i18n.t('d_wed'),i18n.t('d_thu'),i18n.t('d_fri'),i18n.t('d_sat'),i18n.t('d_sun')];
    dayNames.forEach(function (d) {
      html += '<div class="cal-day-name">' + d + '</div>';
    });

    var firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    // Convertir a lunes = 0
    var startOffset = (firstDay + 6) % 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevDays    = new Date(year, month, 0).getDate();

    // Tareas agrupadas por fecha para este mes
    var tasksByDate = {};
    state.tasks.forEach(function (t) {
      if (t.due_date) {
        if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = [];
        tasksByDate[t.due_date].push(t);
      }
    });

    // Días del mes anterior
    for (var i = 0; i < startOffset; i++) {
      var pday = prevDays - startOffset + 1 + i;
      html += '<div class="cal-cell other-month"><div class="cal-day-num">' + pday + '</div></div>';
    }

    // Días del mes actual
    for (var d = 1; d <= daysInMonth; d++) {
      var mm    = (month + 1 < 10 ? '0' : '') + (month + 1);
      var dd2   = (d < 10 ? '0' : '') + d;
      var dateStr = year + '-' + mm + '-' + dd2;
      var isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d);
      var dayTasks = tasksByDate[dateStr] || [];

      html += '<div class="cal-cell' + (isToday ? ' today' : '') + '" data-date="' + dateStr + '">' +
        '<div class="cal-day-num">' + d + '</div>' +
        dayTasks.slice(0, 3).map(function (t) {
          var bg = t.project_color || '#5c6b8a';
          return '<div class="cal-task-dot" style="background:' + bg + '22;color:' + bg + '" data-id="' + t.id + '">' + escHtml(t.title) + '</div>';
        }).join('') +
        (dayTasks.length > 3 ? '<div class="cal-task-dot" style="color:var(--text-muted)">+' + (dayTasks.length - 3) + '</div>' : '') +
      '</div>';
    }

    // Días del mes siguiente para completar grid
    var totalCells = startOffset + daysInMonth;
    var remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (var nx = 1; nx <= remaining; nx++) {
      html += '<div class="cal-cell other-month"><div class="cal-day-num">' + nx + '</div></div>';
    }

    html += '</div>'; // #calendar-grid

    container.innerHTML = html;

    document.getElementById('cal-prev').addEventListener('click', function () {
      state.calMonth--;
      if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
      renderCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', function () {
      state.calMonth++;
      if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
      renderCalendar();
    });

    // Click en celda = nueva tarea con esa fecha
    var cells = container.querySelectorAll('.cal-cell[data-date]');
    for (var ci = 0; ci < cells.length; ci++) {
      (function (cell) {
        cell.addEventListener('click', function () {
          openTaskModal(null, { due_date: cell.getAttribute('data-date') });
        });
      })(cells[ci]);
    }
  }

  /* ── Vista Estadísticas ────────────────────────────────── */
  function renderStats() {
    var container = $('view-container');
    if (!state.stats) {
      container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
      return;
    }
    var s    = state.stats;
    var html = '<div class="view-header"><div class="view-title">' + i18n.t('nav_stats') + '</div></div>';

    html += '<div class="stats-grid">' +
      statCard(s.tasks_today,     i18n.t('stat_today')) +
      statCard(s.tasks_week,      i18n.t('stat_week')) +
      statCard(s.completed_total, i18n.t('stat_total')) +
      statCard(s.streak_days,     i18n.t('stat_streak') + ' 🔥') +
      statCard(s.pending_total,   i18n.t('stat_pending')) +
    '</div>';

    // Heatmap
    html += '<h3 style="margin-bottom:12px;color:var(--text-secondary)">' + i18n.t('stat_heatmap') + '</h3>';
    html += '<div class="heatmap">';
    var hmap = s.heatmap || [];
    var maxH = 1;
    hmap.forEach(function (h) { if (h.count > maxH) maxH = h.count; });
    hmap.forEach(function (h) {
      var level = Math.ceil((h.count / maxH) * 4);
      html += '<div class="heatmap-cell" data-level="' + level + '" title="' + h.day + ': ' + h.count + '"></div>';
    });
    html += '</div>';

    // Por proyecto
    if (s.by_project && s.by_project.length) {
      html += '<h3 style="margin:24px 0 12px;color:var(--text-secondary)">' + i18n.t('stat_by_project') + '</h3>';
      s.by_project.forEach(function (p) {
        var total = (p.pending || 0) + (p.done || 0);
        var pct   = total > 0 ? Math.round((p.done / total) * 100) : 0;
        html += '<div style="margin-bottom:14px">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">' +
            '<span>' + escHtml(p.icon + ' ' + p.name) + '</span>' +
            '<span style="color:var(--text-muted)">' + pct + '%</span>' +
          '</div>' +
          '<div style="height:6px;background:var(--bg-hover);border-radius:3px">' +
            '<div style="height:6px;width:' + pct + '%;background:var(--accent);border-radius:3px;transition:width 0.5s"></div>' +
          '</div>' +
        '</div>';
      });
    }

    container.innerHTML = html;
  }

  function statCard(num, label) {
    return '<div class="stat-card"><div class="stat-num">' + (num || 0) + '</div><div class="stat-label">' + label + '</div></div>';
  }

  /* ── Modal de tarea ────────────────────────────────────── */
  function openTaskModal(task, defaults) {
    state.editTask = task || null;
    var overlay    = $('modal-overlay');
    var isEdit     = !!task;

    var projectOptions = '<option value="">' + i18n.t('no_project') + '</option>';
    state.projects.forEach(function (p) {
      var sel = (task && task.project_id === p.id) || (!task && state.projectId === p.id && p.id);
      projectOptions += '<option value="' + p.id + '"' + (sel ? ' selected' : '') + '>' + escHtml(p.icon + ' ' + p.name) + '</option>';
    });

    var labelChecks = state.labels.map(function (l) {
      var checked = task && task.labels && task.labels.some(function (tl) { return tl.id === l.id; });
      return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">' +
        '<input type="checkbox" name="labels" value="' + l.id + '"' + (checked ? ' checked' : '') + '>' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + l.color + ';flex-shrink:0"></span>' +
        escHtml(l.name) + '</label>';
    }).join('');

    var defDate = (defaults && defaults.due_date) || (task && task.due_date) || '';
    var defTime = (task && task.due_time) || '';
    var defRec  = (task && task.recurrence) || '';
    var defDesc = (task && task.description) || '';
    var defPrio = (task && task.priority) || 4;

    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-header">' +
          '<span class="modal-title">' + i18n.t(isEdit ? 'edit_task' : 'new_task') + '</span>' +
          '<button class="modal-close" id="modal-close">×</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="form-group">' +
            '<input class="form-input" id="task-title" placeholder="' + i18n.t('task_title') + '" value="' + escHtml(task ? task.title : '') + '" autofocus>' +
          '</div>' +
          '<div class="form-group">' +
            '<textarea class="form-textarea" id="task-desc" placeholder="' + i18n.t('task_desc') + '">' + escHtml(defDesc) + '</textarea>' +
          '</div>' +

          '<label class="form-label">' + i18n.t('priority') + '</label>' +
          '<div class="priority-btns" style="margin-bottom:14px">' +
            [1,2,3,4].map(function (p) {
              return '<button class="priority-btn' + (defPrio === p ? ' active' : '') + '" type="button" data-p="' + p + '">' + priorityLabel(p) + '</button>';
            }).join('') +
          '</div>' +

          '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">' + i18n.t('due_date') + '</label>' +
              '<input class="form-input" id="task-due-date" type="date" value="' + defDate + '"></div>' +
            '<div class="form-group"><label class="form-label">' + i18n.t('due_time') + '</label>' +
              '<input class="form-input" id="task-due-time" type="time" value="' + defTime + '"></div>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label">' + i18n.t('recurrence') + '</label>' +
            '<select class="form-select" id="task-recurrence">' +
              '<option value="">' + i18n.t('rec_none') + '</option>' +
              '<option value="daily"'   + (defRec==='daily'   ?' selected':'') + '>' + i18n.t('rec_daily')   + '</option>' +
              '<option value="weekly"'  + (defRec==='weekly'  ?' selected':'') + '>' + i18n.t('rec_weekly')  + '</option>' +
              '<option value="monthly"' + (defRec==='monthly' ?' selected':'') + '>' + i18n.t('rec_monthly') + '</option>' +
              '<option value="yearly"'  + (defRec==='yearly'  ?' selected':'') + '>' + i18n.t('rec_yearly')  + '</option>' +
            '</select>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label">' + i18n.t('project') + '</label>' +
            '<select class="form-select" id="task-project">' + projectOptions + '</select>' +
          '</div>' +

          (state.labels.length ? '<div class="form-group"><label class="form-label">' + i18n.t('labels') + '</label>' +
            '<div style="display:flex;flex-wrap:wrap;gap:8px">' + labelChecks + '</div></div>' : '') +

        '</div>' +
        '<div class="modal-footer">' +
          (isEdit ? '<button class="btn btn-danger" id="btn-delete-task">' + i18n.t('delete') + '</button>' : '') +
          '<button class="btn btn-ghost" id="btn-cancel-task">' + i18n.t('cancel') + '</button>' +
          '<button class="btn btn-primary" id="btn-save-task">' + i18n.t('save') + '</button>' +
        '</div>' +
      '</div>';

    overlay.classList.add('open');

    // Selección de prioridad
    var priorityBtns = overlay.querySelectorAll('.priority-btn');
    for (var i = 0; i < priorityBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          for (var j = 0; j < priorityBtns.length; j++) priorityBtns[j].classList.remove('active');
          btn.classList.add('active');
        });
      })(priorityBtns[i]);
    }

    $('modal-close').addEventListener('click',      closeModal);
    $('btn-cancel-task').addEventListener('click',  closeModal);
    $('btn-save-task').addEventListener('click',    saveTask);
    if ($('btn-delete-task')) {
      $('btn-delete-task').addEventListener('click', function () {
        if (confirm(i18n.t('confirm_delete'))) {
          Api.tasks.remove(task.id).then(function () {
            closeModal();
            showToast(i18n.t('task_deleted'), 'success');
            refresh();
          });
        }
      });
    }

    // Cerrar con overlay click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    // Focus en título
    setTimeout(function () { var t = $('task-title'); if (t) t.focus(); }, 50);
  }

  function closeModal() {
    var overlay = $('modal-overlay');
    overlay.classList.remove('open');
    overlay.innerHTML = '';
    state.editTask = null;
  }

  function saveTask() {
    var title    = $('task-title').value.trim();
    var desc     = $('task-desc').value.trim();
    var dueDate  = $('task-due-date').value;
    var dueTime  = $('task-due-time').value;
    var rec      = $('task-recurrence').value;
    var projId   = $('task-project').value;

    // Prioridad activa
    var activeP = $('modal-overlay').querySelector('.priority-btn.active');
    var prio    = activeP ? parseInt(activeP.getAttribute('data-p'), 10) : 4;

    // Etiquetas seleccionadas
    var labelInputs = $('modal-overlay').querySelectorAll('input[name="labels"]:checked');
    var labelIds    = [];
    for (var i = 0; i < labelInputs.length; i++) {
      labelIds.push(parseInt(labelInputs[i].value, 10));
    }

    if (!title) { showToast(i18n.t('title_required'), 'error'); return; }

    var data = {
      title:       title,
      description: desc,
      priority:    prio,
      due_date:    dueDate || null,
      due_time:    dueTime || null,
      recurrence:  rec || null,
      project_id:  projId ? parseInt(projId, 10) : null,
      labels:      labelIds,
    };

    if (state.editTask) {
      data.id = state.editTask.id;
      Api.tasks.update(data).then(function () {
        closeModal();
        showToast(i18n.t('task_updated'), 'success');
        refresh();
      }).catch(function (e) { showToast(e.error || 'Error', 'error'); });
    } else {
      Api.tasks.create(data).then(function () {
        closeModal();
        showToast(i18n.t('task_created'), 'success');
        refresh();
      }).catch(function (e) { showToast(e.error || 'Error', 'error'); });
    }
  }

  /* ── Detalle/Comentarios de tarea ──────────────────────── */
  function openTaskDetail(taskId) {
    var task = state.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;

    Api.comments.list(taskId).then(function (res) {
      var comments = res.ok ? res.data : [];
      // Re-usar el modal con vista detallada
      var overlay = $('modal-overlay');

      var commentsHtml = comments.map(function (c) {
        return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">' +
          '<div style="color:var(--text-secondary)">' + escHtml(c.content) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">' + c.created_at + '</div>' +
        '</div>';
      }).join('');

      overlay.innerHTML =
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<span class="modal-title">' + escHtml(task.title) + '</span>' +
            '<button class="modal-close" id="modal-close">×</button>' +
          '</div>' +
          '<div class="modal-body">' +
            (task.description ? '<p style="color:var(--text-secondary);margin-bottom:16px;font-size:13px">' + escHtml(task.description) + '</p>' : '') +
            '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">' +
              (task.due_date ? '📅 ' + fmtDate(task.due_date) + ' ' : '') +
              priorityLabel(task.priority) +
            '</div>' +
            '<h4 style="margin-bottom:8px;font-size:13px;color:var(--text-secondary)">' + i18n.t('comments') + '</h4>' +
            (commentsHtml || '<p style="color:var(--text-muted);font-size:13px">' + i18n.t('no_comments') + '</p>') +
            '<div style="margin-top:12px;display:flex;gap:8px">' +
              '<input class="form-input" id="new-comment" placeholder="' + i18n.t('add_comment') + '" style="flex:1">' +
              '<button class="btn btn-primary" id="btn-post-comment">' + i18n.t('post') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-ghost" id="btn-edit-from-detail">' + i18n.t('edit') + '</button>' +
            '<button class="btn btn-ghost" id="modal-close2">' + i18n.t('close') + '</button>' +
          '</div>' +
        '</div>';

      overlay.classList.add('open');

      $('modal-close').addEventListener('click', closeModal);
      $('modal-close2').addEventListener('click', closeModal);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

      $('btn-edit-from-detail').addEventListener('click', function () {
        closeModal();
        openTaskModal(task);
      });

      $('btn-post-comment').addEventListener('click', function () {
        var content = $('new-comment').value.trim();
        if (!content) return;
        Api.comments.create(taskId, content).then(function () {
          $('new-comment').value = '';
          openTaskDetail(taskId); // Recargar detalle
        });
      });
    });
  }

  /* ── Eventos en task items ─────────────────────────────── */
  function attachTaskEvents() {
    // Checkbox
    var checks = document.querySelectorAll('.task-check');
    for (var i = 0; i < checks.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          var id   = parseInt(el.getAttribute('data-id'), 10);
          var done = el.getAttribute('data-done') === '1' ? 0 : 1;
          Api.tasks.complete(id, done).then(function () {
            showToast(done ? i18n.t('task_done') : i18n.t('task_undone'), 'success');
            refresh();
          });
        });
      })(checks[i]);
    }

    // Click en tarea = abrir detalle
    var items = document.querySelectorAll('.task-item');
    for (var j = 0; j < items.length; j++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.classList.contains('task-check') ||
              e.target.classList.contains('task-drag-handle')) return;
          var id = parseInt(el.getAttribute('data-id'), 10);
          openTaskDetail(id);
        });

        // DnD
        var id = parseInt(el.getAttribute('data-id'), 10);
        DragDrop.attach(el, id);
      })(items[j]);
    }

    // Board: click en "agregar tarea"
    var addBtns = document.querySelectorAll('.board-column-add');
    for (var k = 0; k < addBtns.length; k++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var secId = btn.getAttribute('data-section') || null;
          openTaskModal(null, { section_id: secId });
        });
      })(addBtns[k]);
    }
  }

  /* ── Navegación ────────────────────────────────────────── */
  function setView(view) {
    state.view      = view;
    state.projectId = null;
    state.labelId   = null;
    refresh();
  }

  function setProject(id) {
    state.projectId = id;
    state.labelId   = null;
    state.view      = 'all';
    refresh();
  }

  function setLabel(id) {
    state.labelId   = id;
    state.projectId = null;
    state.view      = 'all';
    refresh();
  }

  /* ── Búsqueda ───────────────────────────────────────────── */
  var _searchTimer = null;
  function initSearch() {
    var input = $('search-input');
    if (!input) return;
    input.addEventListener('input', function () {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function () {
        state.search = input.value.trim();
        if (state.search) {
          state.view = 'all';
          state.projectId = null;
          state.labelId   = null;
        }
        refresh();
      }, 280);
    });
  }

  /* ── Tema ───────────────────────────────────────────────── */
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ts_theme', theme);
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  /* ── Refresh completo ───────────────────────────────────── */
  function refresh() {
    loadTasks();
    loadProjects().then(function () {
      loadLabels().then(renderSidebar);
    });
  }

  /* ── Alertas de fechas límite ──────────────────────────────── */
  var _alerted = {};

  function _todayStr() {
    var d  = new Date();
    var mm = d.getMonth() + 1;
    var dd = d.getDate();
    return d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;
  }

  function initDeadlineChecker() {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    var todayKey = 'ts_alerted_' + _todayStr();
    try {
      _alerted = JSON.parse(localStorage.getItem(todayKey) || '{}');
    } catch (e) {
      _alerted = {};
    }

    // Limpiar alertas de días anteriores para no saturar localStorage
    for (var k in localStorage) {
      if (String(k).indexOf('ts_alerted_') === 0 && k !== todayKey) {
        try { localStorage.removeItem(k); } catch (e2) {}
      }
    }

    checkDeadlines();
    setInterval(checkDeadlines, 60000); // revisar cada 60 segundos
  }

  function checkDeadlines() {
    var now      = new Date();
    var todayStr = _todayStr();
    var todayKey = 'ts_alerted_' + todayStr;

    for (var i = 0; i < state.tasks.length; i++) {
      var t = state.tasks[i];
      if (+t.completed === 1 || !t.due_date) { continue; }
      if (t.due_date > todayStr)             { continue; }

      var key = String(t.id);
      if (_alerted[key]) { continue; }

      var dueMs;
      if (t.due_time) {
        dueMs = new Date(t.due_date + 'T' + t.due_time).getTime();
      } else {
        dueMs = new Date(t.due_date + 'T00:00:00').getTime();
      }

      if (now.getTime() >= dueMs) {
        _alerted[key] = true;
        try { localStorage.setItem(todayKey, JSON.stringify(_alerted)); } catch (e) {}
        fireDeadlineAlert(t);
      }
    }
  }

  function fireDeadlineAlert(task) {
    var timeInfo = task.due_time ? ' — ' + task.due_time : ' — Hoy';
    showToast('⏰ Vence: ' + task.title + timeInfo, 'warning');

    if (window.Notification && Notification.permission === 'granted') {
      try {
        new Notification('⏰ Todos Synyster — Fecha límite', {
          body: task.title + timeInfo,
          tag:  'deadline-' + task.id,
        });
      } catch (e) {}
    }
  }

  /* ── Escape Html ────────────────────────────────────────── */
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Inicialización ─────────────────────────────────────── */
  function init() {
    applyTheme(state.theme);

    // Cargar idioma y luego arrancar
    i18n.load(i18n.detect(), function () {
      _buildStaticUI();
      _bindNavEvents();
      _bindHeaderEvents();
      initSearch();

      DragDrop.init(function (draggedId, beforeId) {
        // Guardar nuevo orden en la API (optimista, sin esperar respuesta)
        Api.tasks.update({ id: draggedId, sort_order: beforeId });
      });

      Shortcuts.init({
        'Q': function () { openTaskModal(null); },
        'N': function () { openTaskModal(null); },
        'Escape': function () { closeModal(); },
        '/': function () { var s = $('search-input'); if (s) s.focus(); },
        'T': function () { setView('today'); },
        'I': function () { setView('inbox'); },
        'U': function () { setView('upcoming'); },
        '1': function () { state.view = 'all'; refresh(); },
      });

      refresh();
      initDeadlineChecker();
    });
  }

  /** Construye la UI estática (header + sidebar + main) */
  function _buildStaticUI() {
    document.body.innerHTML =
      '<div id="app">' +
        _buildHeader() +
        _buildSidebar() +
        '<main id="main"><div id="view-container"></div></main>' +
        '<div id="modal-overlay"></div>' +
        '<div id="toast-container"></div>' +
      '</div>';
  }

  function _buildHeader() {
    return '<header id="header">' +
      '<div class="logo">✅ Todos<span> Synyster</span></div>' +
      '<div id="search-bar">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<input id="search-input" type="text" placeholder="' + i18n.t('search') + '">' +
      '</div>' +
      '<div class="header-actions">' +
        '<select id="lang-select"><option value="es">ES</option><option value="en">EN</option><option value="fr">FR</option></select>' +
        '<button class="btn-icon" id="btn-theme" title="' + i18n.t('toggle_theme') + '">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
        '</button>' +
        '<button class="btn btn-primary" id="btn-quick-add" style="font-size:13px">+ ' + i18n.t('add_task') + '</button>' +
      '</div>' +
    '</header>';
  }

  function _buildSidebar() {
    return '<nav id="sidebar">' +
      '<div class="sidebar-section">' +
        _navItem('inbox',    '📥', i18n.t('nav_inbox')) +
        _navItem('today',    '🌤', i18n.t('nav_today')) +
        _navItem('upcoming', '📅', i18n.t('nav_upcoming')) +
        _navItem('calendar', '🗓', i18n.t('nav_calendar')) +
        _navItem('completed','✅', i18n.t('nav_completed')) +
        _navItem('stats',    '📊', i18n.t('nav_stats')) +
      '</div>' +
      '<div class="sidebar-section">' +
        '<div class="sidebar-section-title">' + i18n.t('projects') + '</div>' +
        '<div id="sidebar-projects"></div>' +
        '<button class="sidebar-add-btn" id="btn-add-project">+ ' + i18n.t('add_project') + '</button>' +
      '</div>' +
      '<div class="sidebar-section">' +
        '<div class="sidebar-section-title">' + i18n.t('labels') + '</div>' +
        '<div id="sidebar-labels"></div>' +
        '<button class="sidebar-add-btn" id="btn-add-label">+ ' + i18n.t('add_label') + '</button>' +
      '</div>' +
      '<a href="https://www.paypal.com/donate/?hosted_button_id=ZABFRXC2P3JQN" target="_blank" rel="noopener" class="beer-btn">🍺 ' + i18n.t('buy_beer') + '</a>' +
    '</nav>';
  }

  function _navItem(view, icon, label) {
    return '<div class="nav-item" data-view="' + view + '">' + icon + ' <span>' + label + '</span></div>';
  }

  function _bindNavEvents() {
    // Vistas de navegación
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-view]');
      if (nav) { setView(nav.getAttribute('data-view')); }
    });
  }

  function _bindHeaderEvents() {
    document.addEventListener('click', function (e) {
      // Theme toggle
      if (e.target.closest('#btn-theme')) { toggleTheme(); }

      // Quick add
      if (e.target.closest('#btn-quick-add')) { openTaskModal(null); }

      // Agregar proyecto
      if (e.target.closest('#btn-add-project')) {
        var name = prompt(i18n.t('project_name'));
        if (!name) return;
        var color = prompt(i18n.t('project_color'), '#ff6b6b');
        var icon  = prompt(i18n.t('project_icon'), '📋');
        Api.projects.create({ name: name, color: color || '#ff6b6b', icon: icon || '📋' })
          .then(function () { loadProjects(); });
      }

      // Agregar etiqueta
      if (e.target.closest('#btn-add-label')) {
        var lname = prompt(i18n.t('label_name'));
        if (!lname) return;
        Api.labels.create({ name: lname }).then(function () { loadLabels().then(renderSidebar); });
      }
    });

    // Selector de idioma
    document.addEventListener('change', function (e) {
      if (e.target.id === 'lang-select') {
        i18n.change(e.target.value, function () {
          // Reconstruir toda la UI con el nuevo idioma
          init();
        });
      }
    });

    // Seleccionar idioma actual
    document.addEventListener('DOMContentLoaded', function () {});
    setTimeout(function () {
      var ls = $('lang-select');
      if (ls) ls.value = i18n.getLang();
    }, 100);
  }

  return { init: init };
}());

// Arrancar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { App.init(); });
} else {
  App.init();
}
