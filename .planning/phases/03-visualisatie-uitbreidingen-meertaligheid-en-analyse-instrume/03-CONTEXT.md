# Phase 3: Visualisatie-uitbreidingen, meertaligheid en analyse-instrumenten - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the existing 3D genealogy visualiser with three capabilities built on top of the Phase 2 foundation:
1. Hierarchical node clustering — reduce visual clutter in large trees
2. Full i18n framework — Dutch/English UI toggle
3. Relationship path analysis — named relationship chains in the side panel

Phase 1 (foundation, import, auth, deployment) and Phase 2 (overlap logic, colour modes, two-person comparison, century planes) are complete and must not be broken.

</domain>

<decisions>
## Implementation Decisions

### Visualisatie-uitbreidingen: Node Clustering
- **D-01:** Hierarchical clustering with two levels of control: zoom-based (automatic) AND a manual toggle/slider in the toolbar.
- **D-02:** Clustering hierarchy: zoomed out far → century bubbles; medium zoom → surname clusters within centuries; fully zoomed in → individual nodes.
- **D-03:** Clusters are labelled bubbles in the 3D scene. Click on a cluster to expand/zoom into it.
- **D-04:** The manual toggle lets the user lock a clustering level regardless of zoom — useful for navigating large trees without nodes constantly popping in/out.

### Meertaligheid: i18n Framework
- **D-05:** Full i18n framework with language files: `public/js/i18n/nl.json` and `public/js/i18n/en.json`.
- **D-06:** A language toggle button in the toolbar (next to the existing colour mode and overlap buttons).
- **D-07:** Language preference stored in `localStorage` — no server changes required.
- **D-08:** Scope of translation: all visible UI labels — side panel field labels, toolbar button titles, admin panel headings, import page text. Hardcoded English strings in `side-panel.js`, `viz.js`, `admin.js` must all be replaced with i18n keys.
- **D-09:** Default language: Dutch (`nl`). Fallback: English (`en`).

### Analyse-instrumenten: Relatie-paden
- **D-10:** Relationship path analysis extends the existing two-person comparison in the side panel.
- **D-11:** In addition to the existing shortest-path timeline (already shows the node chain), add a **named relationship label** — e.g., "grootouder" / "oomzegger" / "achterneef" — derived from the path structure (parent-child vs spouse link types).
- **D-12:** Relationship naming: traverse the shortest path and classify by hop type: direct parent/child hops → ancestor/descendant labels; spouse hops → in-law qualifiers. Use Dutch terminology by default (subject to i18n).
- **D-13:** Display in the side panel's two-person comparison section, below the existing timeline bar chart.

### Claude's Discretion
- Exact clustering bubble geometry and animation (expand/collapse transition)
- How to handle nodes without a surname in surname clusters (group under "Onbekend")
- The relationship naming algorithm for complex paths (e.g., half-siblings, step-relations) — use best-effort labelling, fall back to "Verwant via N stappen" for unusual chains
- i18n key naming convention within the JSON files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing visualisation code
- `public/js/viz.js` — Main 3D graph setup, ForceGraph3D config, buildNodeObject, century planes
- `public/js/colour-modes.js` — Existing colour mode logic; clustering colour mode should follow the same pattern
- `public/js/overlap-logic.js` — `shortestPath()`, `estimateLifespan()`, `overlapLevel()` — the path algorithm used by the relation-path feature
- `public/js/side-panel.js` — `renderTwoPersonMode()` (lines ~120+): where relation-path display is added
- `public/index.html` — Toolbar structure, existing button layout for i18n toggle placement

### Admin and server
- `server/index.js` — Express app; no new server routes needed for i18n or clustering
- `public/admin/` — Admin panel HTML/JS; needs i18n translation pass

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OverlapLogic.shortestPath(graphData, idA, idB)` — already computes the path; relationship naming builds on top of its output
- `ColorModes.getNodeColor()` — clustering colour mode should extend this pattern (new mode key)
- `ForceGraph3D` node `threeObject` system — cluster bubbles can be rendered as custom THREE objects, same as current sphere nodes
- `localStorage` is already used by nothing in the codebase — clean slate for language preference

### Established Patterns
- All client-side modules use the `window.X = { ... }` pattern (e.g., `window.ColorModes`, `window.OverlapLogic`) — new i18n module should follow this: `window.i18n`
- Toolbar buttons are in `public/index.html` — new clustering slider and language toggle go there
- `side-panel.js` manages all panel HTML via innerHTML string construction — relationship label appends to this pattern

### Integration Points
- Clustering interacts with `graph.nodeThreeObject()` and `graph.graphData()` — cluster aggregation replaces/wraps the raw node list passed to ForceGraph3D
- i18n must patch labels in: `side-panel.js` (renderPanel, renderTwoPersonMode), `viz.js` (toolbar init), `admin.js` (form labels), and any HTML with static text
- Relationship path label is inserted in `renderTwoPersonMode()` in `side-panel.js`, after the existing timeline section

</code_context>

<specifics>
## Specific Ideas

- "Could we do hierarchical clustering?" — Yes: zoom-level-based with a manual override toggle, two tiers (surname and century)
- The relationship naming feature extends what's already there (shortest path timeline) rather than replacing it — add the named label below the existing bar chart

</specifics>

<deferred>
## Deferred Ideas

- Search/filter nodes by name, role, or year range — noted, not in this phase
- Graph PNG/SVG export — noted, not in this phase
- Generation colour mode — noted, not in this phase
- Family statistics dashboard (surname distribution, average lifespan) — noted, not in this phase
- Ancestor/descendant counter — noted, not in this phase
- Data export to CSV/JSON — noted, not in this phase
- Additional languages beyond Dutch and English — framework built to support it but not in scope now

None — discussion stayed within the three named phase themes.

</deferred>

---

*Phase: 03-visualisatie-uitbreidingen-meertaligheid-en-analyse-instrume*
*Context gathered: 2026-04-08*
