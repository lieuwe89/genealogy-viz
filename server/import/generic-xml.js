'use strict';
const xml2js = require('xml2js');

function resolveField(node, spec) {
  if (!spec) return '';
  if (spec.startsWith('@')) {
    return (node.$ && node.$[spec.slice(1)]) || '';
  }
  if (spec.includes('/@')) {
    const [childTag, attr] = spec.split('/@');
    const child = node[childTag]?.[0];
    return (child && child.$ && child.$[attr]) || '';
  }
  const child = node[spec]?.[0];
  if (!child) return '';
  if (typeof child === 'string') return child;
  if (child._) return child._;
  return '';
}

function extractYear(val) {
  if (!val) return null;
  const m = String(val).match(/\b(\d{4})\b/);
  return m ? parseInt(m[1]) : null;
}

async function parseGenericXml(text, mapping) {
  const parsed = await xml2js.parseStringPromise(text, { explicitArray: true });
  const root = Object.values(parsed)[0];
  const elements = root[mapping.personElement] || [];

  const persons = elements.map((el, i) => {
    const id = resolveField(el, mapping.id) || String(i);
    const birthYearRaw = resolveField(el, mapping.birthYear);
    const deathYearRaw = resolveField(el, mapping.deathYear);
    const roles = mapping.roleElement
      ? (el[mapping.roleElement] || []).map(r => (typeof r === 'string' ? r : r._ || ''))
      : [];

    return {
      id,
      givenName: resolveField(el, mapping.givenName),
      surname: resolveField(el, mapping.surname),
      namePrefix: '',
      nameSuffix: '',
      sex: resolveField(el, mapping.sex) || 'U',
      birthYear: extractYear(birthYearRaw),
      birthDate: birthYearRaw,
      birthPlace: resolveField(el, mapping.birthPlace),
      deathYear: extractYear(deathYearRaw),
      deathDate: deathYearRaw,
      deathPlace: resolveField(el, mapping.deathPlace),
      notes: resolveField(el, mapping.notes),
      roles,
      sourceIds: [],
    };
  });

  return { persons, relationships: [], sources: [] };
}

module.exports = { parseGenericXml };
