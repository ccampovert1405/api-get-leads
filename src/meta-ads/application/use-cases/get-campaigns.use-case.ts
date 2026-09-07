import { Inject, Injectable } from '@nestjs/common';
import {
  ICampaignRepository,
  CAMPAIGN_REPOSITORY,
} from '../../domain/repositories/campaign.repository.interface';
import { Campaign } from '../../domain/entities/campaign.entity';

@Injectable()
export class GetCampaignsUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaignRepository: ICampaignRepository,
  ) {}

  async execute(): Promise<Campaign[]> {
    return this.campaignRepository.findAll();
  }
}
