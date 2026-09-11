import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { MenusModule } from './menus/menus.module';
import { MetaAdsModule } from './meta-ads/meta-ads.module';
import { TikTokAdsModule } from './tiktok-ads/tiktok-ads.module';
import { LeadsModule } from './leads/leads.module';
import { PlatformCredentialsModule } from './platform-credentials/platform-credentials.module';
import { SyncScheduleModule } from './sync-schedules/sync-schedule.module';
import { DocumentsModule } from './documents/documents.module';

import { JwtAuthGuard } from './auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';

import { UserOrmEntity } from './auth/infrastructure/persistence/entities/user.orm-entity';
import { RoleOrmEntity } from './roles/entities/role.orm-entity';
import { PermissionOrmEntity } from './permissions/entities/permission.orm-entity';
import { MenuOrmEntity } from './menus/entities/menu.orm-entity';
import { CampaignOrmEntity } from './meta-ads/infrastructure/persistence/entities/campaign.orm-entity';
import { TikTokCampaignOrmEntity } from './tiktok-ads/infrastructure/persistence/entities/tiktok-campaign.orm-entity';
import { LeadOrmEntity } from './leads/infrastructure/persistence/entities/lead.orm-entity';
import { PlatformCredentialOrmEntity } from './platform-credentials/infrastructure/persistence/entities/platform-credential.orm-entity';
import { SyncScheduleOrmEntity } from './sync-schedules/infrastructure/persistence/entities/sync-schedule.orm-entity';
import { SyncExecutionLogOrmEntity } from './sync-schedules/infrastructure/persistence/entities/sync-execution-log.orm-entity';
import { DocumentOrmEntity } from './documents/infrastructure/persistence/entities/document.orm-entity';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { HealthController } from './common/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Habilita @Cron/@Interval en toda la app (usado por TokenRenewalScheduler).
    ScheduleModule.forRoot(),

    // Rate limiting global: 100 requests / 60s por IP. Endpoints como /auth/login
    // sobreescriben esto con un límite más estricto vía @Throttle().
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'meta_ads_db'),
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        entities: [
          UserOrmEntity,
          RoleOrmEntity,
          PermissionOrmEntity,
          MenuOrmEntity,
          CampaignOrmEntity,
          TikTokCampaignOrmEntity,
          LeadOrmEntity,
          PlatformCredentialOrmEntity,
          SyncScheduleOrmEntity,
          SyncExecutionLogOrmEntity,
          DocumentOrmEntity,
        ],
        // CRÍTICO en producción: el esquema se gestiona solo vía migraciones,
        // nunca con sincronización automática (riesgo de pérdida de datos).
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    MenusModule,
    MetaAdsModule,
    TikTokAdsModule,
    LeadsModule,
    PlatformCredentialsModule,
    SyncScheduleModule,
    DocumentsModule,
  ],
  controllers: [HealthController],
  providers: [
    // 1. Guard global de autenticación: verifica JWT válido salvo rutas @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 2. Guard global de permisos: valida permisos @RequirePermissions() o bypass SuperAdmin
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // 3. Guard de Rate-Limiting
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Filtro global uniforme de excepciones
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Interceptor global de auditoría / logging
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // Interceptor global de formato de respuesta estandarizado
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule {}

