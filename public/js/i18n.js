'use strict';
window.i18n = (function () {
  let lang = 'nl';
  const cache = {};

  async function loadLang(l) {
    if (!cache[l]) {
      const res = await fetch('js/i18n/' + l + '.json');
      cache[l] = await res.json();
    }
  }

  async function init() {
    const stored = localStorage.getItem('lang');
    lang = stored || 'nl';
    await loadLang('nl');
    if (lang !== 'nl') await loadLang(lang);
    applyToDOM();
  }

  function t(key) {
    return (cache[lang] && cache[lang][key]) || (cache['nl'] && cache['nl'][key]) || key;
  }

  async function setLang(l) {
    await loadLang(l);
    lang = l;
    localStorage.setItem('lang', l);
    applyToDOM();
  }

  function toggleLang() {
    setLang(lang === 'nl' ? 'en' : 'nl');
  }

  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    window.dispatchEvent(new CustomEvent('langchange'));
  }

  function getLang() { return lang; }

  return { init: init, t: t, setLang: setLang, toggleLang: toggleLang, applyToDOM: applyToDOM, getLang: getLang };
})();
