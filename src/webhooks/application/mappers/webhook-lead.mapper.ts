import { Lead } from '../../../leads/domain/entities/lead.entity';
import { LeadOrmEntity } from '../../../leads/infrastructure/persistence/entities/lead.orm-entity';

export interface WebhookLeadPayload {
  id: string;
  source: string;
  sourceLeadId: string;
  sourceCampaignId: string | null;
  formName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  rawPayload: Record<string, any>;
  receivedAt: string | null;
  createdAt: string | null;
  cedula: string | null;
  submissionCount: number;
  ciudadDeclarada: string | null;
  contactPreference: string | null;
  idCanton: number | null;
  idProvincia: number | null;
  idDependencia: string | null;
  lastSubmissionAt: string | null;
  canton: { id: number; nombre: string } | null;
  provincia: { id: number; nombre: string } | null;
  dependencia: { id: string; nombre: string; codigo?: string | null } | null;
  campaignId: string | null;
}

export class WebhookLeadMapper {
  static toPayload(lead: Lead | LeadOrmEntity): WebhookLeadPayload {
    const isDomain = lead instanceof Lead;

    const id = lead.id;
    const source = lead.source;
    const sourceLeadId = lead.sourceLeadId;
    const sourceCampaignId = lead.sourceCampaignId ?? null;
    const formName = lead.formName ?? null;
    const fullName = lead.fullName ?? null;
    const email = lead.email ?? null;
    const phone = lead.phone ?? null;
    const rawPayload = (lead.rawPayload as Record<string, any>) ?? {};

    const receivedAt = lead.receivedAt
      ? lead.receivedAt instanceof Date
        ? lead.receivedAt.toISOString()
        : new Date(lead.receivedAt).toISOString()
      : null;

    const createdAt = lead.createdAt
      ? lead.createdAt instanceof Date
        ? lead.createdAt.toISOString()
        : new Date(lead.createdAt).toISOString()
      : null;

    const cedula = lead.cedula ?? null;
    const submissionCount = lead.submissionCount ?? 1;
    const ciudadDeclarada = lead.ciudadDeclarada ?? null;
    const contactPreference = lead.contactPreference ?? null;

    const idCanton = lead.idCanton != null ? Number(lead.idCanton) : null;
    const idProvincia = lead.idProvincia != null ? Number(lead.idProvincia) : null;
    const idDependencia = lead.idDependencia ?? null;

    const lastSubmissionAt = lead.lastSubmissionAt
      ? lead.lastSubmissionAt instanceof Date
        ? lead.lastSubmissionAt.toISOString()
        : new Date(lead.lastSubmissionAt).toISOString()
      : null;

    let canton: { id: number; nombre: string } | null = null;
    if (lead.canton) {
      canton = {
        id: Number((lead.canton as any).id),
        nombre: (lead.canton as any).canton ?? (lead.canton as any).nombre,
      };
    }

    let provincia: { id: number; nombre: string } | null = null;
    if (lead.provincia) {
      provincia = {
        id: Number((lead.provincia as any).id),
        nombre: (lead.provincia as any).provincia ?? (lead.provincia as any).nombre,
      };
    }

    let dependencia: { id: string; nombre: string; codigo?: string | null } | null = null;
    if (lead.dependencia) {
      dependencia = {
        id: (lead.dependencia as any).id,
        nombre: (lead.dependencia as any).nombre,
        codigo: (lead.dependencia as any).codigo ?? null,
      };
    }

    return {
      id,
      source,
      sourceLeadId,
      sourceCampaignId,
      formName,
      fullName,
      email,
      phone,
      rawPayload,
      receivedAt,
      createdAt,
      cedula,
      submissionCount,
      ciudadDeclarada,
      contactPreference,
      idCanton,
      idProvincia,
      idDependencia,
      lastSubmissionAt,
      canton,
      provincia,
      dependencia,
      campaignId: sourceCampaignId,
    };
  }
}
