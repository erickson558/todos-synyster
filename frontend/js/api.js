/**
 * api.js — Cliente HTTP para los endpoints PHP.
 * Wrapper de XMLHttpRequest compatible con IE11 y EasyPHP.
 * Todas las funciones retornan Promises (polyfill incluido en index.php).
 */
var Api = (function () {

  var BASE = '/monitoreos/todossynyster/api/';

  /** Petición genérica. Retorna Promise con el objeto JSON parseado. */
  function request(method, endpoint, data) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, BASE + endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        try {
          var res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res);
          } else {
            reject(res);
          }
        } catch (e) {
          reject({ ok: false, error: 'Parse error: ' + xhr.responseText });
        }
      };
      xhr.onerror = function () { reject({ ok: false, error: 'Network error' }); };
      xhr.send(data ? JSON.stringify(data) : null);
    });
  }

  /** Construye query string desde un objeto */
  function qs(params) {
    var parts = [];
    for (var k in params) {
      if (params[k] !== null && params[k] !== undefined) {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    return parts.length ? '?' + parts.join('&') : '';
  }

  // ── Tareas ──────────────────────────────────────────────
  var tasks = {
    list: function (params) {
      return request('GET', 'tasks.php' + qs(params));
    },
    create: function (data) {
      return request('POST', 'tasks.php', data);
    },
    update: function (data) {
      return request('PUT', 'tasks.php', data);
    },
    remove: function (id) {
      return request('DELETE', 'tasks.php?id=' + id);
    },
    complete: function (id, done) {
      return request('PUT', 'tasks.php', { id: id, completed: done ? 1 : 0 });
    },
  };

  // ── Proyectos ────────────────────────────────────────────
  var projects = {
    list: function () {
      return request('GET', 'projects.php');
    },
    create: function (data) {
      return request('POST', 'projects.php', data);
    },
    update: function (data) {
      return request('PUT', 'projects.php', data);
    },
    remove: function (id) {
      return request('DELETE', 'projects.php?id=' + id);
    },
  };

  // ── Etiquetas ────────────────────────────────────────────
  var labels = {
    list: function () {
      return request('GET', 'labels.php');
    },
    create: function (data) {
      return request('POST', 'labels.php', data);
    },
    remove: function (id) {
      return request('DELETE', 'labels.php?id=' + id);
    },
  };

  // ── Secciones ────────────────────────────────────────────
  var sections = {
    list: function (projectId) {
      return request('GET', 'sections.php?project_id=' + projectId);
    },
    create: function (data) {
      return request('POST', 'sections.php', data);
    },
    remove: function (id) {
      return request('DELETE', 'sections.php?id=' + id);
    },
  };

  // ── Comentarios ──────────────────────────────────────────
  var comments = {
    list: function (taskId) {
      return request('GET', 'comments.php?task_id=' + taskId);
    },
    create: function (taskId, content) {
      return request('POST', 'comments.php', { task_id: taskId, content: content });
    },
    remove: function (id) {
      return request('DELETE', 'comments.php?id=' + id);
    },
  };

  // ── Estadísticas ─────────────────────────────────────────
  var stats = {
    get: function () {
      return request('GET', 'stats.php');
    },
  };

  return { tasks: tasks, projects: projects, labels: labels, sections: sections, comments: comments, stats: stats };
}());
