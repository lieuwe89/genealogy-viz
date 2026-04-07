const { parseGenericXml } = require('../../server/import/generic-xml');

const XML = `<?xml version="1.0"?>
<persons>
  <person id="P1" sex="M">
    <given>Thomas</given>
    <surname>Smith</surname>
    <birth year="1680"/>
    <death year="1740"/>
    <role>Captain</role>
  </person>
  <person id="P2" sex="F">
    <given>Anna</given>
    <surname>Jones</surname>
    <birth year="1690"/>
  </person>
</persons>`;

const MAPPING = {
  personElement: 'person',
  id: '@id',
  givenName: 'given',
  surname: 'surname',
  sex: '@sex',
  birthYear: 'birth/@year',
  deathYear: 'death/@year',
  notes: 'notes',
  roleElement: 'role',
};

test('parses persons from generic XML with mapping', async () => {
  const raw = await parseGenericXml(XML, MAPPING);
  expect(raw.persons).toHaveLength(2);
  expect(raw.persons[0].givenName).toBe('Thomas');
  expect(raw.persons[0].birthYear).toBe(1680);
  expect(raw.persons[0].roles).toContain('Captain');
  expect(raw.persons[0].sex).toBe('M');
  expect(raw.persons[1].deathYear).toBeNull();
});
