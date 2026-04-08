'use strict';
global.window = {};
require('../public/js/rel-path.js');
const { classifyRelationship, formatRelLabel } = window.RelPath;

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// Helper: build mock graphData
function mockGraph(links) {
  return { nodes: [], links: links };
}
function pcLink(parentId, childId) {
  return { type: 'parent-child', source: parentId, target: childId };
}
function spouseLink(a, b) {
  return { type: 'spouse', source: a, target: b };
}

// Test 1: direct parent-child (A is parent of B) — A is ancestor
const g1 = mockGraph([pcLink('A', 'B')]);
const r1 = classifyRelationship(['A', 'B'], g1);
assert(r1.type === 'ancestor', 'direct parent->child should be ancestor, got: ' + r1.type);
assert(r1.hops === 1, 'should be 1 hop, got: ' + r1.hops);

// Test 2: reverse direction (B to A where A is parent) — B is descendant of A
const r2 = classifyRelationship(['B', 'A'], g1);
assert(r2.type === 'descendant', 'child->parent should be descendant, got: ' + r2.type);
assert(r2.hops === 1, 'should be 1 hop, got: ' + r2.hops);

// Test 3: two-hop ancestor (A->B->C all parent-child downward)
const g3 = mockGraph([pcLink('A', 'B'), pcLink('B', 'C')]);
const r3 = classifyRelationship(['A', 'B', 'C'], g3);
assert(r3.type === 'ancestor', '2-hop downward should be ancestor, got: ' + r3.type);
assert(r3.hops === 2, 'should be 2 hops, got: ' + r3.hops);

// Test 4: direct spouse
const g4 = mockGraph([spouseLink('A', 'B')]);
const r4 = classifyRelationship(['A', 'B'], g4);
assert(r4.type === 'spouse', 'direct spouse link should be spouse, got: ' + r4.type);

// Test 5: in-law (parent-child + spouse)
const g5 = mockGraph([pcLink('A', 'B'), spouseLink('B', 'C')]);
const r5 = classifyRelationship(['A', 'B', 'C'], g5);
assert(r5.type === 'inlaw', 'parent-child + spouse should be inlaw, got: ' + r5.type);

// Test 6: complex (up then down without spouse)
const g6 = mockGraph([pcLink('B', 'A'), pcLink('B', 'C')]);
const r6 = classifyRelationship(['A', 'B', 'C'], g6);
assert(r6.type === 'complex', 'up then down should be complex, got: ' + r6.type);

// Test 7: empty path
const r7 = classifyRelationship([], mockGraph([]));
assert(r7 === null, 'empty path should return null');

// Test 8: formatRelLabel with passthrough t()
const identity = function(k) { return k; };
const r8 = formatRelLabel({ type: 'ancestor', hops: 3 }, identity);
assert(r8.includes('rel_ancestor'), 'formatRelLabel ancestor should use rel_ancestor key, got: ' + r8);

// Test 9: formatRelLabel null
const r9 = formatRelLabel(null, identity);
assert(r9 === 'rel_no_path', 'formatRelLabel null should return rel_no_path, got: ' + r9);

console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
