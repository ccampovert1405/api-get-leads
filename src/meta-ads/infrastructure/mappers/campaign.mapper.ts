import { Campaign, CampaignStatus } from '../../domain/entities/campaign.entity';
import { CampaignOrmEntity } from '../persistence/entities/campaign.orm-entity';

export class CampaignMapper {
  static toOrm(domain: Campaign): CampaignOrmEntity {
    const orm = new CampaignOrmEntity();
    orm.metaCampaignId = domain.metaCampaignId;
    orm.name = domain.name;
    orm.status = domain.status;
    orm.objective = domain.objective;
    orm.dailyBudget = domain.dailyBudget;
    orm.insights = domain.insights;
    return orm;
  }

  static toDomain(orm: CampaignOrmEntity): Campaign {
    return new Campaign(
      orm.id,
      orm.metaCampaignId,
      orm.name,
      orm.status as CampaignStatus,
      orm.objective,
      orm.dailyBudget,
      orm.insights as any,
      orm.createdAt,
    );
  }
}
