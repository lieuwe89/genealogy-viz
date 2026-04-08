'use strict';

window.Clustering = (function () {
  var THRESHOLD_CENTURY = 1200;
  var THRESHOLD_SURNAME = 500;

  var clusterLevel = 'persons';
  var clusterLocked = false;
  var rawGraphData = null;

  function init(graphData) {
    rawGraphData = graphData;
  }

  function avg(nodes, prop) {
    if (!nodes || nodes.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < nodes.length; i++) {
      sum += (nodes[i][prop] || 0);
    }
    return sum / nodes.length;
  }

  function buildClusteredData(level, graphData, surnamePalette) {
    if (level === 'persons') {
      return graphData;
    }

    if (level === 'century') {
      var centuryGroups = {};
      graphData.nodes.forEach(function (n) {
        var century = n.birthYear ? Math.floor(n.birthYear / 100) * 100 : 'unknown';
        if (!centuryGroups[century]) {
          centuryGroups[century] = { century: century, members: [] };
        }
        centuryGroups[century].members.push(n);
      });

      var clusterNodes = Object.values(centuryGroups).map(function (g) {
        var members = g.members;
        return {
          id: '__cluster_century_' + g.century,
          name: g.century === 'unknown' ? '?' : String(g.century) + 's',
          _isCluster: true,
          _level: 'century',
          _members: members.map(function (n) { return n.id; }),
          _radius: Math.max(8, Math.sqrt(members.length) * 8),
          _color: '#1e3a5f',
          _labelColor: 'rgba(100,160,255,0.7)',
          x: avg(members, 'x'),
          y: avg(members, 'y'),
          z: avg(members, 'z'),
        };
      });

      return { nodes: clusterNodes, links: [] };
    }

    if (level === 'surname') {
      var surnameGroups = {};
      graphData.nodes.forEach(function (n) {
        var century = n.birthYear ? Math.floor(n.birthYear / 100) * 100 : 'unknown';
        var surname = n.surname || 'Onbekend';
        var key = century + '_' + surname;
        if (!surnameGroups[key]) {
          surnameGroups[key] = { century: century, surname: surname, members: [] };
        }
        surnameGroups[key].members.push(n);
      });

      var pal = surnamePalette || {};
      var surnameClusterNodes = Object.values(surnameGroups).map(function (g) {
        var members = g.members;
        return {
          id: '__cluster_surname_' + g.century + '_' + g.surname,
          name: g.surname,
          _isCluster: true,
          _level: 'surname',
          _members: members.map(function (n) { return n.id; }),
          _radius: Math.max(5, Math.sqrt(members.length) * 5),
          _color: pal[g.surname] || '#6e7681',
          _labelColor: 'rgba(255,255,255,0.6)',
          x: avg(members, 'x'),
          y: avg(members, 'y'),
          z: avg(members, 'z'),
        };
      });

      return { nodes: surnameClusterNodes, links: [] };
    }

    // Fallback: return graphData unchanged
    return graphData;
  }

  function getAutoLevel(cameraDistance) {
    if (cameraDistance > THRESHOLD_CENTURY) return 'century';
    if (cameraDistance > THRESHOLD_SURNAME) return 'surname';
    return 'persons';
  }

  function setLevel(level) {
    clusterLevel = level;
    return level;
  }

  function setLocked(locked) {
    clusterLocked = locked;
  }

  function isLocked() {
    return clusterLocked;
  }

  function getLevel() {
    return clusterLevel;
  }

  function finerLevel(currentLevel) {
    if (currentLevel === 'century') return 'surname';
    if (currentLevel === 'surname') return 'persons';
    return 'persons';
  }

  return {
    init: init,
    buildClusteredData: buildClusteredData,
    getAutoLevel: getAutoLevel,
    setLevel: setLevel,
    setLocked: setLocked,
    isLocked: isLocked,
    getLevel: getLevel,
    finerLevel: finerLevel,
    THRESHOLD_CENTURY: THRESHOLD_CENTURY,
    THRESHOLD_SURNAME: THRESHOLD_SURNAME,
  };
})();
