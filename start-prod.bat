@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%meta-ads-api"
set "FRONTEND_DIR=%ROOT_DIR%meta-ads-frontend"

echo ==========================================================
echo  [PRODUCCION] Compilando e Iniciando Meta Ads Suite
echo ==========================================================
echo   Backend API:  %BACKEND_DIR% (http://localhost:3000)
echo   Frontend Web: %FRONTEND_DIR% (http://localhost:5173)
echo ==========================================================

echo [1/5] Compilando Backend NestJS...
cd /d "%BACKEND_DIR%"
call npm run build
if %errorlevel% neq 0 (
  echo Error al compilar backend.
  pause
  exit /b %errorlevel%
)

echo [2/5] Ejecutando migraciones de base de datos...
call npm run migration:run
if %errorlevel% neq 0 (
  echo Error ejecutando migraciones.
  pause
  exit /b %errorlevel%
)

echo [3/5] Ejecutando seeders idempotentes (SuperAdmin)...
call npm run seed
if %errorlevel% neq 0 (
  echo Error ejecutando seeders.
  pause
  exit /b %errorlevel%
)

echo [4/5] Compilando Frontend Vite...
cd /d "%FRONTEND_DIR%"
call npm run build
if %errorlevel% neq 0 (
  echo Error al compilar frontend.
  pause
  exit /b %errorlevel%
)

echo [5/5] Levantando servicios en modo produccion...
start "Meta Ads API [PROD - Puerto 3000]" cmd /k "cd /d %BACKEND_DIR% && node dist/main.js"
start "Meta Ads Frontend [PROD - Puerto 4173]" cmd /k "cd /d %FRONTEND_DIR% && npm run preview -- --port 4173 --host"

echo.
echo Aplicacion en produccion iniciada:
echo - Backend API:  http://localhost:3000 (Swagger: http://localhost:3000/docs)
echo - Frontend Web: http://localhost:5173
echo.
pause
