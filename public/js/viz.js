'use strict';
/* global ForceGraph3D, ColorModes, THREE */

let graph, graphData, colorMode = 'role', surnamePalette = {};

function buildNodeObject(node) {
  const color = ColorModes.getNodeColor(node, colorMode, surnamePalette);
  if (node.birthYear && node.deathYear && node.deathYear > node.birthYear) {
    const lifespan = node.deathYear - node.birthYear;
    const height = Math.max(2, lifespan * 0.3);
    const radius = 2;
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
    const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.95 });
    return new THREE.Mesh(geometry, material);
  }
  const geometry = new THREE.SphereGeometry(3, 12, 8);
  const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.95 });
  return new THREE.Mesh(geometry, material);
}

async function initViz() {
  const res = await fetch('api/graph');
  graphData = await res.json();
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
    .onNodeClick(node => openPanel(node.id))
    .d3Force('z', () => {
      graphData.nodes.forEach(n => {
        n.vz = (n.vz || 0) + (nodeZ(n) - (n.z || 0)) * 0.05;
      });
    });

  const session = await fetch('admin/session').then(r => r.json());
  if (session.isAdmin) {
    document.getElementById('admin-badge').style.display = 'block';
    window.__isAdmin = true;
  }
}

function setColorMode(mode) {
  colorMode = mode;
  document.querySelectorAll('.toolbar-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${mode}`).classList.add('active');
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

document.addEventListener('DOMContentLoaded', initViz);
