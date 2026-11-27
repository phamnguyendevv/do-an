@echo off
title Bookstore AI Launcher
echo ============================================================
echo   Bookstore AI - Khoi dong toan bo he thong
echo ============================================================

echo 1. Kiem tra Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo 2. Khoi dong Backend NestJS (Port 3000)...
start "Bookstore AI - Backend" cmd /k "cd /d %~dp0be && npm run start:dev"

echo 3. Khoi dong Frontend Web Quan Ly (Port 5173)...
start "Bookstore AI - Frontend" cmd /k "cd /d %~dp0fe && npm run dev"

echo.
echo ============================================================
echo   Tat ca dich vu da duoc khoi dong!
echo   - Backend:  http://localhost:3000
echo   - Swagger:  http://localhost:3000/api
echo   - Frontend: http://localhost:5173
echo ============================================================
 