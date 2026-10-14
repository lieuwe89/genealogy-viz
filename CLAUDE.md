# CLAUDE.md — genealogy-viz

Self-hosted 3D family tree visualiser: nodes placed by family proximity (X/Y) and birth year (Z). Deployed to the VPS behind nginx. General-purpose showcase: no dataset-specific code. The slavernij network moved to `groningen-slavernij` (slavernij-groningen.lieuwejongsma.nl).

**Stack:** Node.js + Express + SQLite (`better-sqlite3`) + 3d-force-graph (Three.js). `npm start` · `npm run dev` (node --watch) · `npm test` (Jest).

Server entry `server/index.js`; parsers for GEDCOM 5.5, GRAMPS XML and generic XML in `server/import/`; REST API in `server/api/`. Public graph `public/index.html`; admin CRM `public/admin/`. Session-based auth (`express-session`).
