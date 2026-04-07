# Genealogy Network Visualiser

A 3D web app for exploring genealogical networks. Nodes are positioned by family proximity (X/Y) and birth year (Z). Click any node for a full info card. Supports GEDCOM, GRAMPS XML, and generic XML input.

## Quick start

```bash
git clone <your-repo>
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
