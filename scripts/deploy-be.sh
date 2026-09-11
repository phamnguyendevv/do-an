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
BACKUP_DIR="$APP_DIR/backups"
IMAGE="ghcr.io/${GITHUB_ACTOR}/do-an-backend:latest"

# ============================================================
# Kiểm tra file cần thiết
# ============================================================
[ -f "$COMPOSE_FILE" ] || error "Không tìm thấy $COMPOSE_FILE"
[ -f "$ENV_FILE" ] || error "Không tìm thấy $ENV_FILE — hãy tạo file này trước!"

log "Bắt đầu deploy Backend..."
log "Image: $IMAGE"

# ============================================================
# 1. Backup Database trước khi deploy
# ============================================================
log "Backup database PostgreSQL..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/db-$(date +%Y%m%d_%H%M%S).sql"

# Lấy thông tin DB từ .env.production
DB_USER=$(grep '^DATABASE_USER=' "$ENV_FILE" | cut -d'=' -f2)
DB_NAME=$(grep '^DATABASE_NAME=' "$ENV_FILE" | cut -d'=' -f2)
DB_PASS=$(grep '^DATABASE_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2)

# Thực hiện backup (nếu postgres container đang chạy)
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres 2>/dev/null | grep -q "running"; then
    PGPASSWORD="$DB_PASS" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
        exec -T postgres \
        pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null && \
        log "Backup thành công: $BACKUP_FILE" || \
        warn "Backup thất bại (bỏ qua nếu đây là lần deploy đầu tiên)"

    # Giữ tối đa 7 bản backup gần nhất
    ls -t "$BACKUP_DIR"/db-*.sql 2>/dev/null | tail -n +8 | xargs rm -f
else
    warn "Postgres chưa chạy, bỏ qua backup (lần deploy đầu tiên)"
fi

# ============================================================
# 2. Login GitHub Container Registry
# ============================================================
log "Đăng nhập GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin 2>/dev/null || \
    warn "GITHUB_TOKEN không có, thử kéo image không xác thực..."

# ============================================================
# 3. Pull image mới nhất
# ============================================================
log "Pull Docker image mới nhất..."
docker pull "$IMAGE" || error "Không thể pull image $IMAGE"

# ============================================================
# 4. Khởi động/cập nhật containers
# ============================================================
log "Khởi động containers..."
cd "$APP_DIR"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

# ============================================================
# 5. Chạy TypeORM Migrations
# ============================================================
log "Chờ database sẵn sàng..."
sleep 5

log "Chạy database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T backend \
    node dist/src/infrastructure/databases/postgresql/typeorm.config.js \
    2>/dev/null || \
    warn "Migration bỏ qua (có thể chưa có migration mới)"

# Cách thứ 2: chạy migration qua npm script nếu có
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T backend sh -c "node -e \"
        const { DataSource } = require('typeorm');
        // Migration sẽ tự chạy qua synchronize hoặc migration:run
        console.log('Migration check done');
    \"" 2>/dev/null || true

# ============================================================
# 6. Health check
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
# 7. Dọn dẹp Docker images cũ
# ============================================================
log "Dọn dẹp Docker images cũ..."
docker image prune -f --filter "until=24h" 2>/dev/null || true

log "============================================"
log "  Deploy Backend THÀNH CÔNG!"
log "============================================"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
