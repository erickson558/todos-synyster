/**
 * shortcuts.js — Atajos de teclado globales.
 * Todos los atajos se desactivan cuando el foco está en un input/textarea.
 */
var Shortcuts = (function () {

  var _handlers = {};

  function _isEditing() {
    var tag = document.activeElement && document.activeElement.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select'
        || (document.activeElement && document.activeElement.contentEditable === 'true');
  }

  function init(handlers) {
    _handlers = handlers;

    document.addEventListener('keydown', function (e) {
      // Esc siempre se maneja aunque haya foco en input
      if (e.key === 'Escape') {
        if (_handlers['Escape']) _handlers['Escape'](e);
        return;
      }
      if (_isEditing()) return;

      var key = e.key.toUpperCase();
      if (_handlers[key]) {
        e.preventDefault();
        _handlers[key](e);
      }
    });
  }

  return { init: init };
}());
