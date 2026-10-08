const { parseGrampsXml } = require('../../server/import/gramps-xml');

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<database>
  <people>
    <person handle="h001" id="I0001">
      <gender>M</gender>
      <name type="Birth Name">
        <first>Wicher</first>
        <surname>Wichers</surname>
      </name>
      <eventref hlink="e001" role="Primary"/>
      <childof hlink="f001"/>
      <parentin hlink="f002"/>
      <attribute type="Role" value="Governor of Surinam"/>
    </person>
    <person handle="h002" id="I0002">
      <gender>F</gender>
      <name type="Birth Name">
        <first>Elizabeth</first>
        <surname>Trip</surname>
      </name>
      <eventref hlink="e002" role="Primary"/>
    </person>
  </people>
  <families>
    <family handle="f002" id="F0001">
      <father hlink="h001"/>
      <mother hlink="h002"/>
      <childref hlink="h003"/>
    </family>
  </families>
  <events>
    <event handle="e001" id="E0001">
      <type>Birth</type>
      <dateval val="1719"/>
      <place hlink="p001"/>
    </event>
    <event handle="e002" id="E0002">
      <type>Birth</type>
      <dateval val="1687"/>
    </event>
  </events>
  <places>
    <placeobj handle="p001" id="P0001">
      <ptitle>Groningen</ptitle>
    </placeobj>
  </places>
</database>`;

test('parses persons from GRAMPS XML', async () => {
  const raw = await parseGrampsXml(SAMPLE_XML);
  expect(raw.persons).toHaveLength(2);
  const p = raw.persons[0];
  expect(p.id).toBe('I0001');
  expect(p.givenName).toBe('Wicher');
  expect(p.surname).toBe('Wichers');
  expect(p.sex).toBe('M');
  expect(p.birthYear).toBe(1719);
  expect(p.roles).toContainEqual({ label: 'Governor of Surinam', kind: 'category' });
});

test('parses families into relationships', async () => {
  const raw = await parseGrampsXml(SAMPLE_XML);
  const spouse = raw.relationships.filter(r => r.type === 'spouse');
  expect(spouse.length).toBeGreaterThan(0);
});

const ENRICHED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<database>
  <people>
    <person handle="h010" id="I0010">
      <gender>M</gender>
      <name type="Birth Name"><first>Pieter Rembt</first><surname prefix="van">Iddekinge</surname></name>
      <eventref hlink="e010" role="Primary"/>
      <eventref hlink="e011" role="Primary"/>
      <eventref hlink="e012" role="Primary"/>
      <eventref hlink="e013" role="Primary"/>
      <attribute type="Role" value="WIC-bewindhebber"/>
      <attribute type="Rol (oud)" value="Governor WIC"/>
    </person>
  </people>
  <events>
    <event handle="e010" id="E0010"><type>Baptism</type><dateval val="1683-03-04"/></event>
    <event handle="e011" id="E0011"><type>Occupation</type><datespan start="1746" stop="1758"/><description>Bewindhebber WIC kamer Stad en Lande</description></event>
    <event handle="e012" id="E0012"><type>Occupation</type><dateval val="1717" type="from"/><description>Hoofdparticipant WIC</description></event>
    <event handle="e013" id="E0013"><type>Burial</type><dateval val="1758-05-01"/></event>
  </events>
</database>`;

test('reads Occupation events with years, Role categories, baptism/burial fallback and surname prefix', async () => {
  const [p] = (await parseGrampsXml(ENRICHED_XML)).persons;
  expect(p.namePrefix).toBe('van');
  expect(p.surname).toBe('Iddekinge');
  expect(p.birthYear).toBe(1683);
  expect(p.birthDate).toBe('≈ 1683-03-04');
  expect(p.deathDate).toBe('□ 1758-05-01');
  expect(p.roles).toContainEqual({ label: 'Bewindhebber WIC kamer Stad en Lande', kind: 'role', yearFrom: 1746, yearTo: 1758 });
  expect(p.roles).toContainEqual({ label: 'Hoofdparticipant WIC', kind: 'role', yearFrom: 1717, yearTo: null });
  expect(p.roles).toContainEqual({ label: 'WIC-bewindhebber', kind: 'category' });
  expect(p.roles.map(r => r.label)).not.toContain('Governor WIC');
});

test('reads Gramps associations (personref) as labelled association links, stored by runImport', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<database>
  <people>
    <person handle="h1" id="I0057"><gender>M</gender><name type="Birth Name"><first>Cornelis</first><surname>Star Lichtenvoort</surname></name></person>
    <person handle="h2" id="I1600"><gender>M</gender><name type="Birth Name"><first>Louis</first><surname>Alons</surname></name>
      <personref hlink="h1" rel="tot slaaf gemaakte bediende in het huishouden van"/>
    </person>
  </people>
</database>`;
  const { relationships } = await parseGrampsXml(xml);
  expect(relationships).toEqual([{ personAId: 'I1600', personBId: 'I0057', type: 'association', label: 'tot slaaf gemaakte bediende in het huishouden van' }]);

  const { initDb } = require('../../server/db');
  const { runImport } = require('../../server/import/index');
  const db = initDb(':memory:');
  await runImport(db, xml, 'gramps');
  expect(db.prepare('SELECT type, label FROM relationships').get()).toEqual({ type: 'association', label: 'tot slaaf gemaakte bediende in het huishouden van' });
});
