# Phase 3: Visualisatie-uitbreidingen, meertaligheid en analyse-instrumenten — Research

**Researched:** 2026-04-08
**Domain:** Three.js clustering, vanilla-JS i18n, genealogical relationship naming
**Confidence:** HIGH (codebase fully read; all key patterns verified against live source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Node Clustering**
- D-01: Hierarchical clustering with two levels of control: zoom-based (automatic) AND a manual toggle/slider in the toolbar.
- D-02: Clustering hierarchy: zoomed out far → century bubbles; medium zoom → surname clusters within centuries; fully zoomed in → individual nodes.
- D-03: Clusters are labelled bubbles in the 3D scene. Click on a cluster to expand/zoom into it.
- D-04: The manual toggle lets the user lock a clustering level regardless of zoom — useful for navigating large trees without nodes constantly popping in/out.

**i18n Framework**
- D-05: Full i18n framework with language files: `public/js/i18n/nl.json` and `public/js/i18n/en.json`.
- D-06: A language toggle button in the toolbar (next to the existing colour mode and overlap buttons).
- D-07: Language preference stored in `localStorage` — no server changes required.
- D-08: Scope of translation: all visible UI labels — side panel field labels, toolbar button titles, admin panel headings, import page text. Hardcoded English strings in `side-panel.js`, `viz.js`, `admin.js` must all be replaced with i18n keys.
- D-09: Default language: Dutch (`nl`). Fallback: English (`en`).

**Relationship Path Analysis**
- D-10: Relationship path analysis extends the existing two-person comparison in the side panel.
- D-11: In addition to the existing shortest-path timeline, add a named relationship label derived from the path structure.
- D-12: Relationship naming: traverse the shortest path and classify by hop type: direct parent/child hops → ancestor/descendant labels; spouse hops → in-law qualifiers. Use Dutch terminology by default (subject to i18n).
- D-13: Display in the side panel's two-person comparison section, below the existing timeline bar chart.

### Claude's Discretion
- Exact clustering bubble geometry and animation (expand/collapse transition)
- How to handle nodes without a surname in surname clusters (group under "Onbekend")
- The relationship naming algorithm for complex paths (e.g., half-siblings, step-relations) — use best-effort labelling, fall back to "Verwant via N stappen" for unusual chains
- i18n key naming convention within the JSON files

### Deferred Ideas (OUT OF SCOPE)
- Search/filter nodes by name, role, or year range
- Graph PNG/SVG export
- Generation colour mode
- Family statistics dashboard
- Ancestor/descendant counter
- Data export to CSV/JSON
- Additional languages beyond Dutch and English
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TBD-01 | Hierarchical node clustering (zoom-based + manual lock) | Three.js mesh/sprite pattern confirmed in viz.js; camera distance via OrbitControls |
| TBD-02 | i18n framework (nl/en JSON files, localStorage, toolbar toggle) | `window.X` module pattern confirmed; localStorage clean slate confirmed |
| TBD-03 | Named relationship label in two-person comparison | `shortestPath()` returns node-ID array; link type lookup pattern needed; confirmed link types are `parent-child` and `spouse` only |
</phase_requirements>

---

## Summary

Phase 3 builds three distinct features on top of the Phase 1/2 foundation. The codebase uses vanilla JavaScript (no bundler, no framework) with Three.js 0.160 and 3d-force-graph 1.73 loaded from unpkg CDN. All client modules follow the `window.X = { … }` pattern. The app is served from `public/app.html`, not `public/index.html`. The admin panel is at `public/admin/index.html`.

The key technical insight is that `shortestPath()` returns only an array of node IDs — not the link objects traversed. The relationship naming algorithm must reconstruct the traversed links from `graphData.links` using consecutive ID pairs in the path. This is straightforward because link types (`parent-child`, `spouse`) are available in `graphData.links` from the `/api/graph` endpoint. The directionality of `parent-child` links (source = parent, target = child) is preserved in the graph data from the import layer and is accessible via `link.source` / `link.target` (which ForceGraph3D may mutate to objects — the `linkEndId()` helper in `overlap-logic.js` handles this already).

For clustering, the ForceGraph3D `nodeThreeObject` callback is the integration point. Clusters are implemented by replacing the raw `graphData.nodes` array passed to `graph.graphData()` with a merged array containing both individual nodes (at fine zoom) and synthetic cluster nodes (at coarse zoom). The THREE.js scene already has century planes and sprite labels — cluster bubbles follow the exact same pattern.

**Primary recommendation:** Implement the three features as three independent modules (`window.Clustering`, `window.i18n`, `window.RelPath`) wired together in `viz.js` and `side-panel.js`. All three can be developed in parallel once the i18n module exists (clustering and side-panel both need `t(key)` for their labels).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js | 0.160.0 (CDN) | 3D scene — cluster bubbles, sprites | Already loaded; cluster geometry uses same `THREE.SphereGeometry` / `THREE.Sprite` pattern as existing century planes |
| 3d-force-graph | 1.73.0 (CDN) | Graph layout engine; `nodeThreeObject`, `graphData()`, `cameraPosition()` | Already loaded; clustering hooks directly into its API |

No new npm packages are needed. [VERIFIED: reading public/app.html — both libraries loaded from unpkg CDN]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage (browser native) | — | Language preference persistence | i18n toggle (D-07) |
| JSON (browser native) | — | i18n translation files | `fetch('js/i18n/nl.json')` at init |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Synthetic cluster nodes in graphData | Separate THREE objects added directly to scene | Separate objects do not participate in force simulation and cannot be clicked via ForceGraph3D's `onNodeClick` — synthetic nodes in graphData are the correct approach |
| Custom i18n module | i18next library | Project is no-bundler vanilla JS; adding a CDN dependency for i18n is overkill for two languages and a small key set |

**Installation:** No new packages to install.

---

## Architecture Patterns

### Recommended Project Structure
```
public/
├── js/
│   ├── i18n/
│   │   ├── nl.json          # Dutch translations (canonical)
│   │   └── en.json          # English translations (fallback)
│   ├── i18n.js              # window.i18n module — t(), setLang(), init()
│   ├── clustering.js        # window.Clustering module
│   ├── rel-path.js          # window.RelPath module
│   ├── colour-modes.js      # unchanged
│   ├── overlap-logic.js     # unchanged
│   ├── side-panel.js        # extended: renderTwoPersonMode() + RelPath label
│   └── viz.js               # extended: clustering hooks, camera listener
└── app.html                 # extended: language toggle + cluster controls in toolbar
```

### Pattern 1: window.X Module (Established Pattern)
**What:** All client JS is a self-contained IIFE-like object assigned to `window`. No import/export.
**When to use:** Every new file in this project.
**Example:**
```javascript
// Source: verified from public/js/colour-modes.js, overlap-logic.js, viz.js
'use strict';
window.i18n = (function () {
  let lang = 'nl';
  let strings = {};
  return {
    init(preferredLang) { lang = preferredLang || 'nl'; /* load JSON */ },
    t(key) { return strings[key] || key; },
    setLang(l) { lang = l; /* re-fetch + re-render */ },
  };
})();
```

### Pattern 2: THREE Sprite Label (Established Pattern)
**What:** Canvas-rendered text on a `THREE.Sprite` placed in the scene. Already used for century year labels.
**When to use:** Cluster bubble labels.
**Example:**
```javascript
// Source: verified from public/js/viz.js lines 63-74
const canvas = document.createElement('canvas');
canvas.width = 256; canvas.height = 64;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'rgba(100,160,255,0.7)';
ctx.font = '28px monospace';
ctx.fillText(labelText, 8, 44);
const tex = new THREE.CanvasTexture(canvas);
const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
const sprite = new THREE.Sprite(spriteMat);
sprite.scale.set(120, 30, 1);
sprite.position.set(cx, cy + radius + 10, cz);
scene.add(sprite);
```

### Pattern 3: nodeThreeObject for Cluster Bubbles
**What:** `graph.nodeThreeObject(fn)` is called per node. Return a THREE.Mesh for cluster nodes, a sphere for individual nodes.
**When to use:** The clustering module overrides this callback.
**Key detail:** `graph.graphData({ nodes: mergedNodes, links })` replaces the entire node list. Cluster nodes are synthetic objects with an `id`, `x`, `y`, `z`, and a custom `_isCluster: true` flag so `buildNodeObject()` can branch.
**Example:**
```javascript
// Source: verified from public/js/viz.js lines 84-111 (buildNodeObject pattern)
function buildNodeObject(node) {
  if (node._isCluster) {
    const geo = new THREE.SphereGeometry(node._radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: node._color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  }
  // ... existing individual node logic
}
```

### Pattern 4: Link Type Lookup for Relationship Naming
**What:** `shortestPath()` returns `[idA, …, idB]`. To name the relationship, iterate consecutive pairs and find the link between them in `graphData.links`.
**Key detail:** After ForceGraph3D processes links, `link.source` and `link.target` may be node objects (not plain IDs). Use `linkEndId()` from `overlap-logic.js` (already exported as part of the module — but it is NOT on `window.OverlapLogic`; it is a private function). The relationship module must duplicate this one-liner or inline it.
**Example:**
```javascript
// Source: derived from public/js/overlap-logic.js lines 12-16
function linkEndId(end) {
  if (end == null) return '';
  if (typeof end === 'object') return String(end.id ?? '');
  return String(end);
}

function getLinkBetween(graphData, idA, idB) {
  return graphData.links.find(l => {
    const a = linkEndId(l.source), b = linkEndId(l.target);
    return (a === idA && b === idB) || (a === idB && b === idA);
  });
}
```

### Pattern 5: Camera Distance for Auto-Clustering
**What:** OrbitControls fires a `change` event on the camera. Read `graph.camera().position` distance from origin to determine current zoom level.
**When to use:** Auto-cluster level switching (D-01, D-04).
**Example:**
```javascript
// Source: [ASSUMED] — ForceGraph3D exposes graph.controls() which is an OrbitControls instance
graph.controls().addEventListener('change', () => {
  const dist = graph.camera().position.length();
  if (!clusterLocked) {
    if (dist > THRESHOLD_CENTURY) setClusterLevel('century');
    else if (dist > THRESHOLD_SURNAME) setClusterLevel('surname');
    else setClusterLevel('persons');
  }
});
```

### Pattern 6: i18n Static HTML via data-i18n
**What:** HTML elements with `data-i18n` attribute are updated on language switch via `querySelectorAll`.
**When to use:** All static labels in `app.html` and `admin/index.html`.
**Example:**
```html
<!-- in app.html -->
<button class="toolbar-btn" id="btn-lang" data-i18n="lang_toggle_label" onclick="i18n.toggleLang()">EN</button>
```
```javascript
// in i18n.js
function applyToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
```

### Anti-Patterns to Avoid
- **Passing link objects through `shortestPath()`:** The BFS in `overlap-logic.js` builds an undirected adjacency list and returns only node IDs. Do not modify `shortestPath()` — instead look up links after the fact with `getLinkBetween()`.
- **Rendering cluster bubbles as separate scene objects instead of graph nodes:** Separate THREE objects bypass ForceGraph3D's click handler (`onNodeClick`). Cluster interactivity (click to expand/zoom) requires cluster nodes to be real entries in `graphData.nodes`.
- **Blocking i18n init with synchronous XHR:** `fetch()` is async; chain `i18n.init()` before `initViz()` or load JSON files inline as JS objects to avoid async sequencing issues.
- **Modifying `window.graphData` directly for clustering:** Keep a separate `clusteredGraphData` derived from the raw `window.graphData`. Swap in/out without losing the original.
- **Calling `graph.graphData()` on every camera change event:** This triggers a full force simulation restart. Debounce at 200ms minimum, or check if the cluster level actually changed before calling.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D sphere geometry | Custom vertex buffer | `THREE.SphereGeometry(r, 16, 12)` | Handles LOD, UV mapping, normals |
| Smooth camera fly-to | Manual lerp loop | `graph.cameraPosition(pos, lookAt, ms)` | Already used in `flyToNode()` — same API for cluster zoom |
| Canvas text for labels | SVG overlay or DOM div | `THREE.CanvasTexture` + `THREE.Sprite` | Already pattern-established in viz.js; DOM overlays have z-order issues in WebGL |
| BFS path algorithm | Custom graph traversal | `OverlapLogic.shortestPath()` | Already implemented and tested |
| HSL colour palette | Custom colour math | `buildSurnamePalette()` in `colour-modes.js` | Already generates distinct hues per surname — reuse for cluster bubble fill colour |

**Key insight:** The Three.js scene infrastructure (renderer, camera, controls, scene graph) is entirely managed by ForceGraph3D. Never reach into the renderer directly; use ForceGraph3D's API (`graph.scene()`, `graph.camera()`, `graph.controls()`, `graph.cameraPosition()`, `graph.nodeThreeObject()`).

---

## Common Pitfalls

### Pitfall 1: `linkEndId` not exported
**What goes wrong:** `RelPath` module calls `graphData.links.find()` to match node IDs, but after ForceGraph3D processes links, `link.source` and `link.target` are node objects, not strings. A naive `link.source === idA` comparison always fails.
**Why it happens:** ForceGraph3D mutates link endpoints to node references for its internal force simulation. This is documented ForceGraph3D behaviour.
**How to avoid:** Inline the `linkEndId()` helper (3 lines) in `rel-path.js`. Do NOT import it from `overlap-logic.js` since it is not on `window.OverlapLogic`.
**Warning signs:** Relationship label always shows "Verwant via N stappen" even for direct parent-child relationships.

### Pitfall 2: Cluster node IDs conflicting with person IDs
**What goes wrong:** Synthetic cluster nodes assigned IDs like `"cluster-1800"` accidentally match a real person's ID if person IDs are numeric strings (they are — SQLite autoincrement integers).
**Why it happens:** ForceGraph3D uses the `id` field to reconcile nodes across `graph.graphData()` calls. Collision produces invisible renders or misrouted click events.
**How to avoid:** Prefix all synthetic cluster node IDs with a non-numeric string that cannot be an integer: `"__cluster_century_1800"`, `"__cluster_surname_De Vries"`.
**Warning signs:** Clicking a cluster opens the side panel for the wrong person.

### Pitfall 3: `graph.graphData()` restart loop
**What goes wrong:** Calling `graph.graphData(newData)` resets the force simulation, causing nodes to fly to new positions and triggering another `change` event on OrbitControls, which triggers another `graphData()` call.
**Why it happens:** OrbitControls emits `change` whenever the camera moves (including programmatic fly-tos and force-simulation-induced camera nudges).
**How to avoid:** Track the current cluster level in a module-level variable. Only call `graph.graphData()` when the level actually changes. Debounce the `controls.change` handler with `setTimeout` at 150–200ms.
**Warning signs:** Graph re-renders continuously, nodes never settle.

### Pitfall 4: i18n applied before DOM ready
**What goes wrong:** `i18n.init()` calls `document.querySelectorAll('[data-i18n]')` before the HTML is parsed, finding zero elements.
**Why it happens:** Script tags in `app.html` are at the bottom of `<body>`, but if `i18n.js` is added in `<head>` (for early load), the DOM is not ready.
**How to avoid:** Load `i18n.js` in the same script block order as other modules (bottom of `<body>`), and call `applyToDOM()` inside `DOMContentLoaded`. Alternatively, make `applyToDOM()` idempotent and call it both at init and on language switch.
**Warning signs:** Static labels remain in English after page load.

### Pitfall 5: Admin panel runs in a separate page context
**What goes wrong:** `window.i18n` is not available in `public/admin/index.html` because `i18n.js` is only loaded in `app.html`.
**Why it happens:** The admin panel is a completely separate HTML page with its own `<script>` loading (`js/admin.js` only).
**How to avoid:** Add `<script src="js/i18n.js"></script>` to `admin/index.html` before `admin.js`. The i18n module must load its JSON files via `fetch()` using a relative path that works from both page contexts — `js/i18n/nl.json` works from both `app.html` and `admin/index.html` because both pages have `<base href="/genealogy-viz/">`.
**Warning signs:** Admin panel labels never translate.

### Pitfall 6: Relationship direction ambiguity
**What goes wrong:** The algorithm cannot tell whether person A is the ancestor or descendant of person B when path consists entirely of parent-child hops.
**Why it happens:** `shortestPath()` BFS is undirected. The returned path goes from A to B but link direction (source=parent, target=child) must be checked to determine which direction the path travels.
**How to avoid:** For each consecutive pair `(path[i], path[i+1])`, look up the link and check if `linkEndId(link.source) === path[i]` (meaning path[i] is the parent, travelling downward) or `linkEndId(link.target) === path[i]` (meaning path[i] is the child, travelling upward). Count upward vs downward hops to determine net direction.
**Warning signs:** Ancestor and descendant labels are swapped.

---

## Code Examples

### Relationship Classification Algorithm

```javascript
// Source: derived from overlap-logic.js link traversal patterns + CONTEXT.md D-12
// File: public/js/rel-path.js

function linkEndId(end) {
  if (end == null) return '';
  if (typeof end === 'object') return String(end.id ?? '');
  return String(end);
}

function classifyRelationship(path, graphData) {
  // path: array of node id strings, length >= 2
  if (path.length === 0) return null;
  if (path.length === 2) {
    const link = getLinkBetween(graphData, path[0], path[1]);
    if (!link) return { type: 'unknown', hops: 1 };
    if (link.type === 'parent-child') {
      const isAncestor = linkEndId(link.target) === path[1];
      return { type: isAncestor ? 'ancestor' : 'descendant', hops: 1 };
    }
    if (link.type === 'spouse') return { type: 'spouse', hops: 1 };
  }

  let upHops = 0, downHops = 0, spouseHops = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const link = getLinkBetween(graphData, path[i], path[i + 1]);
    if (!link) { return { type: 'complex', hops: path.length - 1 }; }
    if (link.type === 'spouse') { spouseHops++; }
    else if (link.type === 'parent-child') {
      // source=parent, target=child
      if (linkEndId(link.target) === path[i + 1]) downHops++;  // going down (A is ancestor)
      else upHops++;                                             // going up (A is descendant)
    }
  }

  const totalHops = path.length - 1;
  if (spouseHops > 0) return { type: 'inlaw', hops: totalHops };
  if (upHops === 0 && downHops > 0) return { type: 'ancestor', hops: downHops };
  if (downHops === 0 && upHops > 0) return { type: 'descendant', hops: upHops };
  return { type: 'complex', hops: totalHops };
}

function formatRelLabel(result, t) {
  if (!result) return t('rel_no_path');
  switch (result.type) {
    case 'ancestor':   return t('rel_ancestor').replace('{n}', result.hops);
    case 'descendant': return t('rel_descendant').replace('{n}', result.hops);
    case 'spouse':     return t('rel_spouse');
    case 'inlaw':      return t('rel_inlaw').replace('{n}', result.hops);
    default:           return t('rel_complex').replace('{n}', result.hops);
  }
}

window.RelPath = { classifyRelationship, formatRelLabel };
```

### i18n Module Skeleton

```javascript
// Source: [ASSUMED] standard vanilla-JS i18n pattern; window.X module pattern [VERIFIED: viz.js]
// File: public/js/i18n.js
'use strict';
window.i18n = (function () {
  let lang = 'nl';
  const cache = {};

  async function loadLang(l) {
    if (!cache[l]) {
      const res = await fetch(`js/i18n/${l}.json`);
      cache[l] = await res.json();
    }
  }

  async function init() {
    const stored = localStorage.getItem('lang');
    lang = stored || 'nl';
    await loadLang('nl');  // always load nl as fallback
    if (lang !== 'nl') await loadLang(lang);
    applyToDOM();
  }

  function t(key) {
    return (cache[lang] && cache[lang][key]) || (cache['nl'] && cache['nl'][key]) || key;
  }

  async function setLang(l) {
    await loadLang(l);
    lang = l;
    localStorage.setItem('lang', l);
    applyToDOM();
    // Caller (viz.js, side-panel.js) must also re-render dynamic sections
  }

  function toggleLang() {
    setLang(lang === 'nl' ? 'en' : 'nl');
  }

  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  return { init, t, setLang, toggleLang, applyToDOM, getLang: () => lang };
})();
```

### Clustering Level Computation

```javascript
// Source: [ASSUMED] three.js camera distance pattern; OrbitControls API [ASSUMED]
// The graph.controls() returning OrbitControls is ASSUMED — verify in ForceGraph3D docs
// File: public/js/clustering.js

const THRESHOLD_CENTURY = 1200;   // camera distance units — tune empirically
const THRESHOLD_SURNAME = 500;

let clusterLevel = 'persons';     // 'century' | 'surname' | 'persons'
let clusterLocked = false;
let rawGraphData = null;

function buildClusteredData(level, graphData) {
  if (level === 'persons') return graphData;

  if (level === 'century') {
    // Group nodes by century; return one synthetic node per century group
    const groups = {};
    for (const n of graphData.nodes) {
      const c = n.birthYear ? Math.floor(n.birthYear / 100) * 100 : 'unknown';
      if (!groups[c]) groups[c] = { century: c, members: [] };
      groups[c].members.push(n);
    }
    const clusterNodes = Object.values(groups).map(g => ({
      id: `__cluster_century_${g.century}`,
      name: g.century === 'unknown' ? '?' : String(g.century),
      _isCluster: true,
      _level: 'century',
      _members: g.members.map(n => n.id),
      _radius: Math.sqrt(g.members.length) * 8,
      _color: '#1e3a5f',
      // Position at centroid of member nodes (if already simulated)
      x: avg(g.members.map(n => n.x || 0)),
      y: avg(g.members.map(n => n.y || 0)),
      z: avg(g.members.map(n => n.z || 0)),
    }));
    return { nodes: clusterNodes, links: [] };
  }

  // 'surname' level: group within rough century zones by surname
  // ... similar logic
}

function avg(arr) { return arr.reduce((s, v) => s + v, 0) / (arr.length || 1); }

window.Clustering = { buildClusteredData, THRESHOLD_CENTURY, THRESHOLD_SURNAME };
```

---

## Runtime State Inventory

This is not a rename/refactor phase. No runtime state inventory required.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Three.js 0.160.0 | Cluster bubble rendering | ✓ (CDN, already in app.html) | 0.160.0 | — |
| 3d-force-graph 1.73.0 | `graph.controls()`, `cameraPosition()` | ✓ (CDN, already in app.html) | 1.73.0 | — |
| localStorage | Language preference | ✓ (browser native, no existing usage confirmed) | — | Fall back to session-only (in-memory lang variable) |
| Node.js / Express | Serve new JSON files | ✓ (existing server) | — | — |

**Missing dependencies with no fallback:** None.

**Step 2.6: No new external tool dependencies. All required capabilities are already in the loaded CDN libraries and browser APIs.**

---

## Validation Architecture

`nyquist_validation` key is absent from `config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no `jest.config.*`, `vitest.config.*`, `pytest.ini`, or `test/` directory found |
| Config file | None — Wave 0 gap |
| Quick run command | TBD — Wave 0 must establish |
| Full suite command | TBD — Wave 0 must establish |

The project has no existing test infrastructure. Phase 3 is a vanilla-JS browser application; the most practical test approach is either:
1. A lightweight Node.js test script using the pure-function modules (`overlap-logic.js`, `rel-path.js`, `i18n.js`) which have no DOM dependencies.
2. Browser smoke tests (manual or Playwright).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TBD-01 | Clustering level returns correct synthetic nodes | unit | `node tests/test-clustering.js` | ❌ Wave 0 |
| TBD-02 | i18n `t()` returns Dutch string by default, English as fallback | unit | `node tests/test-i18n.js` | ❌ Wave 0 |
| TBD-03 | `classifyRelationship()` returns correct type for ancestor, descendant, inlaw, complex paths | unit | `node tests/test-rel-path.js` | ❌ Wave 0 |
| TBD-04 | Language toggle persists in localStorage | manual/smoke | — | manual only |
| TBD-05 | Cluster bubble appears in 3D scene at correct zoom level | manual/smoke | — | manual only |

### Sampling Rate
- **Per task commit:** `node tests/test-rel-path.js && node tests/test-i18n.js`
- **Per wave merge:** All unit test scripts
- **Phase gate:** All unit tests green + manual smoke of clustering and i18n in browser

### Wave 0 Gaps
- [ ] `tests/test-clustering.js` — pure-function unit tests for `buildClusteredData()`
- [ ] `tests/test-i18n.js` — unit tests for `t()`, fallback, key lookup
- [ ] `tests/test-rel-path.js` — unit tests for `classifyRelationship()` with mock graphData

---

## Security Domain

Phase 3 adds no new server endpoints, no new user input surfaces, and no new authentication flows. All new code is client-side read-only visualisation and UI text.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | partial | JSON files loaded via fetch — no user-supplied content; no new input fields added |
| V6 Cryptography | no | — |

**Only risk worth noting:** The i18n JSON files are fetched via relative `fetch()` URLs. If an attacker could substitute the JSON files (requires server compromise), they could inject arbitrary text into the UI. This is not a Phase 3 concern — server security is a Phase 1 concern already addressed.

The existing `escHtml()` function in `side-panel.js` must continue to be used for all dynamic text inserted into `innerHTML`, including the relationship label string (which may contain a generated number). [VERIFIED: side-panel.js line 281]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual string concatenation for i18n | JSON key-value files + `t(key)` | N/A (new feature) | Enables language switching without page reload |
| No clustering — all nodes visible at all zoom levels | Zoom-based hierarchical clusters | N/A (new feature) | Reduces render load and visual clutter for large trees |

**Deprecated/outdated:**
- Nothing in the current codebase is being deprecated. Phase 3 only adds to existing modules.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `graph.controls()` returns an OrbitControls instance with a `change` event | Architecture Patterns (Pattern 5), Code Examples | If ForceGraph3D wraps OrbitControls without exposing `addEventListener`, the auto-cluster zoom detection needs a different hook (e.g., polling `graph.camera().position` in `requestAnimationFrame`). Mitigation: fall back to polling. |
| A2 | ForceGraph3D synthetic cluster nodes with `_isCluster` flag and custom `id` participate correctly in `onNodeClick` | Architecture Patterns (Pattern 3) | If ForceGraph3D filters out non-standard node fields or requires specific node schema, click events on cluster nodes may not fire. Mitigation: verify by adding a test cluster node in development. |
| A3 | i18n JSON files served from `js/i18n/nl.json` are accessible via `fetch()` from both `app.html` and `admin/index.html` using the shared `<base href="/genealogy-viz/">` tag | Architecture Patterns (Pattern 6), Common Pitfalls 5 | If the Express static middleware doesn't serve subdirectories of `public/js/`, the fetch will 404. Mitigation: verify that `express.static('public')` (or equivalent) is configured. |

---

## Open Questions

1. **Does `graph.controls()` exist on ForceGraph3D 1.73?**
   - What we know: ForceGraph3D uses `OrbitControls` internally and exposes a `graph.controls()` method in its documented API.
   - What's unclear: The exact method name in version 1.73 — some versions use `graph.controls()`, others require accessing `graph.renderer().domElement`.
   - Recommendation: The implementation task should start with a `console.log(Object.keys(graph))` to confirm available methods before wiring the camera change listener.

2. **How does ForceGraph3D handle concurrent `graph.graphData()` calls during force simulation?**
   - What we know: Force simulation is async and runs in requestAnimationFrame.
   - What's unclear: Whether calling `graph.graphData()` mid-simulation causes visual glitches or resets node positions stored in the objects.
   - Recommendation: Preserve node `x/y/z` positions across graphData swaps by copying them from `window.graphData.nodes` into synthetic cluster node centroid calculations before each swap. Keep positions as source-of-truth in the raw data.

---

## Sources

### Primary (HIGH confidence)
- `public/js/viz.js` — full source read; Three.js patterns, ForceGraph3D API usage, century plane sprite pattern confirmed
- `public/js/overlap-logic.js` — full source read; `shortestPath()` algorithm, `linkEndId()` helper, link structure confirmed
- `public/js/side-panel.js` — full source read; `renderTwoPersonMode()` integration point confirmed at line 120+
- `public/js/colour-modes.js` — full source read; `window.X` module pattern, `buildSurnamePalette()` reuse confirmed
- `public/js/i18n/` — does not exist yet; clean slate confirmed
- `public/app.html` — full source read; toolbar structure, script load order, Three.js + 3d-force-graph CDN versions confirmed
- `public/admin/index.html` — full source read; static strings identified; separate page context confirmed
- `server/api/graph.js` — full source read; link shape (`{id, source, target, type}`) confirmed
- `public/css/app.css` — full source read; existing CSS classes, spacing, colour tokens confirmed
- `.planning/phases/03-.../03-CONTEXT.md` — decisions D-01 through D-13 read
- `.planning/phases/03-.../03-UI-SPEC.md` — full UI contract read

### Secondary (MEDIUM confidence)
- ForceGraph3D 1.73 API — `graph.cameraPosition()`, `graph.controls()`, `graph.nodeThreeObject()`, `graph.graphData()` inferred from usage in `viz.js` and `flyToNode()` — [ASSUMED for `controls()` specifically; all others VERIFIED from live code]

### Tertiary (LOW confidence)
- OrbitControls `change` event — A1 in Assumptions Log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — libraries confirmed from live app.html; no new deps needed
- Architecture patterns: HIGH for established patterns (sprite labels, window.X module); MEDIUM for cluster node integration (A1, A2 assumptions)
- Pitfalls: HIGH — derived directly from reading the live source code and understanding ForceGraph3D mutation behaviour
- Relationship algorithm: HIGH — link types confirmed (`parent-child`, `spouse`); `linkEndId` private function gap confirmed

**Research date:** 2026-04-08
**Valid until:** 2026-07-08 (Three.js and 3d-force-graph on CDN at pinned versions — stable)
