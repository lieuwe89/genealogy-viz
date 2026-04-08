'use strict';

/**
 * rel-path.js — Pure logic for relationship path classification and label formatting.
 * Exposed as window.RelPath.
 *
 * classifyRelationship(path, graphData) — classifies a shortest-path as ancestor,
 * descendant, spouse, inlaw, or complex.
 *
 * formatRelLabel(result, t) — formats a human-readable label using the i18n t() function.
 */

window.RelPath = (function () {
  /**
   * Normalise a link's source or target field to a plain id string.
   * Duplicated from overlap-logic.js (private there, not exported on window.OverlapLogic).
   * ForceGraph3D mutates link endpoints to node objects after processing.
   */
  function linkEndId(end) {
    if (end == null) return '';
    if (typeof end === 'object') return String(end.id ?? '');
    return String(end);
  }

  /**
   * Find the link object connecting two nodes (undirected lookup).
   */
  function getLinkBetween(graphData, idA, idB) {
    return graphData.links.find(function(l) {
      var a = linkEndId(l.source), b = linkEndId(l.target);
      return (a === String(idA) && b === String(idB)) || (a === String(idB) && b === String(idA));
    });
  }

  /**
   * classifyRelationship(path, graphData)
   *
   * path: array of node id strings from shortestPath(), length >= 2 for a real relationship.
   * graphData: { nodes, links } from /api/graph.
   *
   * Returns:
   *   null                              — empty path
   *   { type: 'self',       hops: 0 }  — single node
   *   { type: 'ancestor',   hops: N }  — all hops are parent-child downward (path[0] is ancestor)
   *   { type: 'descendant', hops: N }  — all hops are parent-child upward (path[0] is descendant)
   *   { type: 'spouse',     hops: 1 }  — single spouse hop
   *   { type: 'inlaw',      hops: N }  — path contains at least one spouse hop
   *   { type: 'complex',    hops: N }  — mixed up/down parent-child hops without spouse
   */
  function classifyRelationship(path, graphData) {
    if (!path || path.length === 0) return null;
    if (path.length === 1) return { type: 'self', hops: 0 };

    var upHops = 0, downHops = 0, spouseHops = 0;

    for (var i = 0; i < path.length - 1; i++) {
      var link = getLinkBetween(graphData, path[i], path[i + 1]);
      if (!link) return { type: 'complex', hops: path.length - 1 };

      if (link.type === 'spouse') {
        spouseHops++;
      } else if (link.type === 'parent-child') {
        // source = parent, target = child per API contract
        // If link.target matches path[i+1], we are moving downward (path[i] is on the ancestor side)
        if (linkEndId(link.target) === String(path[i + 1])) {
          downHops++;
        } else {
          upHops++;
        }
      } else {
        return { type: 'complex', hops: path.length - 1 };
      }
    }

    var totalHops = path.length - 1;
    // Pure spouse path (no parent-child hops) — classify as spouse
    if (spouseHops > 0 && upHops === 0 && downHops === 0) return { type: 'spouse', hops: totalHops };
    // Mixed: spouse hop(s) combined with parent-child hops — in-law
    if (spouseHops > 0) return { type: 'inlaw', hops: totalHops };
    if (upHops === 0 && downHops > 0) return { type: 'ancestor', hops: downHops };
    if (downHops === 0 && upHops > 0) return { type: 'descendant', hops: upHops };
    return { type: 'complex', hops: totalHops };
  }

  /**
   * formatRelLabel(result, t)
   *
   * result: return value from classifyRelationship(), or null.
   * t: i18n translation function (key => string). Keys use {n} placeholder for hop count.
   *
   * Returns a formatted human-readable string.
   */
  function formatRelLabel(result, t) {
    if (!result) return t('rel_no_path');
    switch (result.type) {
      case 'ancestor':   return t('rel_ancestor').replace('{n}', result.hops);
      case 'descendant': return t('rel_descendant').replace('{n}', result.hops);
      case 'spouse':     return t('rel_spouse');
      case 'inlaw':      return t('rel_inlaw').replace('{n}', result.hops);
      case 'self':       return t('rel_no_path');
      default:           return t('rel_complex').replace('{n}', result.hops);
    }
  }

  return { classifyRelationship: classifyRelationship, formatRelLabel: formatRelLabel };
})();
