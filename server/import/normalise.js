'use strict';

function normalise(raw) {
  const seen = new Set();
  const relationships = (raw.relationships || []).filter(r => {
    const key = [r.personAId, r.personBId, r.type].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    persons: raw.persons || [],
    relationships,
    sources: raw.sources || [],
  };
}

module.exports = { normalise };
