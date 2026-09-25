import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import metaAdsConfig from './infrastructure/config/meta-ads.config';
import { CampaignsController } from './infrastructure/controllers/campaigns.controller';
import { MetaGraphApiService } from './infrastructure/http/meta-graph-api.service';
import { TypeOrmCampaignRepository } from './infrastructure/persistence/typeorm-campaign.repository';
import { CampaignOrmEntity } from './infrastructure/persistence/entities/campaign.orm-entity';

import { SyncCampaignsUseCase } from './application/use-cases/sync-campaigns.use-case';
import { GetCampaignsUseCase } from './application/use-cases/get-campaigns.use-case';
import { SyncMetaLeadsUseCase } from './application/use-cases/sync-meta-leads.use-case';
import { GetLeadFormsUseCase } from './application/use-cases/get-lead-forms.use-case';
import { META_GRAPH_API_PORT } from './application/ports/meta-graph-api.port';
import { CAMPAIGN_REPOSITORY } from './domain/repositories/campaign.repository.interface';

import { PlatformCredentialsModule } from '../platform-credentials/platform-credentials.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    ConfigModule.forFeature(metaAdsConfig),
    HttpModule.register({ timeout: 15000, maxRedirects: 3 }),
    TypeOrmModule.forFeature([CampaignOrmEntity]),
    PlatformCredentialsModule, // provee PLATFORM_CREDENTIAL_REPOSITORY para leer el token vigente
    LeadsModule, // provee LEAD_REPOSITORY para persistir los leads de Meta
  ],
  controllers: [CampaignsController],
  providers: [
    SyncCampaignsUseCase,
    GetCampaignsUseCase,
    SyncMetaLeadsUseCase,
    GetLeadFormsUseCase,
    { provide: META_GRAPH_API_PORT, useClass: MetaGraphApiService },
    { provide: CAMPAIGN_REPOSITORY, useClass: TypeOrmCampaignRepository },
  ],
  exports: [SyncCampaignsUseCase, SyncMetaLeadsUseCase, GetLeadFormsUseCase],
})
export class MetaAdsModule {}
