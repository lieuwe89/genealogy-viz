'use strict';
/* global ForceGraph3D, ColorModes, OverlapLogic */

let graph, graphData, colorMode = 'role', surnamePalette = {};
let overlapFocusId = null; // null = no overlap mode active

async function initViz() {
  const res = await fetch('api/graph');
  graphData = await res.json();
  window.graphData = graphData;
  surnamePalette = ColorModes.buildSurnamePalette(graphData.nodes);

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
      if (window.isSelectingCompare) {
        window.isSelectingCompare = false;
        openCompare(node.id);
        return;
      }
      openPanel(node.id);
    })
    .d3Force('z', () => {
      graphData.nodes.forEach(n => {
        n.vz = (n.vz || 0) + (nodeZ(n) - (n.z || 0)) * 0.05;
      });
    });

  // ─── Time-direction background elements ──────────────────────────────────
  const scene = graph.scene();

  // Classic century marker planes + year labels (hidden when arrow is active)
  const centuryObjects = [];
  for (let y = Math.ceil(minYear / 100) * 100; y <= maxYear; y += 100) {
    const t = (y - minYear) / (maxYear - minYear || 1);
    const z = t * Z_RANGE - Z_RANGE / 2;

    const planeGeo = new THREE.PlaneGeometry(800, 800);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f, transparent: true, opacity: 0.08,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = Math.PI / 2;
    plane.position.z = z;
    plane.visible = false; // hidden by default (arrow is shown instead)
    scene.add(plane);
    centuryObjects.push(plane);

    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(100,160,255,0.5)';
    ctx.font = '28px monospace';
    ctx.fillText(String(y), 8, 44);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(120, 30, 1);
    sprite.position.set(-380, 5, z);
    sprite.visible = false;
    scene.add(sprite);
    centuryObjects.push(sprite);
  }

  // ─── Animated time-direction arrow ───────────────────────────────────────
  const minZ = -Z_RANGE / 2;
  const maxZ =  Z_RANGE / 2;
  const arrowGroup = new THREE.Group();

  // Place the arrow off to the left of the graph so it's visible from the
  // side when orbiting, and doesn't sit in front of the camera on load
  // (the camera looks along -Z by default, so a pure Z-axis arrow would
  //  be seen end-on; this offset makes it legible from most angles).
  arrowGroup.position.set(-480, 0, 0);

  // Shaft — thin cylinder along Z-axis (local space: centered at z=0)
  const shaftLen = Z_RANGE - 70;
  const shaftGeo = new THREE.CylinderGeometry(4, 4, shaftLen, 12);
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.55, depthWrite: false });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0;
  arrowGroup.add(shaft);

  // Arrow head — cone pointing in +Z direction (future)
  const headGeo = new THREE.ConeGeometry(14, 55, 12);
  const headMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.85, depthWrite: false });
  const arrowHead = new THREE.Mesh(headGeo, headMat);
  arrowHead.rotation.x = Math.PI / 2; // tip points toward +Z (future)
  arrowHead.position.z = maxZ - 15;
  arrowGroup.add(arrowHead);

  // Year label helper — placed at fixed world offset from arrow
  function makeYearSprite(year, z) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const cx = c.getContext('2d');
    cx.fillStyle = 'rgba(147,197,253,0.8)';
    cx.font = 'bold 26px monospace';
    cx.textAlign = 'center';
    cx.fillText(String(year), 128, 44);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(130, 33, 1);
    sprite.position.set(55, 0, z); // offset to the right of the shaft
    return sprite;
  }
  arrowGroup.add(makeYearSprite(minYear, minZ + 15));
  arrowGroup.add(makeYearSprite(maxYear, maxZ - 15));

  // Flowing chevrons — drift from past → future, fade at ends
  const CHEVRON_COUNT = 14;
  const chevrons = [];
  for (let i = 0; i < CHEVRON_COUNT; i++) {
    const geo = new THREE.ConeGeometry(7, 22, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2; // tip points toward +Z (future), same as movement
    mesh.userData.phase = i / CHEVRON_COUNT;
    arrowGroup.add(mesh);
    chevrons.push(mesh);
  }

  scene.add(arrowGroup);

  // Animation loop — runs every frame, updates arrow visuals
  function animateTimeArrow(timestamp) {
    requestAnimationFrame(animateTimeArrow);
    if (!arrowGroup.visible) return;
    const t = timestamp * 0.001; // seconds

    // Slow pulse on shaft and head
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.55);
    shaftMat.opacity = 0.3 + 0.28 * pulse;
    headMat.opacity  = 0.62 + 0.23 * pulse;

    // Chevrons flow along the full shaft length
    const span = maxZ - minZ;
    chevrons.forEach(chev => {
      const phase = (chev.userData.phase + t * 0.0675) % 1; // 75% of original speed
      chev.position.z = minZ + phase * span;
      // Fade in/out near the ends so they appear to emerge and dissolve
      const fade = Math.min(phase * 6, (1 - phase) * 6, 1);
      chev.material.opacity = 0.62 * fade;
    });
  }
  requestAnimationFrame(animateTimeArrow);

  // Global toggle: switch between arrow (default) and classic century planes
  let timeArrowVisible = true;
  window.toggleTimeArrow = function() {
    timeArrowVisible = !timeArrowVisible;
    arrowGroup.visible = timeArrowVisible;
    centuryObjects.forEach(o => { o.visible = !timeArrowVisible; });
    const btn = document.getElementById('btn-time-arrow');
    if (btn) btn.classList.toggle('active', timeArrowVisible);
  };

  const session = await fetch('admin/session').then(r => r.json());
  if (session.isAdmin) {
    document.getElementById('admin-badge').style.display = 'block';
    window.__isAdmin = true;
  }
}

function buildNodeObject(node) {
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
