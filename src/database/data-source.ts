import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../auth/infrastructure/persistence/entities/user.orm-entity';
import { RoleOrmEntity } from '../roles/entities/role.orm-entity';
import { PermissionOrmEntity } from '../permissions/entities/permission.orm-entity';
import { CampaignOrmEntity } from '../meta-ads/infrastructure/persistence/entities/campaign.orm-entity';
import { TikTokCampaignOrmEntity } from '../tiktok-ads/infrastructure/persistence/entities/tiktok-campaign.orm-entity';
import { LeadOrmEntity } from '../leads/infrastructure/persistence/entities/lead.orm-entity';
import { PlatformCredentialOrmEntity } from '../platform-credentials/infrastructure/persistence/entities/platform-credential.orm-entity';
import { SyncScheduleOrmEntity } from '../sync-schedules/infrastructure/persistence/entities/sync-schedule.orm-entity';
import { SyncExecutionLogOrmEntity } from '../sync-schedules/infrastructure/persistence/entities/sync-execution-log.orm-entity';
import { MenuOrmEntity } from '../menus/entities/menu.orm-entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'meta_ads_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // En producción SIEMPRE false: las migraciones son la única fuente de verdad del esquema.
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
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
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations_history',
});
