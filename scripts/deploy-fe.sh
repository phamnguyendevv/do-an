#!/bin/bash
# ============================================================
# Frontend Deploy Script
# Được gọi từ GitHub Actions sau khi SCP dist/ lên VPS
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

FRONTEND_DIR="/opt/app/frontend/dist"
NGINX_CONF_SRC="/opt/app/nginx/frontend.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/zymail.site"
NGINX_ENABLED="/etc/nginx/sites-enabled/zymail.site"

API_CONF_SRC="/opt/app/nginx/api.conf"
API_CONF_DEST="/etc/nginx/sites-available/api.zymail.site"
API_ENABLED="/etc/nginx/sites-enabled/api.zymail.site"

log "Bắt đầu deploy Frontend..."

# ============================================================
# 1. Kiểm tra thư mục dist tồn tại
# ============================================================
[ -d "$FRONTEND_DIR" ] || error "Không tìm thấy $FRONTEND_DIR — quá trình SCP có thể thất bại"
log "Thư mục dist tồn tại: $FRONTEND_DIR"

# ============================================================
# 2. Cập nhật quyền sở hữu cho Nginx đọc được
# ============================================================
log "Cập nhật quyền thư mục..."
chown -R www-data:www-data "$FRONTEND_DIR" 2>/dev/null || \
    chown -R nginx:nginx "$FRONTEND_DIR" 2>/dev/null || \
    warn "Không thể chown, Nginx vẫn có thể đọc được file"
chmod -R 755 /opt/app/frontend

# ============================================================
# 3. Cập nhật Nginx config (nếu có thay đổi)
# ============================================================
if [ -f "$NGINX_CONF_SRC" ]; then
    log "Cập nhật Nginx config cho zymail.site..."
    cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
    ln -sf "$NGINX_CONF_DEST" "$NGINX_ENABLED" 2>/dev/null || true
fi

if [ -f "$API_CONF_SRC" ]; then
    log "Cập nhật Nginx config cho api.zymail.site..."
    cp "$API_CONF_SRC" "$API_CONF_DEST"
    ln -sf "$API_CONF_DEST" "$API_ENABLED" 2>/dev/null || true
fi

# ============================================================
# 4. Kiểm tra cú pháp Nginx
# ============================================================
log "Kiểm tra cú pháp Nginx config..."
nginx -t || error "Nginx config có lỗi! Kiểm tra lại file config."

# ============================================================
# 5. Reload Nginx (zero-downtime)
# ============================================================
log "Reload Nginx..."
systemctl reload nginx || error "Không thể reload Nginx"

# ============================================================
# 6. Verify website hoạt động
# ============================================================
log "Kiểm tra website zymail.site..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -L https://zymail.site 2>/dev/null || \
    curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:80 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" =~ ^(200|301|302)$ ]]; then
    log "✅ Website đang hoạt động! (HTTP $HTTP_CODE)"
else
    warn "Không kiểm tra được website qua HTTPS (HTTP: $HTTP_CODE) - có thể SSL chưa được cấu hình"
fi

# In ra danh sách file mới nhất
log "Các file dist mới nhất:"
ls -la "$FRONTEND_DIR" | head -20

log "============================================"
log "  Deploy Frontend THÀNH CÔNG!"
log "  Website: https://zymail.site"
log "============================================"
