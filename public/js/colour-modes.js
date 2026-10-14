'use strict';

const SEX_COLORS = { M: '#60a5fa', F: '#f472b6', U: '#9ca3af' };
const ROLE_COLORS = { withRole: '#e3b341', noRole: '#4b5563' };

// Evenly spread hues, one per distinct value, in the order given.
function buildPalette(values) {
  const palette = {};
  values.forEach((v, i) => { palette[v] = `hsl(${Math.round((i / values.length) * 360)}, 65%, 58%)`; });
  return palette;
}

function buildSurnamePalette(nodes) {
  const palette = buildPalette([...new Set(nodes.map(n => n.surname).filter(Boolean))]);
  palette[''] = '#6e7681';
  return palette;
}

const MAX_COLOURED = 8; // more hues than this are hard to tell apart; the rest share ROLE_COLORS.withRole

// A node's colour key: its first category (Gramps 'Role' attribute), else its first occupation,
// trimmed to the first item of a list ("Boer, koemelker" → "Boer") with a capital first letter.
function nodeCategory(node) {
  const c = (node.categories || [])[0] || ((node.roles || [])[0] || '').split(',')[0].trim();
  return c ? c[0].toUpperCase() + c.slice(1) : null;
}

// The most frequent keys in the data get their own hue, most frequent first.
function buildCategoryPalette(nodes) {
  const counts = new Map();
  nodes.map(nodeCategory).filter(Boolean).forEach(c => counts.set(c, (counts.get(c) || 0) + 1));
  return buildPalette([...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a)).slice(0, MAX_COLOURED));
}

function getNodeColor(node, mode, surnamePalette, categoryPalette) {
  if (mode === 'role') {
    const c = nodeCategory(node);
    if (c && categoryPalette[c]) return categoryPalette[c];
    return node.roles && node.roles.length > 0 ? ROLE_COLORS.withRole : ROLE_COLORS.noRole;
  }
  if (mode === 'surname') {
    return surnamePalette[node.surname] || surnamePalette[''];
  }
  if (mode === 'sex') {
    return SEX_COLORS[node.sex] || SEX_COLORS.U;
  }
  return ROLE_COLORS.noRole;
}

window.ColorModes = { buildSurnamePalette, buildCategoryPalette, getNodeColor, nodeCategory, ROLE_COLORS };
