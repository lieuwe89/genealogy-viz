'use strict';

const SEX_COLORS = { M: '#60a5fa', F: '#f472b6', U: '#9ca3af' };
const ROLE_COLORS = { withRole: '#e3b341', noRole: '#4b5563' };

function buildSurnamePalette(nodes) {
  const surnames = [...new Set(nodes.map(n => n.surname).filter(Boolean))];
  const palette = {};
  surnames.forEach((s, i) => {
    const hue = Math.round((i / surnames.length) * 360);
    palette[s] = `hsl(${hue}, 65%, 58%)`;
  });
  palette[''] = '#6e7681';
  return palette;
}

function getNodeColor(node, mode, surnamePalette) {
  if (mode === 'role') {
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

window.ColorModes = { buildSurnamePalette, getNodeColor };
