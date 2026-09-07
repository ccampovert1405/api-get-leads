import { Inject, Injectable, Logger } from '@nestjs/common';
import { IMetaGraphApiPort, META_GRAPH_API_PORT } from '../ports/meta-graph-api.port';
import {
  ICampaignRepository,
  CAMPAIGN_REPOSITORY,
} from '../../domain/repositories/campaign.repository.interface';
import {
  ILeadRepository,
  LEAD_REPOSITORY,
} from '../../../leads/domain/repositories/lead.repository.interface';
import { Lead, LeadSource } from '../../../leads/domain/entities/lead.entity';
import { SyncCampaignsUseCase } from './sync-campaigns.use-case';

export interface SyncMetaLeadsResult {
  campaignsChecked: number;
  leadsFetched: number;
  leadsSaved: number;
}

@Injectable()
export class SyncMetaLeadsUseCase {
  private readonly logger = new Logger(SyncMetaLeadsUseCase.name);

  constructor(
    @Inject(META_GRAPH_API_PORT) private readonly metaGraphApi: IMetaGraphApiPort,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaignRepository: ICampaignRepository,
    @Inject(LEAD_REPOSITORY) private readonly leadRepository: ILeadRepository,
    private readonly syncCampaignsUseCase: SyncCampaignsUseCase,
  ) {}

  async execute(params?: { campaignId?: string; adAccountId?: string }): Promise<SyncMetaLeadsResult> {
    let campaignIdsToQuery: string[] = [];

    if (params?.campaignId) {
      campaignIdsToQuery = [params.campaignId];
    } else {
      let localCampaigns = await this.campaignRepository.findAll();

      // Si aún no hay campañas guardadas en base de datos, sincroniza automáticamente primero
      if (localCampaigns.length === 0) {
        this.logger.log('No hay campañas en base de datos. Ejecutando sincronización previa de campañas...');
        await this.syncCampaignsUseCase.execute(params?.adAccountId);
        localCampaigns = await this.campaignRepository.findAll();
      }

      campaignIdsToQuery = localCampaigns.map((c) => c.metaCampaignId);
    }

    if (campaignIdsToQuery.length === 0) {
      this.logger.warn('No se encontraron campañas para consultar leads de Meta.');
      return { campaignsChecked: 0, leadsFetched: 0, leadsSaved: 0 };
    }

    this.logger.log(`Consultando leads de Meta para ${campaignIdsToQuery.length} campañas...`);

    const allLeads: Lead[] = [];

    for (const campaignId of campaignIdsToQuery) {
      const rawLeads = await this.metaGraphApi.fetchCampaignLeads(campaignId);

      for (const row of rawLeads) {
        allLeads.push(
          new Lead(
            '', // id generado por BD
            LeadSource.META,
            row.sourceLeadId,
            row.campaignId,
            row.formName ?? null,
            row.fullName ?? null,
            row.email ?? null,
            row.phone ?? null,
            row.rawPayload,
            row.receivedAt,
            new Date(),
          ),
        );
      }
    }

    const { inserted } = await this.leadRepository.saveMany(allLeads);

    this.logger.log(
      `Sincronización de leads Meta completada: ${campaignIdsToQuery.length} campañas revisadas, ` +
        `${allLeads.length} leads obtenidos, ${inserted} persistidos en base de datos.`,
    );

    return {
      campaignsChecked: campaignIdsToQuery.length,
      leadsFetched: allLeads.length,
      leadsSaved: inserted,
    };
  }
}
