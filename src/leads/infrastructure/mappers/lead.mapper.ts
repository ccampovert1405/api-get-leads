import { Lead, LeadSource } from '../../domain/entities/lead.entity';
import { LeadOrmEntity } from '../persistence/entities/lead.orm-entity';

export class LeadMapper {
  static toOrm(domain: Lead): LeadOrmEntity {
    const orm = new LeadOrmEntity();
    if (domain.id) {
      orm.id = domain.id;
    }
    orm.source = domain.source;
    orm.sourceLeadId = domain.sourceLeadId;
    orm.sourceCampaignId = domain.sourceCampaignId;
    orm.formName = domain.formName;
    orm.fullName = domain.fullName;
    orm.email = domain.email;
    orm.phone = domain.phone;
    orm.rawPayload = domain.rawPayload;
    orm.receivedAt = domain.receivedAt;
    orm.cedula = domain.cedula;
    orm.submissionCount = domain.submissionCount;
    orm.ciudadDeclarada = domain.ciudadDeclarada;
    orm.contactPreference = domain.contactPreference;
    orm.idCanton = domain.idCanton;
    orm.idProvincia = domain.idProvincia;
    orm.idDependencia = domain.idDependencia;
    orm.lastSubmissionAt = domain.lastSubmissionAt;
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
      orm.cedula,
      orm.submissionCount ?? 1,
      orm.ciudadDeclarada,
      orm.contactPreference,
      orm.idCanton ? Number(orm.idCanton) : null,
      orm.idProvincia ? Number(orm.idProvincia) : null,
      orm.idDependencia,
      orm.lastSubmissionAt,
      orm.canton ? { id: Number(orm.canton.id), nombre: orm.canton.canton } : null,
      orm.provincia ? { id: Number(orm.provincia.id), nombre: orm.provincia.provincia } : null,
      orm.dependencia
        ? {
            id: orm.dependencia.id,
            nombre: orm.dependencia.nombre,
            codigo: orm.dependencia.codigo,
          }
        : null,
    );
  }
}
