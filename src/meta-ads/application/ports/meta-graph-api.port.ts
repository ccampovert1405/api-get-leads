import { Campaign } from '../../domain/entities/campaign.entity';

export interface RawMetaLead {
  sourceLeadId: string;
  campaignId: string | null;
  formId?: string | null;
  formName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  receivedAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface IMetaGraphApiPort {
  fetchCampaigns(adAccountId: string): Promise<Campaign[]>;
  fetchCampaignInsights(campaignId: string, since: string, until: string): Promise<Campaign>;
  fetchCampaignLeads(campaignId: string): Promise<RawMetaLead[]>;
}

export const META_GRAPH_API_PORT = Symbol('IMetaGraphApiPort');
