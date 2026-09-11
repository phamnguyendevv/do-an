#!/bin/bash
# ============================================================
# Backend Deploy Script
# Được gọi từ GitHub Actions qua SSH
# Chạy tại: /opt/app/scripts/deploy-be.sh trên VPS
# ============================================================
set -e

# Màu sắc
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
IMAGE="ghcr.io/${GITHUB_ACTOR}/do-an-backend:latest"

# ============================================================
# Kiểm tra file cần thiết
# ============================================================
[ -f "$COMPOSE_FILE" ] || error "Không tìm thấy $COMPOSE_FILE"
[ -f "$ENV_FILE" ] || error "Không tìm thấy $ENV_FILE — hãy tạo file này trước!"

log "Bắt đầu deploy Backend..."
log "Image: $IMAGE"

# ============================================================
# 1. Login GitHub Container Registry
# ============================================================
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_ACTOR" ]; then
    log "Đăng nhập GitHub Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin 2>/dev/null || \
        warn "GITHUB_TOKEN không hợp lệ, thử kéo image không xác thực..."
fi

# ============================================================
# 2. Pull image Backend mới nhất
# ============================================================
cd "$APP_DIR"
log "Pull Docker image mới nhất..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull backend || docker pull "$IMAGE" || error "Không thể pull image $IMAGE"

# ============================================================
# 3. Khởi động/cập nhật container Backend
# ============================================================
log "Khởi chạy container Backend..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend

# ============================================================
# 4. Health check
# ============================================================
log "Kiểm tra health của Backend..."
sleep 10  # Chờ app khởi động

MAX_RETRIES=12
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        http://localhost:3000/health 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        HEALTH_OK=true
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    warn "Health check lần $RETRY_COUNT/$MAX_RETRIES (HTTP: $HTTP_CODE), thử lại sau 5s..."
    sleep 5
done

if [ "$HEALTH_OK" = true ]; then
    log "✅ Backend healthy và đang chạy!"
else
    error "❌ Backend không healthy sau $MAX_RETRIES lần thử. Kiểm tra logs: docker compose -f $COMPOSE_FILE logs backend"
fi

# ============================================================
# 5. Dọn dẹp Docker images cũ
# ============================================================
log "Dọn dẹp Docker images cũ..."
docker image prune -f --filter "until=24h" 2>/dev/null || true

log "============================================"
log "  Deploy Backend THÀNH CÔNG!"
log "============================================"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
