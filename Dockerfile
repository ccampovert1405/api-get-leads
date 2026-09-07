# ==============================================================================
# STAGE 1: Build Application Artifacts with NestJS
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Herramientas requeridas para compilar módulos nativos (bcrypt)
RUN apk add --no-cache python3 make g++

# Instalar dependencias con caché por capas
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar a dist/
COPY . .
RUN npm run build

# ==============================================================================
# STAGE 2: Production Lean Runner
# ==============================================================================
FROM node:20-alpine AS runner

LABEL maintainer="Growth Intelligence Team"
LABEL description="Producción optimizada NestJS API en Node 20 Alpine"

WORKDIR /app

ENV NODE_ENV=production

# Instalar dumb-init para gestión de procesos UNIX (PID 1)
# y compilar dependencias de producción de forma aislada
RUN apk add --no-cache dumb-init python3 make g++

COPY package*.json ./
RUN npm ci --only=production && \
    apk del python3 make g++ && \
    rm -rf /var/cache/apk/*

# Copiar artefactos compilados desde el builder
COPY --from=builder /app/dist ./dist

# Copiar script de arranque con migraciones y verificación de BD
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R node:node /app

# Ejecutar con usuario no-root por seguridad
USER node

# Exponer puerto predeterminado
EXPOSE 3000

# Healthcheck nativo hacia /v1/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/v1/health || exit 1

# Entrypoint con verificación de PostgreSQL y migraciones automáticas
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Arrancar con dumb-init
CMD ["dumb-init", "node", "dist/main.js"]
