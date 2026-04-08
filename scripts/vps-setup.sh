#!/usr/bin/env bash
# One-time VPS setup for genealogy-viz / playground.lieuwejongsma.nl
# Run this once via SSH: bash vps-setup.sh
set -e

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/playground/genealogy-viz}"
DATA_PATH="${DATA_PATH:-/var/www/playground/data}"
DOMAIN="playground.lieuwejongsma.nl"
APP_PORT=3000

echo "==> Installing Node.js 22 via nvm..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
  nvm install 22
  nvm alias default 22
else
  echo "    Node.js already installed: $(node --version)"
fi

echo "==> Installing PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | bash || true
fi

echo "==> Creating directories..."
mkdir -p "$DEPLOY_PATH" "$DATA_PATH"

echo "==> Creating .env (edit ADMIN_PASSWORD and SESSION_SECRET before first deploy)..."
ENV_FILE="$DEPLOY_PATH/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
PORT=$APP_PORT
DB_PATH=$DATA_PATH/genealogy.db
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=changeme
EOF
  echo "    Created $ENV_FILE — set ADMIN_PASSWORD before running the app."
else
  echo "    .env already exists, skipping."
fi

echo "==> Writing Nginx vhost for $DOMAIN..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "==> Done. Next steps:"
echo "    1. Edit $ENV_FILE and set ADMIN_PASSWORD"
echo "    2. Add these GitHub Secrets to lieuwe89/genealogy-viz:"
echo "         SSH_PRIVATE_KEY   (same key as wp-deploy-pipeline)"
echo "         VPS_HOST          (same as wp-deploy-pipeline)"
echo "         VPS_USER          (same as wp-deploy-pipeline)"
echo "         DEPLOY_PATH_PLAYGROUND = $DEPLOY_PATH"
echo "    3. In Plesk: create subdomain $DOMAIN and enable Let's Encrypt SSL"
echo "    4. Push to main — GitHub Actions will deploy and start the app"
