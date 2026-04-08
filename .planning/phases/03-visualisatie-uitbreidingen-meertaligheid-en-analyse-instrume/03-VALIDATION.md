---
phase: 3
slug: visualisatie-uitbreidingen-meertaligheid-en-analyse-instrume
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | browser manual + CLI smoke tests (vanilla JS, no test framework currently) |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | `open public/app.html` (browser smoke) |
| **Full suite command** | `open public/app.html && open public/admin/index.html` |
| **Estimated runtime** | ~30 seconds manual verification |

---

## Sampling Rate

- **After every task commit:** Run `open public/app.html`
- **After every plan wave:** Run full browser smoke across both pages
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-xx-xx | TBD | TBD | TBD | — | N/A | manual | browser smoke | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify `public/app.html` loads without console errors before each wave
- [ ] Verify `public/admin/index.html` loads without console errors before each wave

*Planner should fill per-task rows from PLAN.md tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| i18n language switch | Multilingual support | Browser-only UI interaction | Switch language via UI, verify all labels update |
| 3D clustering visual | Clustering by century/birthplace | Visual inspection required | Enable clustering, verify nodes group correctly |
| Relationship path display | Path analysis | Visual + data inspection | Select two nodes, verify path + relationship names shown |
| Camera bookmark restore | UX feature | Browser state + visual | Save bookmark, reload, verify camera position restores |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
