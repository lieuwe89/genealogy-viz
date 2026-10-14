const { parseGedcom } = require('../../server/import/gedcom');

const SAMPLE = `
0 HEAD
1 SOUR Gramps
0 @I0001@ INDI
1 NAME Wicher /Wichers/ jr.
2 GIVN Wicher
2 SURN Wichers
2 NSFX jr.
1 SEX M
1 BIRT
2 DATE 1719
2 PLAC Groningen
1 DEAT
2 DATE 1789
1 FACT Governor of Surinam (1784-1790)
2 TYPE Role
1 FAMC @F0001@
1 FAMS @F0002@
0 @I0002@ INDI
1 NAME Elizabeth /Trip/
2 GIVN Elizabeth
2 SURN Trip
1 SEX F
1 BIRT
2 DATE 1687
0 @F0001@ FAM
1 HUSB @I0003@
1 WIFE @I0004@
1 CHIL @I0001@
0 @S0001@ SOUR
1 TITL Some Archive
0 TRLR
`.trim();

test('parses persons', () => {
  const raw = parseGedcom(SAMPLE);
  expect(raw.persons).toHaveLength(2);
  const p = raw.persons[0];
  expect(p.id).toBe('@I0001@');
  expect(p.givenName).toBe('Wicher');
  expect(p.surname).toBe('Wichers');
  expect(p.nameSuffix).toBe('jr.');
  expect(p.sex).toBe('M');
  expect(p.birthYear).toBe(1719);
  expect(p.birthPlace).toBe('Groningen');
  expect(p.deathYear).toBe(1789);
  expect(p.roles).toEqual(['Governor of Surinam (1784-1790)']);
  expect(p.famsRefs).toContain('@F0002@');
});

test('parses families into relationships', () => {
  const raw = parseGedcom(SAMPLE);
  const parentChild = raw.relationships.filter(r => r.type === 'parent-child');
  const spouse = raw.relationships.filter(r => r.type === 'spouse');
  expect(parentChild.length).toBeGreaterThan(0);
  expect(spouse.length).toBeGreaterThan(0);
});

test('parses sources', () => {
  const raw = parseGedcom(SAMPLE);
  expect(raw.sources).toHaveLength(1);
  expect(raw.sources[0].id).toBe('@S0001@');
  expect(raw.sources[0].title).toBe('Some Archive');
});

test('falls back to the NAME value when GIVN/SURN are missing', () => {
  const raw = parseGedcom('0 @I1@ INDI\n1 NAME Geke Hannah (Hanneke) /Lestestuiver/\n0 @I2@ INDI\n1 NAME Anoniem //\n0 @I3@ INDI\n1 NAME Jan /de Vries/ jr.\n0 @I4@ INDI\n1 SEX M');
  expect(raw.persons.map(p => [p.givenName, p.surname, p.nameSuffix])).toEqual([
    ['Geke Hannah (Hanneke)', 'Lestestuiver', ''],
    ['Anoniem', '', ''],
    ['Jan', 'de Vries', 'jr.'],
    ['', '', ''],
  ]);
});
