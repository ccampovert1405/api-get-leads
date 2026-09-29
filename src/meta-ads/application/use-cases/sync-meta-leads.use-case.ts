import { Injectable, Inject, Logger } from '@nestjs/common';
import { IMetaGraphApiPort, META_GRAPH_API_PORT, RawMetaLead } from '../ports/meta-graph-api.port';
import { ICampaignRepository, CAMPAIGN_REPOSITORY } from '../../domain/repositories/campaign.repository.interface';
import { ILeadRepository, LEAD_REPOSITORY } from '../../../leads/domain/repositories/lead.repository.interface';
import { Lead, LeadSource } from '../../../leads/domain/entities/lead.entity';
import { SyncCampaignsUseCase } from './sync-campaigns.use-case';
import { GeoResolverService } from '../../../geo/services/geo-resolver.service';
import {
  IDependenciaRepository,
  DEPENDENCIA_REPOSITORY,
} from '../../../dependencias/domain/repositories/dependencia.repository.interface';

export interface SyncMetaLeadsResult {
  campaignsChecked: number;
  leadsFetched: number;
  leadsSaved: number;
  processedLeadIds: string[];
}

@Injectable()
export class SyncMetaLeadsUseCase {
  private readonly logger = new Logger(SyncMetaLeadsUseCase.name);

  constructor(
    @Inject(META_GRAPH_API_PORT) private readonly metaGraphApi: IMetaGraphApiPort,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaignRepository: ICampaignRepository,
    @Inject(LEAD_REPOSITORY) private readonly leadRepository: ILeadRepository,
    @Inject(DEPENDENCIA_REPOSITORY) private readonly dependenciaRepository: IDependenciaRepository,
    private readonly geoResolver: GeoResolverService,
    private readonly syncCampaignsUseCase: SyncCampaignsUseCase,
  ) {}

  async execute(params?: { campaignId?: string; adAccountId?: string; pageId?: string }): Promise<SyncMetaLeadsResult> {
    let campaignIdsToQuery: string[] = [];

    if (params?.campaignId) {
      campaignIdsToQuery = [params.campaignId];
    } else {
      let localCampaigns = await this.campaignRepository.findAll();

      // Si aún no hay campañas guardadas en base de datos, sincroniza automáticamente primero
      if (localCampaigns.length === 0) {
        this.logger.log('No hay campañas en base de datos. Intentando sincronización previa de campañas...');
        try {
          await this.syncCampaignsUseCase.execute(params?.adAccountId);
          localCampaigns = await this.campaignRepository.findAll();
        } catch (campErr: any) {
          this.logger.warn(`No se pudieron sincronizar campañas previas: ${campErr?.message || campErr}`);
        }
      }

      campaignIdsToQuery = localCampaigns.map((c) => c.metaCampaignId);
    }

    const allLeads: Lead[] = [];
    const seenLeadIds = new Set<string>();

    // 1. Consultar leads asociados a campañas de Meta
    if (campaignIdsToQuery.length > 0) {
      this.logger.log(`Consultando leads de Meta para ${campaignIdsToQuery.length} campañas...`);
      for (const campaignId of campaignIdsToQuery) {
        try {
          const rawLeads = await this.metaGraphApi.fetchCampaignLeads(campaignId);
          for (const row of rawLeads) {
            if (!seenLeadIds.has(row.sourceLeadId)) {
              seenLeadIds.add(row.sourceLeadId);
              const geo = await this.resolveGeoAndDependencia(row.ciudadDeclarada);
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
                  row.cedula ?? null,
                  1,
                  row.ciudadDeclarada ?? null,
                  row.contactPreference ?? null,
                  geo.idCanton,
                  geo.idProvincia,
                  geo.idDependencia,
                ),
              );
            }
          }
        } catch (leadErr: any) {
          this.logger.warn(`Error al consultar leads para campaña ${campaignId}: ${leadErr?.message || leadErr}`);
        }
      }
    }

    // 2. Consultar leads desde formularios instantáneos (LeadGen Forms) de la(s) Página(s) de Meta
    try {
      this.logger.log('Consultando leads desde formularios instantáneos de Páginas de Meta...');
      const formsLeads = await this.metaGraphApi.fetchPageLeadgenFormsLeads(params?.pageId);
      for (const row of formsLeads) {
        if (!seenLeadIds.has(row.sourceLeadId)) {
          seenLeadIds.add(row.sourceLeadId);
          const geo = await this.resolveGeoAndDependencia(row.ciudadDeclarada);
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
              row.cedula ?? null,
              1,
              row.ciudadDeclarada ?? null,
              row.contactPreference ?? null,
              geo.idCanton,
              geo.idProvincia,
              geo.idDependencia,
            ),
          );
        }
      }
    } catch (formsErr: any) {
      this.logger.warn(`Error al consultar formularios de página Meta: ${formsErr?.message || formsErr}`);
    }

    if (allLeads.length === 0) {
      this.logger.log(
        `Sincronización Meta completada: 0 leads encontrados (revisadas ${campaignIdsToQuery.length} campañas y formularios de página).`,
      );
      return {
        campaignsChecked: campaignIdsToQuery.length,
        leadsFetched: 0,
        leadsSaved: 0,
        processedLeadIds: [],
      };
    }

    const { inserted, updated, savedIds } = await this.leadRepository.saveMany(allLeads);

    this.logger.log(
      `Sincronización de leads Meta completada exitosamente: ${campaignIdsToQuery.length} campañas revisadas, ` +
        `${allLeads.length} leads obtenidos, ${inserted} nuevos persistidos, ${updated} actualizados/recurrentes en base de datos.`,
    );

    return {
      campaignsChecked: campaignIdsToQuery.length,
      leadsFetched: allLeads.length,
      leadsSaved: inserted + updated,
      processedLeadIds: savedIds || [],
    };
  }

  private async resolveGeoAndDependencia(ciudadDeclarada?: string | null): Promise<{
    idCanton: number | null;
    idProvincia: number | null;
    idDependencia: string | null;
  }> {
    if (!ciudadDeclarada) {
      return { idCanton: null, idProvincia: null, idDependencia: null };
    }

    const geo = await this.geoResolver.resolveLocation(ciudadDeclarada);
    let idDependencia: string | null = null;

    if (geo.provinciaId) {
      const deps = await this.dependenciaRepository.findByProvincia(geo.provinciaId);
      if (deps.length > 0) {
        // Si hay una dependencia específica en el mismo cantón, seleccionarla
        const cantonMatch = geo.cantonId ? deps.find((d) => Number(d.idCanton) === geo.cantonId) : null;
        idDependencia = cantonMatch ? cantonMatch.id : deps[0].id;
      }
    }

    return {
      idCanton: geo.cantonId,
      idProvincia: geo.provinciaId,
      idDependencia,
    };
  }
}
