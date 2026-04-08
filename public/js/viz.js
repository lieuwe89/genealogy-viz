'use strict';
/* global ForceGraph3D, ColorModes, OverlapLogic */

let graph, graphData, colorMode = 'role', surnamePalette = {};
let overlapFocusId = null; // null = no overlap mode active
let currentClusterLevel = 'persons';

async function initViz() {
  const res = await fetch('api/graph');
  graphData = await res.json();
  window.graphData = graphData;
  surnamePalette = ColorModes.buildSurnamePalette(graphData.nodes);
  if (window.Clustering) Clustering.init(graphData);

  const years = graphData.nodes.map(n => n.birthYear).filter(Boolean);
  const minYear = years.length ? Math.min(...years) : 1700;
  const maxYear = years.length ? Math.max(...years) : 1700;
  const medianYear = years.length ? years.sort((a, b) => a - b)[Math.floor(years.length / 2)] : 1700;
  const Z_RANGE = Math.min(3000, Math.max(600, (maxYear - minYear) * 8));

  function nodeZ(node) {
    const y = node.birthYear || medianYear;
    return ((y - minYear) / (maxYear - minYear || 1)) * Z_RANGE - Z_RANGE / 2;
  }

  graph = ForceGraph3D({ controlType: 'orbit' })(document.getElementById('graph-container'))
    .backgroundColor('#0d1117')
    .graphData(graphData)
    .nodeLabel(n => n.name)
    .nodeThreeObject(buildNodeObject)
    .nodeThreeObjectExtend(false)
    .linkColor(l => l.type === 'spouse' ? '#6e7681' : '#374151')
    .linkWidth(l => l.type === 'spouse' ? 1.5 : 0.8)
    .linkOpacity(0.4)
    .onNodeClick(function(node) {
      if (node._isCluster) {
        var finer = Clustering.finerLevel(currentClusterLevel);
        var dist = 80;
        graph.cameraPosition(
          { x: (node.x || 0) + dist, y: (node.y || 0) + dist, z: (node.z || 0) + dist },
          node,
          600
        );
        if (Clustering.isLocked()) {
          Clustering.setLocked(false);
          updateLockButton();
        }
        applyClusterLevel(finer);
        return;
      }
      openPanel(node.id);
    })
    .d3Force('z', () => {
      graphData.nodes.forEach(n => {
        n.vz = (n.vz || 0) + (nodeZ(n) - (n.z || 0)) * 0.05;
      });
    });

  // Time-direction century marker planes
  const scene = graph.scene();
  const centuries = [];
  for (let y = Math.ceil(minYear / 100) * 100; y <= maxYear; y += 100) {
    centuries.push(y);
  }
  centuries.forEach(year => {
    const t = (year - minYear) / (maxYear - minYear || 1);
    const z = t * Z_RANGE - Z_RANGE / 2;
    const planeGeo = new THREE.PlaneGeometry(800, 800);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = Math.PI / 2; // horizontal plane
    plane.position.z = z;
    scene.add(plane);

    // Year label using THREE sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(100,160,255,0.5)';
    ctx.font = '28px monospace';
    ctx.fillText(String(year), 8, 44);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(120, 30, 1);
    sprite.position.set(-380, 5, z);
    scene.add(sprite);
  });

  // Auto-clustering based on camera distance
  let clusterDebounceTimer = null;
  function onCameraChange() {
    if (clusterDebounceTimer) clearTimeout(clusterDebounceTimer);
    clusterDebounceTimer = setTimeout(function() {
      if (!window.Clustering || Clustering.isLocked()) return;
      var dist = graph.camera().position.length();
      var newLevel = Clustering.getAutoLevel(dist);
      if (newLevel !== currentClusterLevel) {
        applyClusterLevel(newLevel);
      }
    }, 200);
  }
  try {
    var controls = graph.controls();
    controls.addEventListener('change', onCameraChange);
  } catch (e) {
    (function pollCamera() {
      onCameraChange();
      requestAnimationFrame(pollCamera);
    })();
  }

  const session = await fetch('admin/session').then(r => r.json());
  if (session.isAdmin) {
    document.getElementById('admin-badge').style.display = 'block';
    window.__isAdmin = true;
  }
}

function applyClusterLevel(level) {
  if (!window.Clustering) return;
  currentClusterLevel = level;
  Clustering.setLevel(level);
  var sel = document.getElementById('cluster-level');
  if (sel) sel.value = level;
  var clustered = Clustering.buildClusteredData(level, window.graphData, surnamePalette);
  graph.graphData(clustered);
  graph.nodeThreeObject(buildNodeObject);
}

function updateLockButton() {
  var btn = document.getElementById('btn-cluster-lock');
  if (!btn || !window.i18n) return;
  var locked = Clustering.isLocked();
  btn.textContent = i18n.t(locked ? 'cluster_locked' : 'cluster_auto');
  btn.classList.toggle('active', locked);
}

function buildNodeObject(node) {
  if (node._isCluster) {
    const cGeo = new THREE.SphereGeometry(node._radius, 16, 12);
    const cOpacity = node._level === 'century' ? 0.12 : 0.20;
    const cMat = new THREE.MeshBasicMaterial({
      color: node._color,
      transparent: true,
      opacity: cOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cMesh = new THREE.Mesh(cGeo, cMat);
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 512; cCanvas.height = 64;
    const cCtx = cCanvas.getContext('2d');
    cCtx.fillStyle = node._labelColor;
    cCtx.font = '28px monospace';
    let labelText = node.name;
    if (node._members) labelText += ' (' + node._members.length + ')';
    cCtx.fillText(labelText, 8, 44);
    const cTex = new THREE.CanvasTexture(cCanvas);
    const cSpriteMat = new THREE.SpriteMaterial({ map: cTex, transparent: true, opacity: 0.7 });
    const cSprite = new THREE.Sprite(cSpriteMat);
    cSprite.scale.set(120, 30, 1);
    cSprite.position.set(0, node._radius + 10, 0);
    cMesh.add(cSprite);
    return cMesh;
  }

  let color;
  let opacity = 1.0;

  if (overlapFocusId) {
    if (node.id === overlapFocusId) {
      color = '#facc15'; // yellow — the selected focal node
    } else {
      const focusNode = graphData.nodes.find(n => n.id === overlapFocusId);
      const level = OverlapLogic.overlapLevel(focusNode, node, graphData);
      if (level === 'overlap')    { color = '#f97316'; }  // vivid orange
      if (level === 'no-overlap') { color = '#374151'; opacity = 0.25; } // dark grey, semi-transparent
      if (level === 'uncertain')  { color = '#6366f1'; }  // indigo tint for estimated
      if (!color) color = '#6366f1'; // fallback
    }
  } else {
    color = ColorModes.getNodeColor(node, colorMode, surnamePalette);
  }

  const geo = new THREE.SphereGeometry(3, 12, 8);

  const mat = new THREE.MeshLambertMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Mesh(geo, mat);
}

function applyOverlapColors(focusId) {
  overlapFocusId = focusId;
  if (graph) graph.nodeThreeObject(buildNodeObject);
}

function clearOverlapColors() {
  overlapFocusId = null;
  if (graph) graph.nodeThreeObject(buildNodeObject);
}

function setColorMode(mode) {
  colorMode = mode;
  document.querySelectorAll('.toolbar-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`btn-${mode}`);
  if (btn) btn.classList.add('active');
  // Clear overlap focus when switching colour modes
  overlapFocusId = null;
  if (graph) graph.nodeThreeObject(buildNodeObject);
}

function flyToNode(nodeId) {
  if (!graph || !graphData) return;
  const node = graphData.nodes.find(n => n.id === nodeId);
  if (!node) return;
  const dist = 80;
  const { x = 0, y = 0, z = 0 } = node;
  graph.cameraPosition({ x: x + dist, y: y + dist, z: z + dist }, node, 800);
}

window.setColorMode = setColorMode;
window.flyToNode = flyToNode;
window.applyOverlapColors = applyOverlapColors;
window.clearOverlapColors = clearOverlapColors;

window.setClusterLevel = function(level) {
  applyClusterLevel(level);
};

window.toggleClusterLock = function() {
  if (!window.Clustering) return;
  var locked = !Clustering.isLocked();
  Clustering.setLocked(locked);
  updateLockButton();
};

window.addEventListener('langchange', function() {
  updateLockButton();
  var sel = document.getElementById('cluster-level');
  if (sel && window.i18n) {
    sel.querySelectorAll('option[data-i18n]').forEach(function(opt) {
      opt.textContent = i18n.t(opt.dataset.i18n);
    });
  }
});
