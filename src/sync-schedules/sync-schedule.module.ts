import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SyncScheduleOrmEntity } from './infrastructure/persistence/entities/sync-schedule.orm-entity';
import { SyncExecutionLogOrmEntity } from './infrastructure/persistence/entities/sync-execution-log.orm-entity';
import { SyncScheduleService } from './application/services/sync-schedule.service';
import { SyncScheduleController } from './infrastructure/controllers/sync-schedule.controller';
import { MetaAdsModule } from '../meta-ads/meta-ads.module';
import { TikTokAdsModule } from '../tiktok-ads/tiktok-ads.module';
import { LeadsModule } from '../leads/leads.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PlatformCredentialsModule } from '../platform-credentials/platform-credentials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncScheduleOrmEntity, SyncExecutionLogOrmEntity]),
    MetaAdsModule,
    TikTokAdsModule,
    LeadsModule,
    WebhooksModule,
    PlatformCredentialsModule,
  ],
  controllers: [SyncScheduleController],
  providers: [SyncScheduleService],
  exports: [SyncScheduleService],
})
export class SyncScheduleModule {}
