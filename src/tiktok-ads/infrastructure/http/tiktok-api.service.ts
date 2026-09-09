import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ITikTokApiPort, RawLeadRow } from '../../application/ports/tiktok-api.port';
import { TikTokCampaign } from '../../domain/entities/tiktok-campaign.entity';
import { TikTokResponseMapper } from '../mappers/tiktok-response.mapper';
import { TikTokLeadCsvMapper } from '../mappers/tiktok-lead-csv.mapper';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../../platform-credentials/domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../../platform-credentials/domain/entities/platform-credential.entity';

@Injectable()
export class TikTokApiService implements ITikTokApiPort {
  private readonly logger = new Logger(TikTokApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
  ) {}

  private async getEffectiveBaseUrl(): Promise<string> {
    const cred = await this.credentialRepository.findByPlatform(Platform.TIKTOK);
    return cred?.apiUrl || this.configService.get<string>('tiktokAds.baseUrl') || 'https://business-api.tiktok.com/open_api/v1.3';
  }

  private async getEffectiveAccessToken(): Promise<string> {
    const cred = await this.credentialRepository.findByPlatform(Platform.TIKTOK);
    const token = cred?.accessToken || this.configService.get<string>('tiktokAds.accessToken');

    if (!token || token.trim().length === 0 || token.startsWith('tu_')) {
      throw new HttpException(
        'Las variables de TikTok Ads no están configuradas en el sistema. Debe comunicarse con el Administrador para configurar las variables y poder extraer los leads.',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    return token;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getEffectiveAccessToken();
    return { 'Access-Token': token };
  }

  async fetchCampaigns(advertiserId: string): Promise<TikTokCampaign[]> {
    const baseUrl = await this.getEffectiveBaseUrl();
    const headers = await this.authHeaders();

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${baseUrl}/campaign/get/`, {
          headers,
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
    const baseUrl = await this.getEffectiveBaseUrl();
    const headers = await this.authHeaders();

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/page/lead/task/create/`,
          {
            advertiser_id: params.advertiserId,
            page_id: params.pageId,
            start_date: params.startDate,
            end_date: params.endDate,
          },
          { headers },
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
    const baseUrl = await this.getEffectiveBaseUrl();
    const headers = await this.authHeaders();

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${baseUrl}/page/lead/task/check/`, {
          headers,
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

  private assertOk(data: any): void {
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
