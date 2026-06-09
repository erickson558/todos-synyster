/**
 * i18n.js — Sistema de internacionalización.
 * Carga locales/xx.json y expone i18n.t('key') para traducir.
 * Idioma por orden de prioridad: localStorage → navigator.language → 'es'
 */
var i18n = (function () {

  var _strings  = {};
  var _lang     = 'es';
  var _supported = ['es', 'en', 'fr'];

  /** Retorna la cadena traducida para key, con soporte de interpolación {{var}} */
  function t(key, vars) {
    var str = _strings[key] !== undefined ? _strings[key] : key;
    if (vars) {
      for (var k in vars) {
        str = str.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), vars[k]);
      }
    }
    return str;
  }

  /** Carga el archivo de locale y llama al callback cuando termine */
  function load(lang, callback) {
    var safeLang = _supported.indexOf(lang) !== -1 ? lang : 'es';
    _lang = safeLang;

    // XHR sincrónico no es ideal, pero evita el chicken-and-egg de await/async
    // en entornos PHP sin bundler
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/monitoreos/todossynyster/locales/' + safeLang + '.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          _strings = JSON.parse(xhr.responseText);
        } catch (e) {
          console.error('i18n: JSON parse error for', safeLang, e);
          _strings = {};
        }
      }
      if (typeof callback === 'function') callback(safeLang);
    };
    xhr.send();
  }

  /** Detecta idioma inicial */
  function detect() {
    var stored = localStorage.getItem('ts_lang');
    if (stored && _supported.indexOf(stored) !== -1) return stored;

    var nav = (navigator.language || navigator.userLanguage || 'es').slice(0, 2);
    return _supported.indexOf(nav) !== -1 ? nav : 'es';
  }

  /** Cambia el idioma y recarga la app */
  function change(lang, callback) {
    localStorage.setItem('ts_lang', lang);
    load(lang, callback);
  }

  return { t: t, load: load, detect: detect, change: change, getLang: function () { return _lang; } };
}());
