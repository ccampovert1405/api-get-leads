export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export interface CampaignInsights {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpl: number | null;
}

export class Campaign {
  constructor(
    public readonly id: string,
    public readonly metaCampaignId: string,
    public readonly name: string,
    public readonly status: CampaignStatus,
    public readonly objective: string,
    public readonly dailyBudget: number | null,
    public readonly insights: CampaignInsights | null,
    public readonly createdAt: Date,
  ) {}

  isActive(): boolean {
    return this.status === CampaignStatus.ACTIVE;
  }
}
