'use strict';

function parseLines(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    .map(line => {
      const m = line.match(/^(\d+)\s+(@[^@]+@|\S+)(?:\s+(.*))?$/);
      if (!m) return null;
      const level = parseInt(m[1]);
      const second = m[2];
      const rest = (m[3] || '').trim();
      if (level === 0 && second.startsWith('@')) {
        return { level, xref: second, tag: rest, value: '' };
      }
      return { level, xref: null, tag: second, value: rest };
    })
    .filter(Boolean);
}

function buildTree(lines) {
  const records = [];
  let cur = null;
  const stack = [];
  for (const line of lines) {
    if (line.level === 0) {
      if (cur) records.push(cur);
      cur = { xref: line.xref, tag: line.tag, value: line.value, children: [] };
      stack.length = 0;
      stack[0] = cur;
    } else {
      const node = { tag: line.tag, value: line.value, children: [] };
      const parent = stack[line.level - 1];
      if (parent) parent.children.push(node);
      stack[line.level] = node;
    }
  }
  if (cur) records.push(cur);
  return records;
}

function child(node, tag) {
  const n = node.children.find(c => c.tag === tag);
  return n ? n.value : '';
}

function children(node, tag) {
  return node.children.filter(c => c.tag === tag);
}

function extractYear(str) {
  if (!str) return null;
  const m = str.match(/\b(\d{4})\b/);
  return m ? parseInt(m[1]) : null;
}

function parseGedcom(text) {
  const lines = parseLines(text);
  const records = buildTree(lines);

  const persons = records.filter(r => r.tag === 'INDI').map(r => {
    const nameNode = r.children.find(c => c.tag === 'NAME');
    const birtNode = r.children.find(c => c.tag === 'BIRT');
    const deatNode = r.children.find(c => c.tag === 'DEAT');

    const birthDate = birtNode ? child(birtNode, 'DATE') : '';
    const deathDate = deatNode ? child(deatNode, 'DATE') : '';

    const roles = children(r, 'FACT')
      .filter(f => child(f, 'TYPE') === 'Role')
      .map(f => f.value);

    return {
      id: r.xref,
      givenName: nameNode ? child(nameNode, 'GIVN') : '',
      surname: nameNode ? child(nameNode, 'SURN') : '',
      namePrefix: nameNode ? child(nameNode, 'SPFX') : '',
      nameSuffix: nameNode ? child(nameNode, 'NSFX') : '',
      sex: child(r, 'SEX') || 'U',
      birthYear: extractYear(birthDate),
      birthDate,
      birthPlace: birtNode ? child(birtNode, 'PLAC') : '',
      deathYear: extractYear(deathDate),
      deathDate,
      deathPlace: deatNode ? child(deatNode, 'PLAC') : '',
      notes: children(r, 'NOTE').map(n => n.value).join('\n'),
      roles,
      famcRefs: children(r, 'FAMC').map(f => f.value),
      famsRefs: children(r, 'FAMS').map(f => f.value),
      sourceIds: children(r, 'SOUR').map(s => s.value),
    };
  });

  const relationships = [];
  records.filter(r => r.tag === 'FAM').forEach(fam => {
    const husb = child(fam, 'HUSB');
    const wife = child(fam, 'WIFE');
    const chil = children(fam, 'CHIL').map(c => c.value);
    if (husb && wife) relationships.push({ personAId: husb, personBId: wife, type: 'spouse' });
    for (const c of chil) {
      if (husb) relationships.push({ personAId: husb, personBId: c, type: 'parent-child' });
      if (wife) relationships.push({ personAId: wife, personBId: c, type: 'parent-child' });
    }
  });

  const sources = records.filter(r => r.tag === 'SOUR').map(r => ({
    id: r.xref,
    title: child(r, 'TITL'),
    citation: [child(r, 'AUTH'), child(r, 'PUBL')].filter(Boolean).join('. '),
  }));

  return { persons, relationships, sources };
}

module.exports = { parseGedcom };
