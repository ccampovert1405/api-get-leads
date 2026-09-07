import { TikTokCampaign, TikTokCampaignStatus } from '../../domain/entities/tiktok-campaign.entity';
import { TikTokCampaignOrmEntity } from '../persistence/entities/tiktok-campaign.orm-entity';

export class TikTokCampaignMapper {
  static toOrm(domain: TikTokCampaign): TikTokCampaignOrmEntity {
    const orm = new TikTokCampaignOrmEntity();
    orm.tiktokCampaignId = domain.tiktokCampaignId;
    orm.advertiserId = domain.advertiserId;
    orm.name = domain.name;
    orm.status = domain.status;
    orm.objective = domain.objective;
    orm.budget = domain.budget;
    orm.insights = domain.insights;
    return orm;
  }

  static toDomain(orm: TikTokCampaignOrmEntity): TikTokCampaign {
    return new TikTokCampaign(
      orm.id,
      orm.tiktokCampaignId,
      orm.advertiserId,
      orm.name,
      orm.status as TikTokCampaignStatus,
      orm.objective,
      orm.budget,
      orm.insights as any,
      orm.createdAt,
    );
  }
}
