---
plan: 03-04
phase: 03
status: complete
tasks_completed: 2/2
---

# Plan 03-04 Summary: Node Clustering with Zoom Control

## What Was Built

**Task 1 — Clustering module (TDD)**

`public/js/clustering.js`: `window.Clustering` IIFE with:
- `buildClusteredData(level, graphData, palette)` — groups nodes into century or surname clusters; returns synthetic cluster nodes with `__cluster_century_` / `__cluster_surname_` prefixed IDs (prevents collision with DB integer IDs), `_isCluster: true`, `_radius`, `_color`, `_labelColor`, `_members[]`
- `getAutoLevel(cameraDistance)` — THRESHOLD_CENTURY=1200, THRESHOLD_SURNAME=500
- `init()`, `setLevel()`, `setLocked()`, `isLocked()`, `getLevel()`, `finerLevel()`

`tests/test-clustering.js`: 11 tests green (auto-level thresholds, century grouping into 2 groups, surname grouping, finerLevel transitions, persons passthrough)

**Task 2 — Wired into viz.js + toolbar**

`public/js/viz.js`:
- `currentClusterLevel` state variable
- `Clustering.init(graphData)` called after data load
- `applyClusterLevel(level)` — swaps clustered data into ForceGraph3D, updates toolbar select
- Camera change listener with 200ms debounce (`clearTimeout(clusterDebounceTimer)`) prevents restart loop
- `buildNodeObject` cluster branch: `THREE.SphereGeometry(node._radius)` + canvas label sprite
- `onNodeClick` cluster branch: fly to cluster + switch to finer level + unlock if locked
- `updateLockButton()` — toggles i18n text + `.active` class
- `window.setClusterLevel` / `window.toggleClusterLock` globals
- `langchange` listener updates select options and lock button

`public/app.html`: `clustering.js` script tag added (after i18n.js, before colour-modes.js). Cluster select + lock button added to toolbar.

`public/css/app.css`: `.toolbar-select` class added.

## Key Files

| File | Change |
|------|--------|
| `public/js/clustering.js` | New — full clustering module |
| `tests/test-clustering.js` | New — 11 unit tests |
| `public/js/viz.js` | Camera listener, applyClusterLevel, cluster node rendering |
| `public/app.html` | clustering.js script, cluster toolbar controls |
| `public/css/app.css` | .toolbar-select styles |

## Commits

- `bb06822` feat(03-04): create Clustering module with hierarchical data aggregation
- `1cd912a` feat(03-04): wire clustering into viz — camera auto-level, toolbar controls, cluster bubbles

## Self-Check: PASSED

- ✓ 11 unit tests pass
- ✓ `Clustering.buildClusteredData(` in viz.js
- ✓ `Clustering.getAutoLevel(` in viz.js
- ✓ `clearTimeout(clusterDebounceTimer)` debounce present
- ✓ `node._isCluster` check with `THREE.SphereGeometry(node._radius`
- ✓ `graph.cameraPosition(` with 600ms for cluster click
- ✓ `btn-cluster-lock` and `cluster-level` in app.html
- ✓ `.toolbar-select` in app.css
