---
phase: 03-visualisatie-uitbreidingen-meertaligheid-en-analyse-instrume
plan: "02"
subsystem: ui
tags: [vanilla-js, relationship-path, genealogy, graph-traversal, unit-tests]

# Dependency graph
requires:
  - phase: 03-visualisatie-uitbreidingen-meertaligheid-en-analyse-instrume
    provides: overlap-logic.js shortestPath() returns node-ID array; link types confirmed as parent-child and spouse

provides:
  - window.RelPath module with classifyRelationship() and formatRelLabel()
  - Unit test suite at tests/test-rel-path.js (9 test cases, 12 assertions)

affects:
  - 03-04 (side-panel integration of relationship label)
  - 03-03 (i18n — formatRelLabel uses t() function from i18n module)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "window.X IIFE module pattern — rel-path.js follows colour-modes.js and overlap-logic.js"
    - "TDD with Node.js plain scripts — no test framework, run with node tests/test-*.js"
    - "linkEndId() duplication — private helper in overlap-logic.js must be inlined in rel-path.js"

key-files:
  created:
    - public/js/rel-path.js
    - tests/test-rel-path.js
  modified: []

key-decisions:
  - "Duplicate linkEndId() helper in rel-path.js — it is private in overlap-logic.js and not exported on window.OverlapLogic"
  - "Pure spouse path classified as 'spouse', not 'inlaw' — inlaw requires parent-child hops combined with a spouse hop"
  - "No DOM dependencies — module is pure logic enabling Node.js unit testing"

patterns-established:
  - "TDD with Node.js: write tests/test-*.js as plain Node.js scripts with global.window mock, require module, run with node"

requirements-completed: [REL-01]

# Metrics
duration: 12min
completed: 2026-04-08
---

# Phase 03 Plan 02: RelPath Module Summary

**Pure-logic relationship path classifier (ancestor/descendant/spouse/inlaw/complex) with i18n-ready label formatter, backed by 9 TDD unit tests**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08
- **Tasks:** 1 (TDD — 2 commits: test RED + feat GREEN)
- **Files modified:** 2

## Accomplishments
- `window.RelPath.classifyRelationship(path, graphData)` — traverses shortest-path node-ID array, classifies relationship as ancestor, descendant, spouse, inlaw, or complex using link type and directionality
- `window.RelPath.formatRelLabel(result, t)` — formats human-readable label using caller-supplied i18n `t()` function; supports `{n}` hop-count substitution
- Handles ForceGraph3D's link mutation (source/target become node objects) via duplicated `linkEndId()` helper
- All 9 test cases pass (12 assertions)

## Task Commits

TDD execution — two commits per the RED/GREEN cycle:

1. **Task 1 (RED): Add failing tests** - `e67f325` (test)
2. **Task 1 (GREEN): Implement RelPath module** - `8a9e336` (feat)

## Files Created/Modified
- `public/js/rel-path.js` — window.RelPath IIFE module; classifyRelationship, formatRelLabel, linkEndId (private), getLinkBetween (private)
- `tests/test-rel-path.js` — Node.js unit tests; mocks window global, tests all 6 relationship types plus edge cases

## Decisions Made
- **linkEndId() duplicated:** The helper is a private function in overlap-logic.js and is not exported on window.OverlapLogic. Duplicating the 3-line function is the correct approach (per RESEARCH.md Pitfall 1).
- **Pure spouse = 'spouse', not 'inlaw':** The initial implementation returned 'inlaw' for any path containing a spouse hop. Fixed during GREEN phase: only return 'inlaw' when there are parent-child hops AND spouse hops combined. A direct spouse (all spouse hops) returns 'spouse'.
- **No DOM dependencies:** Module is intentionally pure logic for Node.js testability. The `window.RelPath` assignment is the only reference to `window`, which is fine since `global.window = {}` in the test harness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed spouse/inlaw classification boundary**
- **Found during:** Task 1 GREEN phase (first test run)
- **Issue:** `spouseHops > 0` check returned 'inlaw' for a direct spouse link (single-hop, pure spouse path). Test 4 failed.
- **Fix:** Added condition `upHops === 0 && downHops === 0` guard: pure spouse paths return 'spouse'; mixed parent-child + spouse returns 'inlaw'.
- **Files modified:** public/js/rel-path.js
- **Verification:** `node tests/test-rel-path.js` → 12 passed, 0 failed
- **Committed in:** `8a9e336` (Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minor logic correction during GREEN phase. No scope creep.

## Issues Encountered
- Worktree had uncommitted planning files staged from the `git reset --soft` to the correct base commit. The test file commit included deletion of .planning files from the worktree (they live in the main repo at `/genealogy-viz/.planning/` and are not tracked in the worktree's branch). Planning data is intact in the main repo.

## Known Stubs
None — module is fully implemented. formatRelLabel returns real keys; no hardcoded placeholders.

## Threat Flags
None — rel-path.js is pure client-side logic with no new network surface, auth paths, or file access patterns.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `window.RelPath` is ready for integration into side-panel.js (03-04 plan)
- `formatRelLabel` expects a `t()` function — integration requires i18n module (03-03 plan) to supply it
- Module has no DOM dependencies and is Node.js testable — test suite can be expanded

---
*Phase: 03-visualisatie-uitbreidingen-meertaligheid-en-analyse-instrume*
*Completed: 2026-04-08*

## Self-Check: PASSED

- FOUND: public/js/rel-path.js
- FOUND: tests/test-rel-path.js
- FOUND: commit e67f325 (test RED)
- FOUND: commit 8a9e336 (feat GREEN)
- Tests: 12 passed, 0 failed
