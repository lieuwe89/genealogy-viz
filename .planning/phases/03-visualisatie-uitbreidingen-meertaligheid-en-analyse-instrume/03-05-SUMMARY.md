---
plan: 03-05
phase: 03
status: complete
tasks_completed: 2/2
---

# Plan 03-05 Summary: Human Verification Checkpoint

## Verification Results

**Approved by user on 2026-04-08.**

### Feature status after checkpoint:

| Feature | Status | Notes |
|---------|--------|-------|
| Dutch/English language toggle | ✓ Approved | All toolbar + panel labels switch correctly, persists on reload |
| Relationship label in comparison view | ✓ Approved | Named relationship (ancestor/descendant/spouse/in-law) appears below timeline |
| Node clustering | ✗ Removed | User requested removal — feature needs more design thought before reimplementation |
| Compare from graph (new) | ✓ Added | "Compare with another person" button in side panel; clicking activates node-selection mode; next graph click triggers comparison |

### Changes made during checkpoint:

1. **Removed clustering UI** — stripped `clustering.js` script tag, toolbar controls (select + lock button), `applyClusterLevel`, `updateLockButton`, camera listener, and cluster node rendering from viz.js. `.toolbar-select` CSS removed. Core clustering module (`public/js/clustering.js`) and tests retained for potential future use.

2. **Added compare-from-graph selection** — `startCompareSelect()` / `cancelCompareSelect()` functions in side-panel.js expose `window.isSelectingCompare`. In viz.js, `onNodeClick` checks this flag and routes to `openCompare()` instead of `openPanel()`. New i18n keys added: `compare_select_prompt` / `compare_select_cancel`.

## Commits

- `4f35b0e` feat(03-05): remove clustering UI, add compare-from-graph selection
