# Bookstore AI - Khởi động toàn bộ dịch vụ phát triển
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Bookstore AI - Đang khởi động toàn bộ hệ thống..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Khởi động Docker Desktop nếu chưa chạy
if (!(Get-Process -Name "*docker*" -ErrorAction SilentlyContinue)) {
    Write-Host "1. Khởi động Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Start-Sleep -Seconds 5
}

# 2. Khởi động Backend NestJS
Write-Host "2. Khởi động Backend NestJS (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/be'; npm run start:dev"

# 3. Khởi động Frontend Vite
Write-Host "3. Khởi động Frontend Web Quản Lý (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/fe'; npm run dev"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Toàn bộ hệ thống đã chạy:" -ForegroundColor Cyan
Write-Host "   - Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   - Swagger:  http://localhost:3000/api" -ForegroundColor White
Write-Host "   - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

