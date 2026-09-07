import { Lead, LeadSource } from '../../domain/entities/lead.entity';
import { LeadOrmEntity } from '../persistence/entities/lead.orm-entity';

export class LeadMapper {
  static toOrm(domain: Lead): LeadOrmEntity {
    const orm = new LeadOrmEntity();
    orm.source = domain.source;
    orm.sourceLeadId = domain.sourceLeadId;
    orm.sourceCampaignId = domain.sourceCampaignId;
    orm.formName = domain.formName;
    orm.fullName = domain.fullName;
    orm.email = domain.email;
    orm.phone = domain.phone;
    orm.rawPayload = domain.rawPayload;
    orm.receivedAt = domain.receivedAt;
    return orm;
  }

  static toDomain(orm: LeadOrmEntity): Lead {
    return new Lead(
      orm.id,
      orm.source as LeadSource,
      orm.sourceLeadId,
      orm.sourceCampaignId,
      orm.formName,
      orm.fullName,
      orm.email,
      orm.phone,
      orm.rawPayload,
      orm.receivedAt,
      orm.createdAt,
    );
  }
}
