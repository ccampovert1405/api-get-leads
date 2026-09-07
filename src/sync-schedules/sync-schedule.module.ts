import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SyncScheduleOrmEntity } from './infrastructure/persistence/entities/sync-schedule.orm-entity';
import { SyncExecutionLogOrmEntity } from './infrastructure/persistence/entities/sync-execution-log.orm-entity';
import { SyncScheduleService } from './application/services/sync-schedule.service';
import { SyncScheduleController } from './infrastructure/controllers/sync-schedule.controller';
import { MetaAdsModule } from '../meta-ads/meta-ads.module';
import { TikTokAdsModule } from '../tiktok-ads/tiktok-ads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncScheduleOrmEntity, SyncExecutionLogOrmEntity]),
    MetaAdsModule,
    TikTokAdsModule,
  ],
  controllers: [SyncScheduleController],
  providers: [SyncScheduleService],
  exports: [SyncScheduleService],
})
export class SyncScheduleModule {}
