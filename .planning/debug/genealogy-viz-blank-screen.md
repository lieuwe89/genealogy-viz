---
status: diagnosed
trigger: "App at localhost:3000 shows dark screen, three buttons top-left, small text at bottom — but no network/graph visualisation renders. Console has errors. App has never worked."
created: 2026-04-07T00:00:00Z
updated: 2026-04-07T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — empty database is the primary cause; secondary cause is /admin/* wildcard route swallowing /admin/session before auth middleware can serve it
test: verified via sqlite3 CLI query and route order analysis
expecting: n/a — diagnosis complete
next_action: return ROOT CAUSE FOUND to caller

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: A genealogy network visualisation should render in the main viewport
actual: Dark screen with three buttons top-left and small text at the bottom. No graph/network visible.
errors: Console errors present (content unknown — need to read code to infer)
reproduction: Visit http://localhost:3000
started: Never worked — fresh setup

## Eliminated

- hypothesis: CDN script for 3d-force-graph fails to load
  evidence: curl HEAD to https://unpkg.com/3d-force-graph@1.73.0/dist/3d-force-graph.min.js returns HTTP 200
  timestamp: 2026-04-07T00:01:00Z

- hypothesis: ForceGraph3D constructor API mismatch with library version
  evidence: The CDN URL resolves correctly; the `ForceGraph3D({ controlType: 'orbit' })(element)` chained constructor pattern is the correct API for this library version
  timestamp: 2026-04-07T00:01:00Z

- hypothesis: colour-modes.js or side-panel.js missing / broken in isolation
  evidence: Both files read completely; they are syntactically valid and expose globals via window.ColorModes / window.openPanel correctly. No self-referencing errors.
  timestamp: 2026-04-07T00:01:00Z

## Evidence

- timestamp: 2026-04-07T00:00:30Z
  checked: package.json
  found: No frontend bundler or build step — plain Node/Express serving static files from /public. No visualisation library in npm deps.
  implication: Library must come from CDN; if CDN is unavailable, ForceGraph3D is undefined at runtime.

- timestamp: 2026-04-07T00:00:45Z
  checked: public/index.html
  found: CDN script tag `<script src="https://unpkg.com/3d-force-graph@1.73.0/dist/3d-force-graph.min.js">` loaded synchronously before viz.js. All three local JS files loaded in correct dependency order (colour-modes → side-panel → viz).
  implication: Script load order is correct. CDN availability is the only network-level risk.

- timestamp: 2026-04-07T00:00:50Z
  checked: public/js/viz.js
  found: initViz() calls fetch('/api/graph'), uses graphData.nodes to build graph, then calls ForceGraph3D()(element).graphData(graphData). If nodes/links arrays are both empty the graph renders nothing (no nodes = invisible canvas).
  implication: Empty database → empty API response → ForceGraph3D renders a blank 3D canvas with no nodes → dark screen. This matches exactly the reported symptom.

- timestamp: 2026-04-07T00:00:55Z
  checked: data/genealogy.db via sqlite3 CLI
  found: SELECT COUNT(*) FROM persons → 0. SELECT COUNT(*) FROM relationships → 0. Tables exist but contain no data.
  implication: CONFIRMED primary cause. The API returns { nodes: [], links: [] }. ForceGraph3D initialises successfully but renders nothing because there is no graph data.

- timestamp: 2026-04-07T00:01:00Z
  checked: server/index.js route registration order (lines 32–57)
  found: `/api/graph` and `/api/persons` routes registered before the catch-all `app.get('/admin*', ...)` at line 55. BUT `/admin/session` (GET, defined inside mountAuth at line 29 of auth.js) is registered via `mountAuth(app)` at line 30 of index.js, which runs BEFORE the `/admin*` wildcard. So /admin/session IS reachable.
  implication: Route ordering is NOT a bug — /admin/session is registered before the wildcard. This eliminates a secondary suspect.

- timestamp: 2026-04-07T00:01:05Z
  checked: better-sqlite3 native module vs Node version
  found: better-sqlite3 compiled against NODE_MODULE_VERSION 137; running Node requires MODULE_VERSION 141. `npm rebuild` or `npm install` required before server can start at all.
  implication: If the developer has not run `npm rebuild` against the current Node version, the server crashes on startup with ERR_DLOPEN_FAILED and never responds to any request. This would also cause the blank screen, but via a different path — the server simply isn't running.

## Resolution

root_cause: TWO layered causes — one prevents the server from starting, one prevents the graph from showing data even when the server runs:
  1. (Startup blocker) better-sqlite3 native addon is compiled for a different Node.js version (NODE_MODULE_VERSION 137 vs 141 required). The server crashes immediately on `require('better-sqlite3')`. Without `npm rebuild`, the app never responds.
  2. (Empty graph — visible once server runs) The database has zero persons and zero relationships. /api/graph returns { nodes: [], links: [] }. ForceGraph3D initialises and renders a valid but invisible 3D scene — dark canvas, no nodes, no edges. This matches the "three buttons, dark screen, no graph" symptom exactly.
fix: (not applied — diagnose-only mode)
  Step 1: cd genealogy-viz && npm rebuild   (recompiles better-sqlite3 for current Node)
  Step 2: Import a GEDCOM or XML file via /admin to populate the database, OR manually insert test data.
verification:
files_changed: []
