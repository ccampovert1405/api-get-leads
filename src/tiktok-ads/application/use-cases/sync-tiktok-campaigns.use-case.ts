import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITikTokCampaignRepository,
  TIKTOK_CAMPAIGN_REPOSITORY,
} from '../../domain/repositories/tiktok-campaign.repository.interface';
import { TIKTOK_API_PORT, ITikTokApiPort } from '../ports/tiktok-api.port';
import { InvalidTikTokCampaignDataException } from '../../domain/exceptions/domain.exceptions';

@Injectable()
export class SyncTikTokCampaignsUseCase {
  private readonly logger = new Logger(SyncTikTokCampaignsUseCase.name);

  constructor(
    @Inject(TIKTOK_API_PORT) private readonly tiktokApi: ITikTokApiPort,
    @Inject(TIKTOK_CAMPAIGN_REPOSITORY)
    private readonly campaignRepository: ITikTokCampaignRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(rawAdvertiserId?: string): Promise<{ synced: number }> {
    const advertiserId = rawAdvertiserId || this.configService.get<string>('tiktokAds.advertiserId');

    if (!advertiserId || advertiserId.trim().length === 0) {
      throw new InvalidTikTokCampaignDataException(
        'advertiserId es requerido. Envíalo en el body o define TIKTOK_ADVERTISER_ID en el .env',
      );
    }

    const campaigns = await this.tiktokApi.fetchCampaigns(advertiserId);

    if (campaigns.length === 0) {
      this.logger.warn(`No se encontraron campañas TikTok para advertiser ${advertiserId}`);
      return { synced: 0 };
    }

    await this.campaignRepository.saveMany(campaigns);
    this.logger.log(`Sincronizadas ${campaigns.length} campañas de TikTok`);

    return { synced: campaigns.length };
  }
}
