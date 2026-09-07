import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ITikTokApiPort, RawLeadRow } from '../../application/ports/tiktok-api.port';
import { TikTokCampaign } from '../../domain/entities/tiktok-campaign.entity';
import { TikTokResponseMapper } from '../mappers/tiktok-response.mapper';
import { TikTokLeadCsvMapper } from '../mappers/tiktok-lead-csv.mapper';

@Injectable()
export class TikTokApiService implements ITikTokApiPort {
  private readonly logger = new Logger(TikTokApiService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('tiktokAds.baseUrl')!;
    this.accessToken = this.configService.get<string>('tiktokAds.accessToken')!;
  }

  async fetchCampaigns(advertiserId: string): Promise<TikTokCampaign[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/campaign/get/`, {
          headers: this.authHeaders(),
          params: {
            advertiser_id: advertiserId,
            fields: JSON.stringify([
              'campaign_id',
              'campaign_name',
              'operation_status',
              'objective_type',
              'budget',
              'create_time',
            ]),
            page_size: 100,
          },
        }),
      );

      this.assertOk(data);
      const list = data.data?.list ?? [];
      return TikTokResponseMapper.toDomainList(list);
    } catch (error) {
      this.handleTikTokError(error as AxiosError);
    }
  }

  /**
   * Paso 1 del flujo async de descarga de leads: crea la tarea de exportación.
   * Referencia: TikTok Business API - Lead Ads Export (page/lead/task/create).
   */
  async requestLeadsExportTask(params: {
    advertiserId: string;
    pageId: string;
    startDate: string;
    endDate: string;
  }): Promise<{ taskId: string }> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/page/lead/task/create/`,
          {
            advertiser_id: params.advertiserId,
            page_id: params.pageId,
            start_date: params.startDate,
            end_date: params.endDate,
          },
          { headers: this.authHeaders() },
        ),
      );

      this.assertOk(data);
      const taskId = data.data?.task_id;

      if (!taskId) {
        throw new HttpException('TikTok no devolvió un task_id de exportación', HttpStatus.BAD_GATEWAY);
      }

      return { taskId };
    } catch (error) {
      this.handleTikTokError(error as AxiosError);
    }
  }

  /** Paso 2: consulta el estado de la tarea hasta que quede lista con una URL de descarga. */
  async checkLeadsExportStatus(taskId: string): Promise<{
    status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
    downloadUrl?: string;
    failureReason?: string;
  }> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/page/lead/task/check/`, {
          headers: this.authHeaders(),
          params: { task_id: taskId },
        }),
      );

      this.assertOk(data);
      const status = data.data?.status as string;

      if (status === 'SUCCESS') {
        return { status: 'SUCCESS', downloadUrl: data.data?.download_url };
      }
      if (status === 'FAILED') {
        return { status: 'FAILED', failureReason: data.data?.reason ?? 'sin detalle' };
      }
      return { status: 'PROCESSING' };
    } catch (error) {
      this.handleTikTokError(error as AxiosError);
    }
  }

  /** Paso 3: descarga el CSV final y lo parsea a filas normalizadas. */
  async downloadAndParseLeads(downloadUrl: string): Promise<RawLeadRow[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(downloadUrl, { responseType: 'text' }),
      );

      return TikTokLeadCsvMapper.parse(data as string);
    } catch (error) {
      this.handleTikTokError(error as AxiosError);
    }
  }

  private authHeaders() {
    return { 'Access-Token': this.accessToken };
  }

  private assertOk(data: any): void {
    // TikTok Business API devuelve code=0 en éxito, distinto de cero en error,
    // incluso con status HTTP 200.
    if (data?.code !== undefined && data.code !== 0) {
      throw new HttpException(
        { message: 'Error de TikTok API', detail: data.message, tiktokCode: data.code },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private handleTikTokError(error: AxiosError | HttpException): never {
    if (error instanceof HttpException) {
      throw error;
    }

    const status = error.response?.status ?? HttpStatus.BAD_GATEWAY;
    const body = error.response?.data as any;

    this.logger.error(`TikTok API error: ${body?.message ?? error.message}`);

    throw new HttpException(
      {
        message: 'Error al consumir TikTok Business API',
        detail: body?.message ?? error.message,
        tiktokCode: body?.code,
      },
      status,
    );
  }
}
