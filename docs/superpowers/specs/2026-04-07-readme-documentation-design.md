# Design: README Documentation for genealogy-viz

**Date:** 2026-04-07
**Scope:** Enhance existing README.md for a public GitHub repo (audience: B — public but primarily personal, potential C later)

---

## Goals

- A visitor landing on the repo should immediately understand what it does, what makes it interesting, and how to run it
- No licence, no contributing guide, no issue templates (premature for current scope)
- Screenshot placeholder so a real image can be dropped in without restructuring
- Structure the README so sections can be extended independently as the project grows

## Out of scope

- JSDoc / inline code comments
- `docs/` sub-pages (architecture.md, api.md, etc.)
- `CONTRIBUTING.md`, issue templates, GitHub Actions badges
- Any changes to source code

---

## README structure

### 1. Header
- `# Genealogy Network Visualiser` (title)
- One-sentence description
- `> screenshot/demo placeholder` blockquote

### 2. Features *(new)*
Bulleted list covering:
- 3D force-graph — X/Y = family proximity, Z = birth year timeline
- Three colour modes: role, surname, sex
- Click-to-open side panel with vitals, roles, relationships, annotations
- GEDCOM 5.5, GRAMPS XML, and generic XML import
- Admin CRM: add / edit / delete persons and relationships inline
- Session-based password auth for the admin interface

### 3. Quick start *(existing, unchanged)*
`git clone` → `npm install` → `.env` → `npm start`

### 4. Data formats *(existing, unchanged)*
Table: GEDCOM / GRAMPS XML / Generic XML

### 5. Project structure *(new)*
Annotated directory tree:
```
genealogy-viz/
├── server/
│   ├── api/          # REST endpoints (persons, relationships, annotations, graph)
│   ├── import/       # GEDCOM, GRAMPS XML, generic XML parsers + normaliser
│   ├── auth.js       # Session-based admin auth
│   ├── db.js         # SQLite connection and schema bootstrap
│   └── index.js      # Express app entry point
├── public/
│   ├── js/           # 3D viz, colour modes, side panel, admin CRM
│   ├── css/          # Styles
│   ├── index.html    # Public graph view
│   └── admin/        # Admin CRM page
├── tests/            # Jest tests — import parsers and API routes
└── data/             # SQLite database (gitignored)
```

### 6. Tech stack *(new)*
| Layer | Technology |
|---|---|
| Server | Node.js, Express |
| Database | SQLite via better-sqlite3 |
| 3D graph | 3d-force-graph (Three.js) |
| Sessions | express-session |
| File uploads | multer |
| Tests | Jest |

### 7. Deployment *(existing, unchanged)*
rsync + pm2 + nginx reverse proxy

### 8. Environment variables *(existing, unchanged)*
PORT, SESSION_SECRET, ADMIN_PASSWORD, DB_PATH

---

## Implementation steps

1. Rewrite `README.md` with the structure above, preserving all existing content verbatim in the relevant sections
2. Create the GitHub repo as public: `gh repo create genealogy-viz --public --source=. --remote=origin --push`
3. Push with tags: `git push --tags`
