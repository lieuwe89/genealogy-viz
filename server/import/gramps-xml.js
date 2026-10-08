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

const MODIFIER = { about: 'ABT', estimated: 'EST', before: 'BEF', after: 'AFT' };

// Gramps date -> { text (GEDCOM-like, for formatGedDate), year, yearEnd }
function eventDate(ev) {
  const val = ev.dateval?.[0], range = ev.daterange?.[0] || ev.datespan?.[0];
  if (range) {
    const start = getAttr(range, 'start'), stop = getAttr(range, 'stop');
    const text = ev.daterange ? `BET ${start} AND ${stop}` : `FROM ${start} TO ${stop}`;
    return { text, year: extractYear(start), yearEnd: extractYear(stop) };
  }
  if (val) {
    const v = getAttr(val, 'val'), type = getAttr(val, 'type'), quality = getAttr(val, 'quality');
    const mod = MODIFIER[type] || MODIFIER[quality];
    return { text: mod ? `${mod} ${v}` : v, year: extractYear(v), yearEnd: type === 'from' ? null : extractYear(v) };
  }
  const str = getText(ev.datestr) || getAttr(ev.datestr?.[0], 'val');
  return { text: str, year: extractYear(str), yearEnd: extractYear(str) };
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
    const surnames = nameNode.surname || [];
    const surname = surnames.map(s => getText(s)).filter(Boolean).join(' ');
    const namePrefix = getAttr(surnames[0], 'prefix');

    const eventRefs = (p.eventref || []).map(e => ({ hlink: getAttr(e, 'hlink'), role: getAttr(e, 'role') || 'Primary' }));
    // Per type the first dated Primary event; baptism/burial stand in for a missing birth/death.
    const vital = {};
    const roles = [];
    for (const ref of eventRefs) {
      const ev = events[ref.hlink];
      if (!ev || ref.role !== 'Primary') continue;
      const type = getText(ev.type);
      const date = eventDate(ev);
      if (type === 'Occupation') {
        const label = getText(ev.description);
        if (label) roles.push({ label, kind: 'role', yearFrom: date.year, yearTo: date.yearEnd });
        continue;
      }
      if (!['Birth', 'Baptism', 'Death', 'Burial'].includes(type) || vital[type]?.date.text) continue;
      const placeHandle = getAttr(ev.place?.[0], 'hlink');
      vital[type] = { date, place: placeHandle && places[placeHandle] ? getText(places[placeHandle].ptitle) || getText(places[placeHandle].pname?.[0]?.$?.value) : '' };
    }
    const pick = (main, alt, mark) => {
      if (vital[main]?.date.text) return { ...vital[main], text: vital[main].date.text };
      if (vital[alt]?.date.text) return { ...vital[alt], text: `${mark} ${vital[alt].date.text}` };
      return { date: { year: null }, text: '', place: '' };
    };
    const birth = pick('Birth', 'Baptism', '≈');   // ≈ = gedoopt
    const death = pick('Death', 'Burial', '□');    // □ = begraven

    // Role attributes hold the category (e.g. 'WIC-bewindhebber'); 'Rol (oud)' is the old free text.
    for (const a of (p.attribute || [])) {
      const value = getAttr(a, 'value');
      if (getAttr(a, 'type') === 'Role' && value) roles.push({ label: value, kind: 'category' });
    }

    const sex = getText(p.gender) === 'M' ? 'M' : getText(p.gender) === 'F' ? 'F' : 'U';

    return {
      id: p.$.id,
      _handle: p.$.handle,
      givenName,
      surname,
      namePrefix,
      nameSuffix: '',
      sex,
      birthYear: birth.date.year,
      birthDate: birth.text,
      birthPlace: birth.place,
      deathYear: death.date.year,
      deathDate: death.text,
      deathPlace: death.place,
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

  // Gramps associations (personref): para-family ties such as a servant in a household.
  // The person holding the ref is person A; rel describes A's tie to B.
  for (const p of (db.people?.[0]?.person || [])) {
    for (const ref of (p.personref || [])) {
      const otherId = handleToId[getAttr(ref, 'hlink')];
      if (otherId) relationships.push({ personAId: p.$.id, personBId: otherId, type: 'association', label: getAttr(ref, 'rel') || '' });
    }
  }

  return { persons, relationships, sources: [] };
}

module.exports = { parseGrampsXml };
