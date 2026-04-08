'use strict';
global.window = {};
require('../public/js/clustering.js');
var C = window.Clustering;

var passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('FAIL: ' + msg); } }

// Test getAutoLevel
assert(C.getAutoLevel(1500) === 'century', 'dist 1500 should be century');
assert(C.getAutoLevel(800) === 'surname', 'dist 800 should be surname');
assert(C.getAutoLevel(300) === 'persons', 'dist 300 should be persons');

// Test buildClusteredData persons level
var mockData = {
  nodes: [
    { id: '1', name: 'A', birthYear: 1850, surname: 'De Vries', x: 0, y: 0, z: 0 },
    { id: '2', name: 'B', birthYear: 1860, surname: 'De Vries', x: 10, y: 0, z: 0 },
    { id: '3', name: 'C', birthYear: 1750, surname: 'Jansen', x: 20, y: 0, z: 0 },
  ],
  links: []
};
var personsResult = C.buildClusteredData('persons', mockData, {});
assert(personsResult.nodes.length === 3, 'persons level returns all nodes');

// Test buildClusteredData century level
var centuryResult = C.buildClusteredData('century', mockData, {});
assert(centuryResult.nodes.length === 2, 'century level groups into 2 centuries (1800, 1700), got: ' + centuryResult.nodes.length);
assert(centuryResult.nodes.every(function(n) { return n._isCluster; }), 'all century nodes are clusters');
assert(centuryResult.nodes.every(function(n) { return n.id.startsWith('__cluster_'); }), 'cluster IDs have __cluster_ prefix');

// Test buildClusteredData surname level
var palette = { 'De Vries': 'hsl(0,65%,58%)', 'Jansen': 'hsl(180,65%,58%)' };
var surnameResult = C.buildClusteredData('surname', mockData, palette);
assert(surnameResult.nodes.length === 2, 'surname level: 2 surname groups, got: ' + surnameResult.nodes.length);

// Test finerLevel
assert(C.finerLevel('century') === 'surname', 'finer than century is surname');
assert(C.finerLevel('surname') === 'persons', 'finer than surname is persons');
assert(C.finerLevel('persons') === 'persons', 'finer than persons is persons');

console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
