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

# ============================================================
# Kiểm tra file cần thiết
# ============================================================
[ -f "$COMPOSE_FILE" ] || error "Không tìm thấy $COMPOSE_FILE"

# Bo sung file env.production neu thieu (tu secrets GitHub, khong ghi de file da co).
if [ -f "$APP_DIR/scripts/ensure-env-production.sh" ]; then
  bash "$APP_DIR/scripts/ensure-env-production.sh"
elif [ -f "$APP_DIR/ensure-env-production.sh" ]; then
  bash "$APP_DIR/ensure-env-production.sh"
fi
[ -f "$ENV_FILE" ] || error "Không tìm thấy $ENV_FILE — hay them secret vao GitHub environment cicd roi chay lai deploy!"

log "Bắt đầu deploy Backend..."

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

IMAGE="enestars/do-an-backend:latest"
log "Image: $IMAGE"

# ============================================================
# 1. Login DockerHub (neu co secret, de pull image private)
# ============================================================
if [ -n "$DOCKERHUB_USERNAME" ] && [ -n "$DOCKERHUB_PASSWORD" ]; then
    log "Dang nhap DockerHub..."
    echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin 2>/dev/null || \
        warn "DockerHub login khong thanh cong, thu pull image cong khai..."
fi

# ============================================================
# 2. Pull image Backend moi nhat
# ============================================================
cd "$APP_DIR"
log "Pull Docker image moi nhat..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull backend || docker pull "$IMAGE" || error "Khong the pull image $IMAGE"

# ============================================================
# 3. Đảm bảo Postgres sẵn sàng và đồng bộ mật khẩu DB
# ============================================================
log "Khởi chạy database Postgres..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres
sleep 5

# Nếu có thông tin database từ secret GitHub, cập nhật vào file .env.production
if [ -n "${DATABASE_PASSWORD:-}" ] && [ -f "$ENV_FILE" ]; then
    sed -i "s|^DATABASE_PASSWORD=.*|DATABASE_PASSWORD=${DATABASE_PASSWORD}|" "$ENV_FILE"
fi
if [ -n "${DATABASE_USER:-}" ] && [ -f "$ENV_FILE" ]; then
    sed -i "s|^DATABASE_USER=.*|DATABASE_USER=${DATABASE_USER}|" "$ENV_FILE"
fi
if [ -n "${DATABASE_NAME:-}" ] && [ -f "$ENV_FILE" ]; then
    sed -i "s|^DATABASE_NAME=.*|DATABASE_NAME=${DATABASE_NAME}|" "$ENV_FILE"
fi

DB_USER=$(grep '^DATABASE_USER=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r\n')
DB_PASS=$(grep '^DATABASE_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r\n')
DB_NAME=$(grep '^DATABASE_NAME=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r\n')

if [ -n "$DB_USER" ] && [ -n "$DB_PASS" ]; then
    log "Đồng bộ mật khẩu PostgreSQL cho user '$DB_USER'..."
    docker exec -u postgres app-postgres psql -c "ALTER USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
    docker exec app-postgres psql -U postgres -c "ALTER USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';" 2>/dev/null || true

    if [ -n "$DB_NAME" ]; then
        docker exec -u postgres app-postgres psql -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" 2>/dev/null || \
        docker exec app-postgres psql -U postgres -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" 2>/dev/null || true
        docker exec -u postgres app-postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" 2>/dev/null || \
        docker exec app-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" 2>/dev/null || true
    fi
fi

# ============================================================
# 4. Khởi động/cập nhật container Backend
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
    echo "===== docker compose ps ====="
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps || true
    echo "===== backend logs (100 dong cuoi) ====="
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail 100 backend || true
    error "❌ Backend không healthy sau $MAX_RETRIES lần thử."
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
