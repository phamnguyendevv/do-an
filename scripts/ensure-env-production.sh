#!/bin/bash
# ============================================================
# Tao /opt/app/.env.production neu chua co, tu bien moi truong
# do GitHub Actions truyen qua (secrets cua environment cicd).
# KHONG BAO GIO ghi de file da co, de khong lam mat mat khau
# Postgres/Redis/JWT dang chay tren VPS.
# Goi tu deploy-be.sh va deploy-fe.sh truoc khi docker compose.
# ============================================================
set -e

APP_DIR="/opt/app"
ENV_FILE="$APP_DIR/.env.production"

if [ -f "$ENV_FILE" ]; then
  echo "[env] $ENV_FILE da ton tai, giu nguyen."
  exit 0
fi

# Cac secret bat buoc: thieu cai nao thi bao ro, khong tao file rac.
MISSING=""
for var in DATABASE_NAME DATABASE_USER DATABASE_PASSWORD JWT_SECRET JWT_REFRESH_SECRET SEPAY_WEBHOOK_SECRET; do
  if [ -z "${!var:-}" ]; then
    MISSING="$MISSING $var"
  fi
done

if [ -n "$MISSING" ]; then
  echo "[env] Khong tao $ENV_FILE vi thieu secret GitHub (environment cicd):$MISSING" >&2
  echo "[env] Hay them cac secret do vao GitHub roi chay lai deploy." >&2
  exit 1
fi

# Redis password: neu chua co secret thi sinh ngau nhien mot lan va luu
# vao file nay. Ca compose (substitution) va backend (env_file) deu doc
# cung file nay nen se khop nhau, va lan deploy sau se khong ghi de.
if [ -z "${REDIS_PASSWORD:-}" ]; then
  REDIS_PASSWORD="$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 24)"
fi

mkdir -p "$APP_DIR"
cat > "$ENV_FILE" <<EOF
GITHUB_REPOSITORY_OWNER=phamnguyendevv
NODE_ENV=production
PORT=3000
MAINTENANCE_MODE=false
DATABASE_SYNCHRONIZE=false
DATABASE_ENGINE=postgres
DATABASE_HOST=postgres
DATABASE_NAME=${DATABASE_NAME}
DATABASE_PORT=5432
DATABASE_USER=${DATABASE_USER}
DATABASE_PASSWORD=${DATABASE_PASSWORD}
DATABASE_SCHEMA=public
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION_TIME=1d
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRATION_TIME=7d
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
GOOGLE_CALLBACK_URL=https://api.zymail.site/auth/google/callback
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
GHN_API_URL=https://online-gateway.ghn.vn/shiip/public-api
GHN_TOKEN=${GHN_TOKEN:-}
GHN_SHOP_ID=216414
GHN_CLIENT_ID=2527055
GHN_FROM_DISTRICT_ID=1442
GHN_FROM_WARD_CODE=20109
SEPAY_BANK=${SEPAY_BANK:-MBBank}
SEPAY_ACCOUNT=${SEPAY_ACCOUNT:-00977512982}
SEPAY_ACCOUNT_NAME=${SEPAY_ACCOUNT_NAME:-PHAM TRUNG NGUYEN}
SEPAY_WEBHOOK_SECRET=${SEPAY_WEBHOOK_SECRET}
EOF
chmod 600 "$ENV_FILE"
echo "[env] Da tao $ENV_FILE (chi khi chua co file)."
