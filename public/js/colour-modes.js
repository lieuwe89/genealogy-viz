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

// Role categories (Gramps 'Role' attribute) come from the data itself, most frequent first.
function buildCategoryPalette(nodes) {
  const counts = new Map();
  nodes.forEach(n => (n.categories || []).forEach(c => counts.set(c, (counts.get(c) || 0) + 1)));
  return buildPalette([...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a)));
}

// A person with several categories takes the first one.
function nodeCategory(node) {
  return (node.categories || [])[0] || null;
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
