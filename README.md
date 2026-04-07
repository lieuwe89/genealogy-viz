# Genealogy Network Visualiser

A self-hosted 3D web app for exploring family trees as interactive networks. Nodes are positioned by family proximity on the X/Y plane and birth year on the Z axis, so the graph doubles as a timeline.

> **Screenshot / demo** — drop a GIF or image here once you have one.

## Features

- **3D force-graph** — X/Y = family proximity, Z = birth year, giving every generation its own depth layer
- **Three colour modes** — colour nodes by role (e.g. royalty vs commoner), surname family, or biological sex
- **Side panel** — click any node for a full info card: vitals, roles, relationships, and freeform annotations with optional links
- **Import pipeline** — accepts GEDCOM 5.5 (exported from most genealogy apps), GRAMPS XML (native Gramps export), and generic XML with a custom field mapping
- **Admin CRM** — add, edit, and delete persons and relationships directly in the browser
- **Session auth** — password-protected admin interface; the public graph view requires no login

## Quick start

```bash
git clone https://github.com/lieuwejongsma/genealogy-viz
cd genealogy-viz
npm install
cp .env.example .env
# Edit .env: set ADMIN_PASSWORD and SESSION_SECRET
npm start
```

Open `http://localhost:3000`. Log in at `http://localhost:3000/admin` to import your data file.

## Data formats

| Format | Extension | Notes |
|---|---|---|
| GEDCOM 5.5 | `.ged` | Export from most genealogy apps (Gramps, MacFamilyTree, Ancestry…) |
| GRAMPS XML | `.gramps` | Native export from [Gramps](https://gramps-project.org) |
| Generic XML | `.xml` | Requires a JSON field mapping (shown in the import page) |

## Project structure

```
genealogy-viz/
├── server/
│   ├── api/          # REST endpoints — persons, relationships, annotations, graph
│   ├── import/       # GEDCOM, GRAMPS XML, and generic XML parsers + normaliser
│   ├── auth.js       # Session-based admin authentication
│   ├── db.js         # SQLite connection and schema bootstrap
│   └── index.js      # Express app entry point
├── public/
│   ├── js/           # 3D visualisation, colour modes, side panel, admin CRM
│   ├── css/          # Styles
│   ├── index.html    # Public graph view
│   └── admin/        # Admin CRM page
├── tests/            # Jest tests — import parsers and API routes
└── data/             # SQLite database (gitignored)
```

## Tech stack

| Layer | Technology |
|---|---|
| Server | Node.js, Express |
| Database | SQLite via better-sqlite3 |
| 3D graph | 3d-force-graph (Three.js) |
| Sessions | express-session |
| File uploads | multer |
| Tests | Jest |

## Deployment (VPS + nginx)

1. Copy files to your VPS:
   ```bash
   rsync -avz --exclude node_modules --exclude 'data/*.db' ./ user@yourserver:/var/www/genealogy-viz/
   ```

2. On the server:
   ```bash
   cd /var/www/genealogy-viz && npm install --omit=dev
   ```

3. Run with a process manager:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name genealogy-viz
   pm2 save
   ```

4. Nginx config (`/etc/nginx/sites-available/genealogy`):
   ```nginx
   location /genealogy/ {
     proxy_pass http://127.0.0.1:3000/;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection 'upgrade';
     proxy_set_header Host $host;
     proxy_cache_bypass $http_upgrade;
   }
   ```
   Then `sudo nginx -t && sudo systemctl reload nginx`.

5. Set `SESSION_SECRET` and `ADMIN_PASSWORD` in `/var/www/genealogy-viz/.env`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `SESSION_SECRET` | `dev-secret` | **Change in production** |
| `ADMIN_PASSWORD` | `changeme` | **Change before deploying** |
| `DB_PATH` | `./data/genealogy.db` | SQLite database path |
