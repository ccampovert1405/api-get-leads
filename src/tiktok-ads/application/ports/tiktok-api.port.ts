import { TikTokCampaign } from '../../domain/entities/tiktok-campaign.entity';
import { Lead } from '../../../leads/domain/entities/lead.entity';

export interface RawLeadRow {
  sourceLeadId: string;
  campaignId: string | null;
  formName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  receivedAt: Date;
  rawPayload: Record<string, unknown>;
}

/**
 * TikTok expone la descarga de leads como un flujo asíncrono:
 * 1) se solicita una tarea de exportación (create task)
 * 2) se consulta el estado hasta que quede lista (check status)
 * 3) se descarga el archivo final (CSV) y se parsea
 * Este puerto abstrae ese flujo completo para que application no conozca HTTP.
 */
export interface ITikTokApiPort {
  fetchCampaigns(advertiserId: string): Promise<TikTokCampaign[]>;

  requestLeadsExportTask(params: {
    advertiserId: string;
    pageId: string;
    startDate: string;
    endDate: string;
  }): Promise<{ taskId: string }>;

  checkLeadsExportStatus(taskId: string): Promise<{
    status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
    downloadUrl?: string;
    failureReason?: string;
  }>;

  downloadAndParseLeads(downloadUrl: string): Promise<RawLeadRow[]>;
}

export const TIKTOK_API_PORT = Symbol('ITikTokApiPort');

export type { Lead };
