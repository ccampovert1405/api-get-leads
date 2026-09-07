import { Inject, Injectable, Logger } from '@nestjs/common';
import { ITikTokApiPort, TIKTOK_API_PORT } from '../ports/tiktok-api.port';
import {
  TikTokLeadsExportFailedException,
  TikTokLeadsExportTimeoutException,
} from '../../domain/exceptions/domain.exceptions';
import { ILeadRepository, LEAD_REPOSITORY } from '../../../leads/domain/repositories/lead.repository.interface';
import { Lead, LeadSource } from '../../../leads/domain/entities/lead.entity';

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
  ) {}

  async execute(params: DownloadLeadsParams): Promise<DownloadLeadsResult> {
    const { taskId } = await this.tiktokApi.requestLeadsExportTask(params);
    this.logger.log(`Tarea de exportación de leads TikTok creada: ${taskId}`);

    const downloadUrl = await this.pollUntilReady(taskId);

    const rows = await this.tiktokApi.downloadAndParseLeads(downloadUrl);
    this.logger.log(`Descargadas ${rows.length} filas de leads desde TikTok (task ${taskId})`);

    const leads = rows.map(
      (row) =>
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
        ),
    );

    const { inserted, skipped } = await this.leadRepository.saveMany(leads);
    this.logger.log(`Leads TikTok persistidos: ${inserted} nuevos, ${skipped} ya existentes`);

    return { taskId, fetched: rows.length, inserted, skipped };
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
