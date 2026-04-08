---
phase: 03-visualisatie-uitbreidingen-meertaligheid-en-analyse-instrume
plan: 01
subsystem: ui
tags: [i18n, localisation, dutch, english, localstorage, json]

# Dependency graph
requires:
  - phase: 02-overlap-timeline-features
    provides: existing viz.js, toolbar HTML, side-panel.js baseline
provides:
  - window.i18n module with t(), init(), setLang(), toggleLang(), applyToDOM(), getLang()
  - Dutch (nl.json) and English (en.json) translation files with 60 keys
  - Language toggle button in toolbar
  - data-i18n DOM attribute system for all translatable elements
affects:
  - 03-02 (clustering labels will call i18n.t())
  - 03-03 (relationship labels will call i18n.t())
  - 03-04 (side panel i18n integration)
  - 03-05 (admin panel i18n integration)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "window.i18n IIFE module pattern (same as window.ColorModes, window.OverlapLogic)"
    - "data-i18n attribute on DOM elements for automatic label updates via applyToDOM()"
    - "fetch() relative URL (no leading slash) for base-href compatibility"
    - "async DOMContentLoaded inline script in app.html to sequence i18n.init() before initViz()"

key-files:
  created:
    - public/js/i18n.js
    - public/js/i18n/nl.json
    - public/js/i18n/en.json
  modified:
    - public/app.html
    - public/js/viz.js

key-decisions:
  - "fetch URL uses relative path 'js/i18n/'+l+'.json' (no leading slash) to honour <base href='/genealogy-viz/'>"
  - "DOMContentLoaded listener removed from viz.js; moved to inline script in app.html that awaits i18n.init() first"
  - "nl.json is canonical (60 keys); en.json mirrors all keys — verified at test time"
  - "lang_toggle_label shows target language (EN when viewing Dutch, NL when viewing English)"

patterns-established:
  - "i18n pattern: All new UI strings added to both nl.json and en.json; reference via i18n.t(key)"
  - "DOM pattern: Use data-i18n='key' on elements; applyToDOM() updates them on language switch"

requirements-completed: [I18N-01]

# Metrics
duration: 12min
completed: 2026-04-08
---

# Phase 03 Plan 01: i18n Framework and Language Toggle Summary

**IIFE-based window.i18n module with fetch-loaded nl/en JSON files, localStorage persistence, and toolbar language toggle button wired before initViz()**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08T00:12:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `window.i18n` module matching established window.X IIFE pattern with full API: t(), init(), setLang(), toggleLang(), applyToDOM(), getLang()
- Created Dutch (nl.json) and English (en.json) translation files with 60 keys each covering toolbar, side panel, timeline, admin, and clustering labels
- Added language toggle button ("EN"/"NL") to toolbar after the Overlap button
- Wired i18n.init() to run before initViz() using async DOMContentLoaded in app.html; removed duplicate listener from viz.js

## Task Commits

Each task was committed atomically:

1. **Task 1: Create i18n module and translation JSON files** - `e7bf2d4` (feat)
2. **Task 2: Add language toggle button to app.html toolbar and wire i18n init** - `6be3037` (feat)

## Files Created/Modified
- `public/js/i18n.js` - window.i18n IIFE module: t(), init(), setLang(), toggleLang(), applyToDOM(), getLang()
- `public/js/i18n/nl.json` - Dutch translations (60 keys, canonical)
- `public/js/i18n/en.json` - English translations (60 keys, mirrors nl.json)
- `public/app.html` - Added i18n.js script tag, language toggle button, data-i18n attributes on toolbar buttons, inline async init
- `public/js/viz.js` - Removed DOMContentLoaded listener (moved to app.html inline script)

## Decisions Made
- fetch URL uses relative path `'js/i18n/'+l+'.json'` (no leading slash) to honour `<base href="/genealogy-viz/">` — absolute path would break the URL resolution
- DOMContentLoaded listener removed from viz.js and replaced by inline script in app.html that awaits i18n.init() before initViz() to prevent double-init and ensure translations are ready before graph renders
- nl.json is the canonical source; en.json must mirror all keys (verified by automated check: 60 keys both files)
- lang_toggle_label shows the *target* language (EN when viewing in Dutch, NL when viewing in English)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The only notable care point was the relative URL for fetch() to respect `<base href>`, which was explicitly called out in the plan and followed correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `window.i18n` is fully available for all Phase 3 plans to call `i18n.t(key)`
- Both JSON files have forward-looking keys: cluster_*, rel_*, admin_* keys ready for Plans 02-05
- Language toggle button visible in toolbar at `/genealogy-viz/`
- No blockers for Plans 02-05

---
*Phase: 03-visualisatie-uitbreidingen-meertaligheid-en-analyse-instrume*
*Completed: 2026-04-08*
