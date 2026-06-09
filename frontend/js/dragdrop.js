/**
 * dragdrop.js — Drag & drop para reordenar tareas.
 * Compatible con la API HTML5 nativa (no deps).
 *
 * Por qué HTML5 DnD y no pointer events:
 * EasyPHP se usa en entorno Windows/Chrome donde DnD nativo funciona bien
 * y no requiere polyfills adicionales.
 */
var DragDrop = (function () {

  var _dragging    = null;   // elemento DOM que se arrastra
  var _draggingId  = null;   // id de la tarea
  var _onReorder   = null;   // callback(draggedId, beforeId) llamado al soltar

  function init(onReorder) {
    _onReorder = onReorder;
  }

  /** Adjunta los eventos DnD a un .task-item nuevo */
  function attach(el, taskId) {
    el.setAttribute('draggable', 'true');

    el.addEventListener('dragstart', function (e) {
      _dragging   = el;
      _draggingId = taskId;
      el.classList.add('dragging');
      // Imagen de arrastre: semitransparente
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(taskId));
    });

    el.addEventListener('dragend', function () {
      el.classList.remove('dragging');
      // Limpiar indicadores visuales en todos los items
      var items = document.querySelectorAll('.task-item.drag-over');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('drag-over');
      }
      _dragging   = null;
      _draggingId = null;
    });

    el.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (el !== _dragging) {
        el.classList.add('drag-over');
      }
    });

    el.addEventListener('dragleave', function () {
      el.classList.remove('drag-over');
    });

    el.addEventListener('drop', function (e) {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (!_dragging || _dragging === el) return;

      // Reordenar DOM inmediatamente (optimistic update)
      var parent = el.parentNode;
      parent.insertBefore(_dragging, el);

      // Notificar al controlador para persistir en la API
      if (typeof _onReorder === 'function') {
        _onReorder(_draggingId, taskId);
      }
    });
  }

  return { init: init, attach: attach };
}());
