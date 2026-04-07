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
  expect(p.roles).toContain('Governor of Surinam');
});

test('parses families into relationships', async () => {
  const raw = await parseGrampsXml(SAMPLE_XML);
  const spouse = raw.relationships.filter(r => r.type === 'spouse');
  expect(spouse.length).toBeGreaterThan(0);
});
