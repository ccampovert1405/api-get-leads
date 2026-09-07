export enum TikTokCampaignStatus {
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
  DELETE = 'DELETE',
}

export interface TikTokCampaignInsights {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  conversions: number;
}

export class TikTokCampaign {
  constructor(
    public readonly id: string,
    public readonly tiktokCampaignId: string,
    public readonly advertiserId: string,
    public readonly name: string,
    public readonly status: TikTokCampaignStatus,
    public readonly objective: string,
    public readonly budget: number | null,
    public readonly insights: TikTokCampaignInsights | null,
    public readonly createdAt: Date,
  ) {}

  isActive(): boolean {
    return this.status === TikTokCampaignStatus.ENABLE;
  }
}
