import { Inject, Injectable } from '@nestjs/common';
import {
  ITikTokCampaignRepository,
  TIKTOK_CAMPAIGN_REPOSITORY,
} from '../../domain/repositories/tiktok-campaign.repository.interface';
import { TikTokCampaign } from '../../domain/entities/tiktok-campaign.entity';

@Injectable()
export class GetTikTokCampaignsUseCase {
  constructor(
    @Inject(TIKTOK_CAMPAIGN_REPOSITORY)
    private readonly campaignRepository: ITikTokCampaignRepository,
  ) {}

  async execute(): Promise<TikTokCampaign[]> {
    return this.campaignRepository.findAll();
  }
}
