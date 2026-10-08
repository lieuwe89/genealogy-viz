'use strict';

const SEX_COLORS = { M: '#60a5fa', F: '#f472b6', U: '#9ca3af' };
const ROLE_COLORS = { withRole: '#e3b341', noRole: '#4b5563' };

// Role categories (Gramps 'Role' attribute) folded into six groups, in fixed categorical order.
// Palette validated (dataviz validate_palette.js) against #0d1117 (dark) and #f6f8fa/#fff (light).
const ROLE_GROUPS = [
  { key: 'bestuur', dark: '#3987e5', light: '#2a78d6',
    cats: ['WIC-bewindhebber', 'VOC-bewindhebber', 'Koloniaal bestuurder'] },
  { key: 'slavenhandel', dark: '#d95926', light: '#eb6834',
    cats: ['Slavenhandelaar/reder', 'Kapitein slavenschip', 'Plantage-eigenaar'] },
  { key: 'aandeelhouder', dark: '#199e70', light: '#1baf7a',
    cats: ['WIC-hoofdparticipant', 'WIC-participant', 'VOC-participant'] },
  { key: 'dienst', dark: '#c98500', light: '#eda100',
    cats: ['WIC-dienaar', 'VOC-dienaar', 'Koloniaal militair', 'Overig koloniaal'] },
  { key: 'tot_slaaf_gemaakt', dark: '#d55181', light: '#e87ba4', cats: ['Tot slaaf gemaakt', 'Vrijgemaakt'] },
  { key: 'abolitionist', dark: '#008300', light: '#008300', cats: ['Abolitionist'] },
];
// When a person has several categories the most direct involvement in slavery wins.
const GROUP_PRIORITY = ['tot_slaaf_gemaakt', 'slavenhandel', 'bestuur', 'dienst', 'aandeelhouder', 'abolitionist'];

function roleGroup(node) {
  const keys = new Set((node.categories || []).map(c => (ROLE_GROUPS.find(g => g.cats.includes(c)) || {}).key));
  return ROLE_GROUPS.find(g => g.key === GROUP_PRIORITY.find(k => keys.has(k))) || null;
}

function isLight() {
  return document.documentElement.classList.contains('light');
}

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
    const g = roleGroup(node);
    if (g) return isLight() ? g.light : g.dark;
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

window.ColorModes = { buildSurnamePalette, getNodeColor, roleGroup, ROLE_GROUPS, ROLE_COLORS, isLight };
