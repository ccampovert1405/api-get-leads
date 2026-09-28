import { Inject, Injectable, Logger } from '@nestjs/common';
import { ITikTokApiPort, TIKTOK_API_PORT } from '../ports/tiktok-api.port';
import {
  TikTokLeadsExportFailedException,
  TikTokLeadsExportTimeoutException,
} from '../../domain/exceptions/domain.exceptions';
import { ILeadRepository, LEAD_REPOSITORY } from '../../../leads/domain/repositories/lead.repository.interface';
import { Lead, LeadSource } from '../../../leads/domain/entities/lead.entity';
import { GeoResolverService } from '../../../geo/services/geo-resolver.service';
import {
  IDependenciaRepository,
  DEPENDENCIA_REPOSITORY,
} from '../../../dependencias/domain/repositories/dependencia.repository.interface';

export interface DownloadLeadsParams {
  advertiserId: string;
  pageId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface DownloadLeadsResult {
  taskId: string;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
}

@Injectable()
export class DownloadTikTokLeadsUseCase {
  private readonly logger = new Logger(DownloadTikTokLeadsUseCase.name);

  // Polling: hasta ~2 minutos (10 intentos x backoff creciente) antes de fallar.
  private readonly MAX_POLL_ATTEMPTS = 10;
  private readonly INITIAL_POLL_DELAY_MS = 3000;

  constructor(
    @Inject(TIKTOK_API_PORT) private readonly tiktokApi: ITikTokApiPort,
    @Inject(LEAD_REPOSITORY) private readonly leadRepository: ILeadRepository,
    private readonly geoResolver: GeoResolverService,
    @Inject(DEPENDENCIA_REPOSITORY) private readonly dependenciaRepository: IDependenciaRepository,
  ) {}

  async execute(params: DownloadLeadsParams): Promise<DownloadLeadsResult> {
    const { taskId } = await this.tiktokApi.requestLeadsExportTask(params);
    this.logger.log(`Tarea de exportación de leads TikTok creada: ${taskId}`);

    const downloadUrl = await this.pollUntilReady(taskId);

    const rows = await this.tiktokApi.downloadAndParseLeads(downloadUrl);
    this.logger.log(`Descargadas ${rows.length} filas de leads desde TikTok (task ${taskId})`);

    const leads: Lead[] = [];
    for (const row of rows) {
      const geo = await this.resolveGeoAndDependencia(row.ciudadDeclarada);
      leads.push(
        new Lead(
          '', // id lo genera la base de datos
          LeadSource.TIKTOK,
          row.sourceLeadId,
          row.campaignId,
          row.formName,
          row.fullName,
          row.email,
          row.phone,
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

    const { inserted, updated } = await this.leadRepository.saveMany(leads);
    this.logger.log(
      `Leads TikTok persistidos: ${inserted} nuevos, ${updated} actualizados (deduplicados por cédula/id).`,
    );

    return { taskId, fetched: rows.length, inserted, updated, skipped: rows.length - (inserted + updated) };
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

  private async pollUntilReady(taskId: string): Promise<string> {
    let delay = this.INITIAL_POLL_DELAY_MS;

    for (let attempt = 1; attempt <= this.MAX_POLL_ATTEMPTS; attempt++) {
      const result = await this.tiktokApi.checkLeadsExportStatus(taskId);

      if (result.status === 'SUCCESS' && result.downloadUrl) {
        return result.downloadUrl;
      }

      if (result.status === 'FAILED') {
        throw new TikTokLeadsExportFailedException(result.failureReason ?? 'motivo desconocido');
      }

      this.logger.log(
        `Exportación TikTok (task ${taskId}) aún en proceso, intento ${attempt}/${this.MAX_POLL_ATTEMPTS}`,
      );
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 15000);
    }

    throw new TikTokLeadsExportTimeoutException(taskId);
  }
}
