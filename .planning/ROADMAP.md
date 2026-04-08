# Genealogy Viz — Roadmap

## Milestone 1: Core Visualisation & Deployment

**Goal:** 3D genealogical network visualiser with authentication, deployment, and foundational interactive features.

**Status:** Active

### Phase 1 — Foundation & Deployment ✓
- Goal: Initial 3D viz, admin panel, and CI/CD to Fly.io
- Status: Complete

### Phase 2 — Overlap & Timeline Features ✓
- Goal: Lifespan overlap logic, colour modes, two-person comparison, timeline side panel
- Status: Complete


### Phase 3: Visualisatie-uitbreidingen, meertaligheid en analyse-instrumenten

**Goal:** Extend the 3D genealogy visualiser with hierarchical node clustering, full Dutch/English i18n framework, and named relationship path analysis in the side panel.
**Requirements:** [I18N-01, I18N-02, REL-01, REL-02, CLU-01, CLU-02, CLU-03]
**Depends on:** Phase 2
**Plans:** 5 plans

Plans:
- [ ] 03-01-PLAN.md — i18n framework module, translation JSON files, and language toggle
- [ ] 03-02-PLAN.md — Relationship path classification algorithm (pure logic + tests)
- [ ] 03-03-PLAN.md — i18n integration across all UI + relationship label in side panel
- [ ] 03-04-PLAN.md — Hierarchical node clustering with zoom-based auto-switching and toolbar controls
- [ ] 03-05-PLAN.md — Visual and functional verification of all Phase 3 features
