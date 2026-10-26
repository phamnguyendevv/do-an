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

# ============================================================
# 1. Cập nhật Nginx host config (nếu có thay đổi)
# ============================================================
if [ -f "$NGINX_CONF_SRC" ]; then
    log "Cập nhật Nginx config cho zymail.site..."
    cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
    ln -sf "$NGINX_CONF_DEST" "$NGINX_ENABLED" 2>/dev/null || true
    nginx -t && systemctl reload nginx || warn "Nginx reload cảnh báo, tiếp tục deploy container..."
fi

# ============================================================
# 2. Login GitHub Container Registry
# ============================================================
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_ACTOR" ]; then
    log "Đăng nhập GitHub Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin 2>/dev/null || \
        warn "Không thể login ghcr.io, thử pull image công khai..."
fi

# ============================================================
# 3. Pull image mới nhất và khởi chạy container frontend
# ============================================================
cd "$APP_DIR"
log "Pull Docker image Frontend..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull frontend || error "Không thể pull image frontend"

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
