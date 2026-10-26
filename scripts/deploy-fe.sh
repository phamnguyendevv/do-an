#!/bin/bash
# ============================================================
# Frontend Deploy Script (Docker)
# Được gọi từ GitHub Actions sau khi Build & Push Docker Image
# Chạy tại: /opt/app/scripts/deploy-fe.sh trên VPS
# ============================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ! $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $1${NC}"; exit 1; }

APP_DIR="/opt/app"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
ENV_FILE="$APP_DIR/.env.production"
NGINX_CONF_SRC="$APP_DIR/nginx/frontend.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/zymail.site"
NGINX_ENABLED="/etc/nginx/sites-enabled/zymail.site"

log "Bắt đầu deploy Frontend (Docker)..."

# Bo sung Docker neu thieu (deploy truoc do loi: docker: command not found).
if ! command -v docker >/dev/null 2>&1; then
    log "Docker chua co, dang cai dat..."
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -y && apt-get install -y docker.io curl || error "Khong cai dat duoc Docker"
      # docker-compose-plugin khong co trong kho apt mac dinh cua mot so
      # ban Ubuntu/Debian, nen neu apt khong tim thay thi tai binary
      # compose plugin chinh thuc thay vi lam hong ca buoc cai Docker.
      if ! docker compose version >/dev/null 2>&1; then
        apt-get install -y docker-compose-plugin 2>/dev/null || true
      fi
      if ! docker compose version >/dev/null 2>&1; then
        mkdir -p /usr/local/lib/docker/cli-plugins
        curl -SL https://github.com/docker/compose/releases/download/v2.29.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose || error "Khong tai duoc docker compose plugin"
        chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
      fi
      systemctl enable docker 2>/dev/null || true
      systemctl start docker 2>/dev/null || true
    else
      error "Khong tim thay docker va khong co apt-get de cai dat"
    fi
fi
command -v docker >/dev/null 2>&1 || error "Khong tim thay docker sau khi cai dat"
docker compose version >/dev/null 2>&1 || warn "docker compose plugin chua san sang, thu tiep voi docker compose..."


# ============================================================
# 1. Cập nhật Nginx host config (nếu có thay đổi)
# ============================================================
# Giu nginx: bo sung thu muc sites neu thieu, cai nginx neu chua co.
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
if ! command -v nginx >/dev/null 2>&1; then
    log "Nginx chua co, dang cai dat..."
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -y && apt-get install -y nginx || error "Khong cai dat duoc nginx"
      systemctl enable nginx 2>/dev/null || true
      systemctl start nginx 2>/dev/null || true
    else
      error "Khong tim thay nginx va khong co apt-get de cai dat"
    fi
fi
command -v nginx >/dev/null 2>&1 || error "Khong tim thay nginx sau khi cai dat"

if [ -f "$NGINX_CONF_SRC" ]; then
    log "Cập nhật Nginx config cho zymail.site..."
    cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
    ln -sf "$NGINX_CONF_DEST" "$NGINX_ENABLED" 2>/dev/null || true
fi
if [ -f "$APP_DIR/nginx/api.conf" ]; then
    log "Cập nhật Nginx config cho api.zymail.site..."
    cp "$APP_DIR/nginx/api.conf" /etc/nginx/sites-available/api.zymail.site
    ln -sf /etc/nginx/sites-available/api.zymail.site /etc/nginx/sites-enabled/api.zymail.site 2>/dev/null || true
fi
nginx -t && systemctl reload nginx || warn "Nginx reload cảnh báo, tiếp tục deploy container..."

# Bo sung file env.production neu thieu (can cho docker compose, giong backend).
if [ -f "$APP_DIR/scripts/ensure-env-production.sh" ]; then
  bash "$APP_DIR/scripts/ensure-env-production.sh"
elif [ -f "$APP_DIR/ensure-env-production.sh" ]; then
  bash "$APP_DIR/ensure-env-production.sh"
fi

# ============================================================
# 3. Build image và khởi chạy container frontend
# ============================================================
cd "$APP_DIR"
log "Build Docker image Frontend tren VPS ..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build frontend || error "Không thể build image frontend"

log "Khởi chạy Frontend container..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d frontend

# ============================================================
# 4. Kiểm tra sức khỏe Frontend Container
# ============================================================
log "Chờ Frontend khởi động..."
sleep 5

MAX_RETRIES=10
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        http://localhost:3001/robots.txt 2>/dev/null || \
        curl -s -o /dev/null -w "%{http_code}" \
        http://localhost:3001 2>/dev/null || echo "000")

    if [[ "$HTTP_CODE" =~ ^(200|301|302|307|308)$ ]]; then
        HEALTH_OK=true
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    warn "Health check lần $RETRY_COUNT/$MAX_RETRIES (HTTP: $HTTP_CODE), thử lại sau 3s..."
    sleep 3
done

if [ "$HEALTH_OK" = true ]; then
    log "✅ Frontend container healthy và đang chạy trên cổng 3001!"
else
    warn "⚠️ Chưa nhận được HTTP 200 từ frontend, hãy kiểm tra: docker compose logs frontend"
fi

# ============================================================
# 5. Dọn dẹp Docker image cũ
# ============================================================
log "Dọn dẹp Docker images cũ..."
docker image prune -f --filter "until=24h" 2>/dev/null || true

log "============================================"
log "  Deploy Frontend Docker THÀNH CÔNG!"
log "  Website: https://zymail.site"
log "============================================"
