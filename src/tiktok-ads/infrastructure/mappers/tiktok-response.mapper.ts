import { TikTokCampaign, TikTokCampaignStatus } from '../../domain/entities/tiktok-campaign.entity';
import { InvalidTikTokCampaignDataException } from '../../domain/exceptions/domain.exceptions';

interface TikTokCampaignRaw {
  campaign_id: string;
  advertiser_id: string;
  campaign_name: string;
  operation_status: string; // ENABLE | DISABLE | DELETE
  objective_type: string;
  budget?: number;
  create_time: string;
}

export class TikTokResponseMapper {
  static toDomain(raw: TikTokCampaignRaw): TikTokCampaign {
    if (!raw.campaign_id || !raw.campaign_name) {
      throw new InvalidTikTokCampaignDataException('Falta campaign_id o campaign_name en la respuesta');
    }

    return new TikTokCampaign(
      raw.campaign_id,
      raw.campaign_id,
      raw.advertiser_id,
      raw.campaign_name,
      this.mapStatus(raw.operation_status),
      raw.objective_type,
      raw.budget ?? null,
      null,
      new Date(raw.create_time),
    );
  }

  static toDomainList(rawList: TikTokCampaignRaw[]): TikTokCampaign[] {
    return rawList.map((raw) => this.toDomain(raw));
  }

  private static mapStatus(raw: string): TikTokCampaignStatus {
    const map: Record<string, TikTokCampaignStatus> = {
      ENABLE: TikTokCampaignStatus.ENABLE,
      DISABLE: TikTokCampaignStatus.DISABLE,
      DELETE: TikTokCampaignStatus.DELETE,
    };
    return map[raw] ?? TikTokCampaignStatus.DISABLE;
  }
}
