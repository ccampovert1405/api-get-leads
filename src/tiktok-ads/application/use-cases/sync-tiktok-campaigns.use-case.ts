import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITikTokCampaignRepository,
  TIKTOK_CAMPAIGN_REPOSITORY,
} from '../../domain/repositories/tiktok-campaign.repository.interface';
import { TIKTOK_API_PORT, ITikTokApiPort } from '../ports/tiktok-api.port';
import { InvalidTikTokCampaignDataException } from '../../domain/exceptions/domain.exceptions';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../../platform-credentials/domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../../platform-credentials/domain/entities/platform-credential.entity';

@Injectable()
export class SyncTikTokCampaignsUseCase {
  private readonly logger = new Logger(SyncTikTokCampaignsUseCase.name);

  constructor(
    @Inject(TIKTOK_API_PORT) private readonly tiktokApi: ITikTokApiPort,
    @Inject(TIKTOK_CAMPAIGN_REPOSITORY)
    private readonly campaignRepository: ITikTokCampaignRepository,
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(rawAdvertiserId?: string): Promise<{ synced: number }> {
    const credential = await this.credentialRepository.findByPlatform(Platform.TIKTOK);
    const advertiserId =
      rawAdvertiserId || credential?.accountId || this.configService.get<string>('tiktokAds.advertiserId');

    if (!advertiserId || advertiserId.trim().length === 0 || advertiserId.includes('tu_')) {
      throw new InvalidTikTokCampaignDataException(
        'El ID de Anunciante de TikTok Ads (TIKTOK_ADVERTISER_ID) no está configurado. Debe comunicarse con el Administrador para configurar las variables y poder extraer los leads.',
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
