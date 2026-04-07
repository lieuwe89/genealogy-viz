'use strict';
const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;

  const persons = db.prepare('SELECT * FROM persons').all();
  const roles = db.prepare('SELECT * FROM roles').all();
  const relationships = db.prepare('SELECT * FROM relationships').all();

  const rolesByPerson = {};
  for (const r of roles) {
    if (!rolesByPerson[r.person_id]) rolesByPerson[r.person_id] = [];
    rolesByPerson[r.person_id].push(r.label);
  }

  const nodes = persons.map(p => ({
    id: p.id,
    name: [p.name_prefix, p.given_name, p.surname, p.name_suffix].filter(Boolean).join(' '),
    givenName: p.given_name,
    surname: p.surname,
    sex: p.sex,
    birthYear: p.birth_year,
    deathYear: p.death_year,
    roles: rolesByPerson[p.id] || [],
  }));

  const links = relationships.map(r => ({
    id: r.id,
    source: r.person_a_id,
    target: r.person_b_id,
    type: r.type,
  }));

  res.json({ nodes, links });
});

module.exports = router;
