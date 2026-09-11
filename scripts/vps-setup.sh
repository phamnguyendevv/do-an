#!/bin/bash
# ============================================================
# VPS Setup Script - Chạy 1 lần duy nhất trên Ubuntu VPS mới
# Dành cho domain: zymail.site & api.zymail.site
#
# Cách dùng (SSH vào VPS với root):
#   chmod +x vps-setup.sh && bash vps-setup.sh
# ============================================================
set -e  # Dừng ngay nếu có lệnh lỗi

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[✓] $1${NC}"; }
warn() { echo -e "${YELLOW}[!] $1${NC}"; }
error() { echo -e "${RED}[✗] $1${NC}"; exit 1; }

# ============================================================
# 1. Cập nhật hệ thống
# ============================================================
log "Cập nhật hệ thống Ubuntu..."
apt-get update -y && apt-get upgrade -y
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw

log "Cập nhật xong!"

# ============================================================
# 2. Cài đặt Docker Engine
# ============================================================
log "Cài đặt Docker..."

if command -v docker &>/dev/null; then
    warn "Docker đã được cài đặt, bỏ qua..."
else
    # Thêm Docker GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Thêm Docker repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    systemctl enable docker
    systemctl start docker

    log "Docker đã được cài đặt: $(docker --version)"
fi

# ============================================================
# 3. Cài đặt Nginx
# ============================================================
log "Cài đặt Nginx..."

if command -v nginx &>/dev/null; then
    warn "Nginx đã được cài đặt, bỏ qua..."
else
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    log "Nginx đã được cài đặt: $(nginx -v 2>&1)"
fi

# ============================================================
# 4. Cài đặt Certbot (Let's Encrypt SSL)
# ============================================================
log "Cài đặt Certbot..."

if command -v certbot &>/dev/null; then
    warn "Certbot đã được cài đặt, bỏ qua..."
else
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
    log "Certbot đã được cài đặt: $(certbot --version)"
fi

# ============================================================
# 5. Cấu hình Firewall UFW
# ============================================================
log "Cấu hình firewall UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
echo "y" | ufw enable
log "Firewall đã bật: 22 (SSH), 80 (HTTP), 443 (HTTPS)"

# ============================================================
# 6. Tạo cấu trúc thư mục ứng dụng
# ============================================================
log "Tạo cấu trúc thư mục /opt/app..."
mkdir -p /opt/app/frontend/dist
mkdir -p /opt/app/scripts
mkdir -p /opt/app/nginx
mkdir -p /opt/app/backups
chmod -R 755 /opt/app
log "Cấu trúc thư mục đã được tạo tại /opt/app/"

# ============================================================
# 7. Đảm bảo PasswordAuthentication bật (QUAN TRỌNG)
# ============================================================
log "Đảm bảo SSH cho phép PasswordAuthentication..."
sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
log "SSH PasswordAuthentication đã được bật!"

# ============================================================
# 8. Copy Nginx configs
# ============================================================
log "Cài đặt Nginx config cho zymail.site và api.zymail.site..."

# Config sẽ được copy sau khi có SSL, tạm thời HTTP-only để lấy cert
cat > /etc/nginx/sites-available/zymail.site-temp << 'EOF'
server {
    listen 80;
    server_name zymail.site www.zymail.site;
    root /var/www/html;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 200 'OK'; }
}
EOF

cat > /etc/nginx/sites-available/api.zymail.site-temp << 'EOF'
server {
    listen 80;
    server_name api.zymail.site;
    root /var/www/html;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 200 'OK'; }
}
EOF

ln -sf /etc/nginx/sites-available/zymail.site-temp /etc/nginx/sites-enabled/zymail.site-temp
ln -sf /etc/nginx/sites-available/api.zymail.site-temp /etc/nginx/sites-enabled/api.zymail.site-temp
# Xoá default site
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ============================================================
# 9. Lấy SSL Certificate từ Let's Encrypt
# ============================================================
log "Lấy SSL certificate cho zymail.site..."
warn "Đảm bảo DNS đã trỏ đúng về IP VPS này trước khi chạy!"
warn "Nếu DNS chưa trỏ, bước này sẽ thất bại - hãy chạy lại sau khi DNS đã hoạt động"

read -p "DNS đã trỏ đúng chưa? (y/N): " dns_ready
if [[ "$dns_ready" =~ ^[Yy]$ ]]; then
    certbot certonly --nginx \
        -d zymail.site \
        -d www.zymail.site \
        --non-interactive \
        --agree-tos \
        --email admin@zymail.site \
        --redirect

    certbot certonly --nginx \
        -d api.zymail.site \
        --non-interactive \
        --agree-tos \
        --email admin@zymail.site \
        --redirect

    log "SSL Certificate đã được cài đặt!"

    # Xóa config temp và cài config thật
    rm -f /etc/nginx/sites-enabled/zymail.site-temp
    rm -f /etc/nginx/sites-enabled/api.zymail.site-temp

    if [ -f /opt/app/nginx/frontend.conf ]; then
        ln -sf /opt/app/nginx/frontend.conf /etc/nginx/sites-available/zymail.site
        ln -sf /etc/nginx/sites-available/zymail.site /etc/nginx/sites-enabled/zymail.site
    fi

    if [ -f /opt/app/nginx/api.conf ]; then
        ln -sf /opt/app/nginx/api.conf /etc/nginx/sites-available/api.zymail.site
        ln -sf /etc/nginx/sites-available/api.zymail.site /etc/nginx/sites-enabled/api.zymail.site
    fi

    nginx -t && systemctl reload nginx
    log "Nginx đã được cấu hình với SSL!"
else
    warn "Bỏ qua bước SSL. Hãy chạy lệnh này sau khi DNS đã trỏ:"
    echo ""
    echo "  certbot certonly --nginx -d zymail.site -d www.zymail.site --email admin@zymail.site --agree-tos"
    echo "  certbot certonly --nginx -d api.zymail.site --email admin@zymail.site --agree-tos"
    echo ""
fi

# ============================================================
# 10. Tạo file .env.production trên VPS (nếu chưa có)
# ============================================================
if [ ! -f /opt/app/.env.production ]; then
    log "Tạo file .env.production mẫu tại /opt/app/.env.production..."
    cat > /opt/app/.env.production << 'EOF'
# === THAY THẾ TẤT CẢ CÁC GIÁ TRỊ NÀY ===
GITHUB_REPOSITORY_OWNER=your_github_username
DATABASE_SYNCHRONIZE=false
DATABASE_ENGINE=postgres
DATABASE_HOST=postgres
DATABASE_NAME=myapp
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DATABASE_SCHEMA=public
REDIS_HOST=redis
REDIS_PORT=6379
NODE_ENV=production
PORT=3000
MAINTENANCE_MODE=false
JWT_SECRET=CHANGE_ME_JWT_SECRET
JWT_EXPIRATION_TIME=1d
JWT_REFRESH_SECRET=CHANGE_ME_REFRESH_SECRET
JWT_REFRESH_EXPIRATION_TIME=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://api.zymail.site/auth/google/callback
STRIPE_SECRET_KEY=sk_live_your_key
GHN_API_URL=https://online-gateway.ghn.vn/shiip/public-api
GHN_TOKEN=your_ghn_token
GHN_SHOP_ID=216414
GHN_CLIENT_ID=2527055
GHN_FROM_DISTRICT_ID=1442
GHN_FROM_WARD_CODE=20109
SEPAY_BANK=MBBank
SEPAY_ACCOUNT=00977512982
SEPAY_ACCOUNT_NAME=YOUR_ACCOUNT_NAME
SEPAY_WEBHOOK_SECRET=your_sepay_webhook_secret
EOF
    warn "⚠️  QUAN TRỌNG: Hãy sửa file /opt/app/.env.production trước khi deploy!"
fi

# ============================================================
# Xong!
# ============================================================
echo ""
log "=============================================="
log "  VPS Setup hoàn tất!"
log "=============================================="
echo ""
echo -e "${YELLOW}Các bước tiếp theo:${NC}"
echo "  1. Sửa file /opt/app/.env.production với đầy đủ thông tin"
echo "  2. Thêm GitHub Secrets vào repository"
echo "  3. Push code lên branch main để kích hoạt CI/CD"
echo ""
echo -e "${GREEN}IP VPS:${NC} $(curl -s ifconfig.me)"
echo ""
