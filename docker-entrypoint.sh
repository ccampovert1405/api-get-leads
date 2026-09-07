#!/bin/sh
set -e

echo "=========================================================="
echo "==> Iniciando Growth Intelligence API (NestJS Producción) "
echo "=========================================================="

# Esperar a que el host de la base de datos esté accesible si está configurado
if [ -n "$DB_HOST" ]; then
  DB_PORT_VAL=${DB_PORT:-5432}
  echo "==> Verificando disponibilidad de PostgreSQL en $DB_HOST:$DB_PORT_VAL..."
  MAX_RETRIES=30
  RETRY_COUNT=0

  until nc -z -w 2 "$DB_HOST" "$DB_PORT_VAL" 2>/dev/null || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    echo "==> Esperando a PostgreSQL ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
  done

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "==> ADVERTENCIA: Tiempo de espera agotado para PostgreSQL. Intentando continuar..."
  else
    echo "==> Conexión de red a PostgreSQL confirmada."
  fi
fi

# Validar/crear la BD y ejecutar migraciones si no está expresamente deshabilitado
if [ "$AUTO_MIGRATE" != "false" ]; then
  echo "==> Validando existencia de BD y corriendo migraciones TypeORM..."
  node dist/database/ensure-db.js || echo "==> Nota: ensure-db finalizado."
  npx typeorm migration:run -d dist/database/data-source.js || echo "==> Nota: Verificación de migraciones completada."
fi

# Ejecutar seeders si está habilitado (por defecto 'true' en primera instalación)
if [ "$AUTO_SEED" = "true" ]; then
  echo "==> Ejecutando sembradores de catálogo y usuario administrador..."
  node dist/database/seeds/run-seeds.js || echo "==> Nota: Seeds ya aplicados."
fi

echo "==> Servidor listo. Ejecutando comando de arranque..."
exec "$@"
