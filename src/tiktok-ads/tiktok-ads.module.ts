import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import tiktokAdsConfig from './infrastructure/config/tiktok-ads.config';
import { TikTokCampaignsController } from './infrastructure/controllers/tiktok-campaigns.controller';
import { TikTokLeadsController } from './infrastructure/controllers/tiktok-leads.controller';
import { TikTokApiService } from './infrastructure/http/tiktok-api.service';
import { TypeOrmTikTokCampaignRepository } from './infrastructure/persistence/typeorm-tiktok-campaign.repository';
import { TikTokCampaignOrmEntity } from './infrastructure/persistence/entities/tiktok-campaign.orm-entity';

import { SyncTikTokCampaignsUseCase } from './application/use-cases/sync-tiktok-campaigns.use-case';
import { GetTikTokCampaignsUseCase } from './application/use-cases/get-tiktok-campaigns.use-case';
import { DownloadTikTokLeadsUseCase } from './application/use-cases/download-tiktok-leads.use-case';
import { TIKTOK_API_PORT } from './application/ports/tiktok-api.port';
import { TIKTOK_CAMPAIGN_REPOSITORY } from './domain/repositories/tiktok-campaign.repository.interface';

import { LeadsModule } from '../leads/leads.module';
import { PlatformCredentialsModule } from '../platform-credentials/platform-credentials.module';

@Module({
  imports: [
    ConfigModule.forFeature(tiktokAdsConfig),
    // Timeout más alto: la descarga del CSV de leads puede tardar más que una llamada normal.
    HttpModule.register({ timeout: 30000, maxRedirects: 3 }),
    TypeOrmModule.forFeature([TikTokCampaignOrmEntity]),
    LeadsModule, // provee LEAD_REPOSITORY para persistir los leads descargados
    PlatformCredentialsModule, // provee PLATFORM_CREDENTIAL_REPOSITORY para leer credenciales de TikTok
  ],
  controllers: [TikTokCampaignsController, TikTokLeadsController],
  providers: [
    SyncTikTokCampaignsUseCase,
    GetTikTokCampaignsUseCase,
    DownloadTikTokLeadsUseCase,
    { provide: TIKTOK_API_PORT, useClass: TikTokApiService },
    { provide: TIKTOK_CAMPAIGN_REPOSITORY, useClass: TypeOrmTikTokCampaignRepository },
  ],
  exports: [SyncTikTokCampaignsUseCase],
})
export class TikTokAdsModule {}
