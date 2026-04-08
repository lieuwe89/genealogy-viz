'use strict';

const Theme = (() => {
  const STORAGE_KEY = 'genealogy-theme';
  const DARK_BG  = '#0d1117';
  const LIGHT_BG = '#f6f8fa';

  function isLight() {
    return document.documentElement.classList.contains('light');
  }

  function apply(light) {
    const root = document.documentElement;
    const btn  = document.getElementById('theme-toggle');
    if (light) {
      root.classList.add('light');
      if (btn) btn.textContent = '☀️';
    } else {
      root.classList.remove('light');
      if (btn) btn.textContent = '🌙';
    }
    // Update the 3D graph background if it's already initialised
    if (window.graph && typeof window.graph.backgroundColor === 'function') {
      window.graph.backgroundColor(light ? LIGHT_BG : DARK_BG);
    }
    localStorage.setItem(STORAGE_KEY, light ? 'light' : 'dark');
  }

  function toggle() {
    apply(!isLight());
  }

  // Restore saved preference on load (default: dark)
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light') apply(true);

  return { toggle, apply, isLight };
})();
