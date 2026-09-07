import { Campaign, CampaignStatus } from '../../domain/entities/campaign.entity';
import { InvalidCampaignDataException } from '../../domain/exceptions/domain.exceptions';

interface MetaCampaignRaw {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  created_time: string;
}

export class MetaResponseMapper {
  static toDomain(raw: MetaCampaignRaw): Campaign {
    if (!raw.id || !raw.name) {
      throw new InvalidCampaignDataException('Falta id o name en respuesta de Meta');
    }

    return new Campaign(
      raw.id,
      raw.id,
      raw.name,
      this.mapStatus(raw.status),
      raw.objective,
      raw.daily_budget ? Number(raw.daily_budget) / 100 : null,
      null,
      new Date(raw.created_time),
    );
  }

  static toDomainList(rawList: MetaCampaignRaw[]): Campaign[] {
    return rawList.map((raw) => this.toDomain(raw));
  }

  static toDomainWithInsights(campaignId: string, insightsRaw: any): Campaign {
    return new Campaign(
      campaignId,
      campaignId,
      '',
      CampaignStatus.ACTIVE,
      '',
      null,
      {
        impressions: Number(insightsRaw?.impressions ?? 0),
        clicks: Number(insightsRaw?.clicks ?? 0),
        spend: Number(insightsRaw?.spend ?? 0),
        ctr: Number(insightsRaw?.ctr ?? 0),
        cpl: insightsRaw?.cost_per_action_type
          ? Number(
              insightsRaw.cost_per_action_type.find((c: any) => c.action_type === 'lead')
                ?.value ?? 0,
            )
          : null,
      },
      new Date(),
    );
  }

  private static mapStatus(raw: string): CampaignStatus {
    const map: Record<string, CampaignStatus> = {
      ACTIVE: CampaignStatus.ACTIVE,
      PAUSED: CampaignStatus.PAUSED,
      ARCHIVED: CampaignStatus.ARCHIVED,
      DELETED: CampaignStatus.DELETED,
    };
    return map[raw] ?? CampaignStatus.PAUSED;
  }
}
