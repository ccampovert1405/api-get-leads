# Meta & TikTok Ads API — NestJS + DDD + RBAC Enterprise

API empresarial para consumir y sincronizar campañas/pautajes de **Meta Graph API** y **TikTok Business API**, con arquitectura DDD (Domain-Driven Design / Hexagonal), autenticación JWT, control de acceso basado en roles y permisos granulares (**RBAC con catálogo y auto-descubrimiento en PostgreSQL**), documentación interactiva Swagger/OpenAPI y persistencia TypeORM gestionada estrictamente por migraciones.

---

## Arquitectura

```text
src/
├── auth/                 # Autenticación JWT, bcrypt, guards y decoradores
├── roles/                # Entidades y gestión de roles
├── permissions/          # Catálogo único de permisos y PermissionsScannerService
├── meta-ads/             # Módulo de campañas e insights de Meta Graph API
├── tiktok-ads/           # Módulo de campañas y leads de TikTok Business API
├── leads/                # Almacén unificado y exportador CSV de leads (Meta + TikTok)
├── platform-credentials/ # Gestión y renovación automática de tokens de larga duración
├── database/             # data-source, migraciones y seeders
├── common/               # ApiResponseInterceptor, GlobalExceptionFilter, LoggingInterceptor
├── app.module.ts
└── main.ts
```

### Reglas de Dependencia:
- **`domain/`**: Entidades puras y puertos independientes del framework.
- **`application/`**: Casos de uso y DTOs.
- **`infrastructure/`**: Implementaciones técnicas (TypeORM, HttpService/Axios, controladores).

---

## Setup Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de base de datos y plataformas

# 3. Levantar PostgreSQL
docker compose up -d postgres

# 4. Ejecutar migraciones
npm run migration:run

# 5. Crear roles iniciales y usuario administrador (idempotente)
npm run seed

# 6. Iniciar en modo desarrollo
npm run start:dev
```

---

## Documentación Interactiva Swagger (OpenAPI)

La documentación Swagger está disponible en:
```text
http://localhost:3000/docs
```
- **Persistencia de sesión**: `persistAuthorization: true` mantiene tu token JWT guardado aunque recargues la página.
- **Seguridad**: Configurado con Helmet CSP permisivo para Swagger UI.
- **Activación en producción**: Habilita `SWAGGER_ENABLED=true` en `.env` si deseas exponer la documentación en staging o producción.

---

## Seguridad y Control de Acceso Granular (RBAC)

El proyecto implementa el estándar corporativo **`nest-auth-rbac-menus-standard`**:

### 1. Modelo de Datos Relacional
- **`roles`**: `Super Administrador`, `Administrador`, `Analista`.
- **`permissions`**: Catálogo único de permisos con `identificador_accion` y `nombre_accion`.
- **`role_permissions`**: Tabla intermedia Many-to-Many entre roles y permisos.
- **`users`**: Cada usuario se vincula mediante `role_id` a un rol.

### 2. Auto-descubrimiento en Bootstrap
Al iniciar la aplicación (`onApplicationBootstrap`), `PermissionsScannerService` inspecciona todos los controladores:
- Lee los decoradores `@RequirePermissions({ identificador, nombre })`.
- Inserta automáticamente en la tabla `permissions` cualquier acción no registrada.
- Asocia automáticamente los nuevos permisos descubiertos al rol `Super Administrador`.

### 3. Matriz de Permisos del Sistema:
| Módulo | Identificador de Permiso | Nombre Descriptivo |
| :--- | :--- | :--- |
| **Meta Ads** | `meta.campaigns.sync` | Sincronizar Campañas Meta |
| **Meta Ads** | `meta.campaigns.list` | Listar Campañas Meta |
| **TikTok Ads** | `tiktok.campaigns.sync` | Sincronizar Campañas TikTok |
| **TikTok Ads** | `tiktok.campaigns.list` | Listar Campañas TikTok |
| **TikTok Leads** | `tiktok.leads.download` | Descargar Leads TikTok |
| **Leads** | `leads.list` | Listar Leads Paginados |
| **Leads** | `leads.export` | Exportar Leads CSV |
| **Credenciales** | `credentials.read` | Consultar Estado Credencial |
| **Credenciales** | `credentials.renew` | Renovar Token Meta |

---

## Usuario Administrador Inicial

Creado por el seeder `src/database/seeds/admin-user.seed.ts`:
- **Usuario:** `administrator`
- **Contraseña:** `4dmin2026&&`
- **Rol:** `Super Administrador` (acceso y bypass total)

```bash
# Iniciar sesión y obtener JWT
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"administrator","password":"4dmin2026&&"}'
```

Respuesta estándar:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operación completada exitosamente",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": "8h",
    "tokenType": "Bearer"
  },
  "timestamp": "2026-09-04T04:55:00.000Z"
}
```

---

## Formato Uniforme de Respuestas (API Contract)

### Éxito (`ApiResponseInterceptor`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operación completada exitosamente",
  "data": { ... },
  "timestamp": "2026-09-04T04:55:00.000Z"
}
```

### Error (`GlobalExceptionFilter`):
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Acceso denegado: No posee los permisos requeridos",
  "error": "Forbidden",
  "path": "/v1/meta-ads/campaigns/sync",
  "timestamp": "2026-09-04T04:55:00.000Z"
}
```

---

## Migraciones

```bash
npm run migration:run
npm run migration:revert
```

---

## Docker

```bash
docker compose up -d --build
```
