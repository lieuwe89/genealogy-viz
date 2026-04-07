'use strict';
const xml2js = require('xml2js');

function getText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return getText(val[0]);
  if (val._) return val._;
  return '';
}

function getAttr(val, attr) {
  if (!val) return '';
  if (Array.isArray(val)) return getAttr(val[0], attr);
  if (val.$ && val.$[attr]) return val.$[attr];
  return '';
}

function extractYear(str) {
  if (!str) return null;
  const m = str.match(/\b(\d{4})\b/);
  return m ? parseInt(m[1]) : null;
}

async function parseGrampsXml(text) {
  const parsed = await xml2js.parseStringPromise(text, { explicitArray: true });
  const db = parsed.database;

  const events = {};
  for (const ev of (db.events?.[0]?.event || [])) {
    events[ev.$.handle] = ev;
  }
  const places = {};
  for (const pl of (db.places?.[0]?.placeobj || [])) {
    places[pl.$.handle] = pl;
  }

  const persons = (db.people?.[0]?.person || []).map(p => {
    const nameNode = (p.name || []).find(n => getAttr(n, 'type') === 'Birth Name') || p.name?.[0] || {};
    const givenName = getText(nameNode.first);
    const surname = getText(nameNode.surname);

    const eventRefs = (p.eventref || []).map(e => ({ hlink: getAttr(e, 'hlink'), role: getAttr(e, 'role') }));
    let birthYear = null, birthDate = '', birthPlace = '';
    let deathYear = null, deathDate = '', deathPlace = '';

    for (const ref of eventRefs) {
      const ev = events[ref.hlink];
      if (!ev) continue;
      const type = getText(ev.type);
      const dateVal = getAttr(ev.dateval?.[0], 'val') || getText(ev.dateval);
      const placeHandle = getAttr(ev.place?.[0], 'hlink');
      const placeName = placeHandle && places[placeHandle] ? getText(places[placeHandle].ptitle) : '';
      if (type === 'Birth' && ref.role === 'Primary') {
        birthDate = dateVal;
        birthYear = extractYear(dateVal);
        birthPlace = placeName;
      }
      if (type === 'Death' && ref.role === 'Primary') {
        deathDate = dateVal;
        deathYear = extractYear(dateVal);
        deathPlace = placeName;
      }
    }

    const roles = (p.attribute || [])
      .filter(a => getAttr(a, 'type') === 'Role')
      .map(a => getAttr(a, 'value'));

    const sex = getText(p.gender) === 'M' ? 'M' : getText(p.gender) === 'F' ? 'F' : 'U';

    return {
      id: p.$.id,
      _handle: p.$.handle,
      givenName,
      surname,
      namePrefix: '',
      nameSuffix: '',
      sex,
      birthYear,
      birthDate,
      birthPlace,
      deathYear,
      deathDate,
      deathPlace,
      notes: (p.note || []).map(n => getText(n)).join('\n'),
      roles,
      sourceIds: [],
    };
  });

  const handleToId = {};
  for (const p of persons) handleToId[p._handle] = p.id;

  const relationships = [];
  for (const fam of (db.families?.[0]?.family || [])) {
    const fatherHandle = getAttr(fam.father?.[0], 'hlink');
    const motherHandle = getAttr(fam.mother?.[0], 'hlink');
    const childHandles = (fam.childref || []).map(c => getAttr(c, 'hlink'));
    const fatherId = handleToId[fatherHandle];
    const motherId = handleToId[motherHandle];
    if (fatherId && motherId) relationships.push({ personAId: fatherId, personBId: motherId, type: 'spouse' });
    for (const ch of childHandles) {
      const childId = handleToId[ch];
      if (!childId) continue;
      if (fatherId) relationships.push({ personAId: fatherId, personBId: childId, type: 'parent-child' });
      if (motherId) relationships.push({ personAId: motherId, personBId: childId, type: 'parent-child' });
    }
  }

  return { persons, relationships, sources: [] };
}

module.exports = { parseGrampsXml };
