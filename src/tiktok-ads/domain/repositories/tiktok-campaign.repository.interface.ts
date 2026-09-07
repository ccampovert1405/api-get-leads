import { TikTokCampaign } from '../entities/tiktok-campaign.entity';

export interface ITikTokCampaignRepository {
  saveMany(campaigns: TikTokCampaign[]): Promise<void>;
  findByTikTokId(tiktokCampaignId: string): Promise<TikTokCampaign | null>;
  findAll(): Promise<TikTokCampaign[]>;
}

export const TIKTOK_CAMPAIGN_REPOSITORY = Symbol('ITikTokCampaignRepository');
