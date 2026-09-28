#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/meta-ads-api"
FRONTEND_DIR="$ROOT_DIR/meta-ads-frontend"

echo "=========================================================="
echo "[PRODUCCIÓN] Compilando e Iniciando Meta Ads Suite"
echo "=========================================================="
echo "  Backend API:  $BACKEND_DIR (http://localhost:3000)"
echo "  Frontend Web: $FRONTEND_DIR (http://localhost:5173)"
echo "=========================================================="

cleanup() {
  echo ""
  echo "Deteniendo servicios de producción..."
  kill $(jobs -p) 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Backend: Compilar, Migrar y Sembrar
echo "[1/5] Compilando Backend NestJS..."
cd "$BACKEND_DIR"
npm run build
if [ $? -ne 0 ]; then
  echo "Error al compilar backend."
  exit 1
fi

echo "[2/5] Ejecutando migraciones de base de datos..."
npm run migration:run
if [ $? -ne 0 ]; then
  echo "Error ejecutando migraciones."
  exit 1
fi

echo "[3/5] Ejecutando seeders idempotentes (SuperAdmin)..."
npm run seed
if [ $? -ne 0 ]; then
  echo "Error ejecutando seeders."
  exit 1
fi

echo "[4/5] Levantando Backend en producción..."
node dist/main.js &

# 2. Frontend: Compilar y Servir
echo "[5/5] Compilando Frontend Vite para producción..."
cd "$FRONTEND_DIR"
npm run build
if [ $? -ne 0 ]; then
  echo "Error al compilar frontend."
  exit 1
fi

echo "🌐 Sirviendo Frontend en producción..."
npm run preview -- --port 5173 --host &

echo "=========================================================="
echo "Aplicación en Producción activa:"
echo "   - API Backend:  http://localhost:3000"
echo "   - Swagger Docs: http://localhost:3000/docs"
echo "   - Frontend Web: http://localhost:5173"
echo "=========================================================="

wait
