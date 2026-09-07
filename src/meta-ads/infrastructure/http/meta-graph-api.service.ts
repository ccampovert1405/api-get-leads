import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { IMetaGraphApiPort, RawMetaLead } from '../../application/ports/meta-graph-api.port';
import { Campaign } from '../../domain/entities/campaign.entity';
import { MetaResponseMapper } from '../mappers/meta-response.mapper';
import { MetaLeadMapper } from '../mappers/meta-lead.mapper';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../../platform-credentials/domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../../platform-credentials/domain/entities/platform-credential.entity';

@Injectable()
export class MetaGraphApiService implements IMetaGraphApiPort {
  private readonly logger = new Logger(MetaGraphApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
  ) {
    this.baseUrl = this.configService.get<string>('metaAds.baseUrl')!;
  }

  async fetchCampaigns(adAccountId: string): Promise<Campaign[]> {
    const accessToken = await this.getCurrentAccessToken();

    try {
      let nextUrl: string | null = `${this.baseUrl}/${adAccountId}/campaigns`;
      let params: Record<string, any> | undefined = {
        fields: 'id,name,status,objective,daily_budget,created_time',
        limit: 100,
        access_token: accessToken,
      };

      const allRawData: any[] = [];
      let pageCount = 0;
      const MAX_PAGES = 10; // Hasta 1000 campañas por sincronización

      while (nextUrl && pageCount < MAX_PAGES) {
        const { data }: { data: any } = await firstValueFrom(
          this.httpService.get(nextUrl, { params }),
        );

        if (Array.isArray(data?.data)) {
          allRawData.push(...data.data);
        }

        // Si existe página siguiente, Graph API devuelve la URL completa con su cursor
        nextUrl = data?.paging?.next ?? null;
        params = undefined; // La URL paging.next ya incluye todos los parámetros
        pageCount++;
      }

      this.logger.log(`Obtenidas ${allRawData.length} campañas de Meta (${pageCount} páginas).`);
      return MetaResponseMapper.toDomainList(allRawData);
    } catch (error) {
      this.handleMetaError(error as AxiosError);
    }
  }

  async fetchCampaignInsights(campaignId: string, since: string, until: string): Promise<Campaign> {
    const accessToken = await this.getCurrentAccessToken();

    try {
      const url = `${this.baseUrl}/${campaignId}/insights`;
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            fields: 'impressions,clicks,spend,ctr,cost_per_action_type',
            time_range: JSON.stringify({ since, until }),
            access_token: accessToken,
          },
        }),
      );

      return MetaResponseMapper.toDomainWithInsights(campaignId, data.data[0]);
    } catch (error) {
      this.handleMetaError(error as AxiosError);
    }
  }

  async fetchCampaignLeads(campaignId: string): Promise<RawMetaLead[]> {
    const accessToken = await this.getCurrentAccessToken();

    try {
      let nextUrl: string | null = `${this.baseUrl}/${campaignId}/leads`;
      let params: Record<string, any> | undefined = {
        fields: 'id,created_time,campaign_id,ad_id,form_id,field_data',
        limit: 100,
        access_token: accessToken,
      };

      const allLeads: RawMetaLead[] = [];
      let pageCount = 0;
      const MAX_PAGES = 20; // Hasta 2000 leads por campaña

      while (nextUrl && pageCount < MAX_PAGES) {
        const { data }: { data: any } = await firstValueFrom(
          this.httpService.get(nextUrl, { params }),
        );

        if (Array.isArray(data?.data)) {
          for (const item of data.data) {
            allLeads.push(MetaLeadMapper.toRawMetaLead(item, campaignId));
          }
        }

        nextUrl = data?.paging?.next ?? null;
        params = undefined;
        pageCount++;
      }

      return allLeads;
    } catch (error) {
      // Si la campaña no tiene anuncios de leads o formulario, Meta responde con código de advertencia
      const axiosError = error as AxiosError;
      const metaError = (axiosError.response?.data as any)?.error;
      this.logger.warn(`No se pudieron obtener leads para campaña Meta ${campaignId}: ${metaError?.message ?? axiosError.message}`);
      return [];
    }
  }

  /**
   * Lee el token vigente desde platform_credentials (BD) en cada llamada.
   */
  private async getCurrentAccessToken(): Promise<string> {
    const credential = await this.credentialRepository.findByPlatform(Platform.META);

    if (!credential || !credential.accessToken) {
      throw new HttpException(
        'No hay un token de Meta configurado. Verifica platform_credentials o META_ACCESS_TOKEN en el primer arranque.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    if (credential.isExpired()) {
      this.logger.error('El token de Meta almacenado ya expiró. Se requiere renovación manual.');
      throw new HttpException(
        'El token de Meta expiró. Renueva manualmente vía POST /v1/platform-credentials/meta/renew o regenera desde Graph API Explorer.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    if (credential.isNearExpiration()) {
      this.logger.warn('El token de Meta está por expirar en menos de 7 días. La renovación semanal debería cubrir esto.');
    }

    return credential.accessToken;
  }

  private handleMetaError(error: AxiosError): never {
    const status = error.response?.status ?? HttpStatus.BAD_GATEWAY;
    const metaError = (error.response?.data as any)?.error;

    this.logger.error(`Meta API error: ${metaError?.message ?? error.message}`);

    throw new HttpException(
      {
        message: 'Error al consumir Meta Graph API',
        detail: metaError?.message ?? error.message,
        metaErrorCode: metaError?.code,
      },
      status,
    );
  }
}
