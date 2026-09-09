import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ICampaignRepository,
  CAMPAIGN_REPOSITORY,
} from '../../domain/repositories/campaign.repository.interface';
import { IMetaGraphApiPort, META_GRAPH_API_PORT } from '../ports/meta-graph-api.port';
import { InvalidCampaignDataException } from '../../domain/exceptions/domain.exceptions';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../../platform-credentials/domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../../platform-credentials/domain/entities/platform-credential.entity';

@Injectable()
export class SyncCampaignsUseCase {
  private readonly logger = new Logger(SyncCampaignsUseCase.name);

  constructor(
    @Inject(META_GRAPH_API_PORT) private readonly metaGraphApi: IMetaGraphApiPort,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaignRepository: ICampaignRepository,
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(rawAdAccountId?: string): Promise<{ synced: number }> {
    const credential = await this.credentialRepository.findByPlatform(Platform.META);
    const adAccountId =
      rawAdAccountId || credential?.accountId || this.configService.get<string>('metaAds.adAccountId');

    if (!adAccountId || !adAccountId.startsWith('act_') || adAccountId.includes('tu_')) {
      throw new InvalidCampaignDataException(
        'El ID de Cuenta Publicitaria de Meta Ads (META_AD_ACCOUNT_ID) no está configurado. Debe comunicarse con el Administrador para configurar las variables y poder extraer los leads.',
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
