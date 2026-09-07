import { Campaign } from '../entities/campaign.entity';

export interface ICampaignRepository {
  save(campaign: Campaign): Promise<void>;
  saveMany(campaigns: Campaign[]): Promise<void>;
  findByMetaId(metaCampaignId: string): Promise<Campaign | null>;
  findAll(): Promise<Campaign[]>;
}

export const CAMPAIGN_REPOSITORY = Symbol('ICampaignRepository');
