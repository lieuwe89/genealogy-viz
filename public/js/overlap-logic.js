'use strict';

/**
 * overlap-logic.js — Pure functions for lifespan estimation and overlap detection.
 * Exposed as window.OverlapLogic.
 */

/**
 * Normalise a link's source or target field to a plain id string.
 * force-graph mutates links so source/target may be node objects.
 */
function linkEndId(end) {
  if (end == null) return '';
  if (typeof end === 'object') return String(end.id ?? '');
  return String(end);
}

/**
 * estimateLifespan(node, graphData)
 * Returns { birthYear, deathYear, estimated }
 */
function estimateLifespan(node, graphData) {
  if (!node.birthYear) {
    return { birthYear: null, deathYear: null, estimated: true };
  }

  if (node.deathYear) {
    return { birthYear: node.birthYear, deathYear: node.deathYear, estimated: false };
  }

  // Estimate: base is birthYear + 70
  let estimated = node.birthYear + 70;

  // Child correction: find children of this node
  const childIds = [];
  for (const link of graphData.links) {
    if (link.type !== 'parent-child') continue;
    const srcId = linkEndId(link.source);
    const tgtId = linkEndId(link.target);
    if (srcId === String(node.id)) {
      childIds.push(tgtId);
    }
  }

  if (childIds.length > 0) {
    const childBirthYears = childIds
      .map(cid => graphData.nodes.find(n => String(n.id) === cid))
      .filter(Boolean)
      .map(c => c.birthYear)
      .filter(Boolean);

    if (childBirthYears.length > 0) {
      const maxChildBirth = Math.max(...childBirthYears);
      if (maxChildBirth > estimated) {
        estimated = maxChildBirth;
      }
    }
  }

  return { birthYear: node.birthYear, deathYear: estimated, estimated: true };
}

/**
 * overlapLevel(nodeA, nodeB, graphData)
 * Returns 'overlap' | 'no-overlap' | 'uncertain'
 */
function overlapLevel(nodeA, nodeB, graphData) {
  if (!nodeA || !nodeB) return 'uncertain';

  const lsA = estimateLifespan(nodeA, graphData);
  const lsB = estimateLifespan(nodeB, graphData);

  if (lsA.birthYear == null || lsB.birthYear == null) return 'uncertain';

  const deathA = lsA.deathYear;
  const deathB = lsB.deathYear;

  const overlaps = deathA >= lsB.birthYear && deathB >= lsA.birthYear;

  // If either lifespan is estimated, check if ±20 years would flip the result
  if (lsA.estimated || lsB.estimated) {
    const MARGIN = 20;
    // The closest boundary gap
    const gap1 = deathA - lsB.birthYear; // positive = A dies after B born
    const gap2 = deathB - lsA.birthYear; // positive = B dies after A born

    if (overlaps) {
      // Would no-overlap if we shrank either lifespan by MARGIN
      if (Math.min(gap1, gap2) < MARGIN) return 'uncertain';
    } else {
      // Would overlap if we expanded by MARGIN
      if (Math.min(-gap1, -gap2) < MARGIN) return 'uncertain';
    }
  }

  return overlaps ? 'overlap' : 'no-overlap';
}

/**
 * shortestPath(graphData, fromId, toId)
 * BFS. Returns ordered array of node ids (inclusive), or [] if unreachable.
 */
function shortestPath(graphData, fromId, toId) {
  fromId = String(fromId);
  toId = String(toId);

  if (fromId === toId) return [fromId];

  // Build adjacency list (undirected)
  const adj = {};
  for (const node of graphData.nodes) {
    adj[String(node.id)] = [];
  }
  for (const link of graphData.links) {
    const a = linkEndId(link.source);
    const b = linkEndId(link.target);
    if (adj[a]) adj[a].push(b);
    if (adj[b]) adj[b].push(a);
  }

  // BFS
  const visited = new Set([fromId]);
  const queue = [[fromId]];

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    for (const neighbour of (adj[current] || [])) {
      if (visited.has(neighbour)) continue;
      const newPath = [...path, neighbour];
      if (neighbour === toId) return newPath;
      visited.add(neighbour);
      queue.push(newPath);
    }
  }

  return [];
}

window.OverlapLogic = { estimateLifespan, overlapLevel, shortestPath };
