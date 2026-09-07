import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ICampaignRepository,
  CAMPAIGN_REPOSITORY,
} from '../../domain/repositories/campaign.repository.interface';
import { IMetaGraphApiPort, META_GRAPH_API_PORT } from '../ports/meta-graph-api.port';
import { InvalidCampaignDataException } from '../../domain/exceptions/domain.exceptions';

@Injectable()
export class SyncCampaignsUseCase {
  private readonly logger = new Logger(SyncCampaignsUseCase.name);

  constructor(
    @Inject(META_GRAPH_API_PORT) private readonly metaGraphApi: IMetaGraphApiPort,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaignRepository: ICampaignRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(rawAdAccountId?: string): Promise<{ synced: number }> {
    const adAccountId = rawAdAccountId || this.configService.get<string>('metaAds.adAccountId');

    if (!adAccountId || !adAccountId.startsWith('act_')) {
      throw new InvalidCampaignDataException(
        'adAccountId no configurado. Envíalo en el body o define META_AD_ACCOUNT_ID en el .env con formato act_XXXXXXXXX',
      );
    }

    const campaigns = await this.metaGraphApi.fetchCampaigns(adAccountId);

    if (campaigns.length === 0) {
      this.logger.warn(`No se encontraron campañas para ${adAccountId}`);
      return { synced: 0 };
    }

    await this.campaignRepository.saveMany(campaigns);
    this.logger.log(`Sincronizadas ${campaigns.length} campañas`);

    return { synced: campaigns.length };
  }
}
