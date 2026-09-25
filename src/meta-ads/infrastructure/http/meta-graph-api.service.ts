import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { IMetaGraphApiPort, RawMetaLead } from '../../application/ports/meta-graph-api.port';
import { Campaign } from '../../domain/entities/campaign.entity';
import { LeadForm } from '../../domain/entities/lead-form.entity';
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

  private async getEffectiveBaseUrl(): Promise<string> {
    const credential = await this.credentialRepository.findByPlatform(Platform.META);
    return credential?.apiUrl || this.configService.get<string>('metaAds.baseUrl') || 'https://graph.facebook.com/v19.0';
  }

  async fetchCampaigns(adAccountId: string): Promise<Campaign[]> {
    const accessToken = await this.getCurrentAccessToken();
    const baseUrl = await this.getEffectiveBaseUrl();

    try {
      let nextUrl: string | null = `${baseUrl}/${adAccountId}/campaigns`;
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

    const baseUrl = await this.getEffectiveBaseUrl();

    try {
      const url = `${baseUrl}/${campaignId}/insights`;
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
    const baseUrl = await this.getEffectiveBaseUrl();

    try {
      let nextUrl: string | null = `${baseUrl}/${campaignId}/leads`;
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
      if (error instanceof HttpException) {
        throw error;
      }
      // Si la campaña no tiene anuncios de leads o formulario, Meta responde con código de advertencia
      const axiosError = error as AxiosError;
      const metaError = (axiosError.response?.data as any)?.error;
      this.logger.warn(`No se pudieron obtener leads para campaña Meta ${campaignId}: ${metaError?.message ?? axiosError.message}`);
      return [];
    }
  }

  /**
   * Resuelve las Páginas de Facebook objetivo según el pageId especificado
   * o autodescubre las páginas asociadas al token (/me y /me/accounts).
   */
  private async resolvePageTargets(
    pageId?: string,
  ): Promise<{ id: string; name: string; token: string }[]> {
    const accessToken = await this.getCurrentAccessToken();
    const baseUrl = await this.getEffectiveBaseUrl();
    const pageTargets: { id: string; name: string; token: string }[] = [];

    if (pageId) {
      pageTargets.push({ id: pageId, name: `Page ${pageId}`, token: accessToken });
    } else {
      // 1. Detectar si el token actual corresponde a una Página (/me)
      try {
        const { data: meData } = await firstValueFrom(
          this.httpService.get(`${baseUrl}/me`, {
            params: { fields: 'id,name,category', access_token: accessToken },
          }),
        );
        if (meData?.id) {
          pageTargets.push({
            id: meData.id,
            name: meData.name || `Page ${meData.id}`,
            token: accessToken,
          });
        }
      } catch (e: any) {
        this.logger.debug(`No se pudo resolver /me como página: ${e?.message}`);
      }

      // 2. Si el token es de usuario con acceso a varias páginas (/me/accounts)
      try {
        const { data: accountsData } = await firstValueFrom(
          this.httpService.get(`${baseUrl}/me/accounts`, {
            params: { fields: 'id,name,access_token', access_token: accessToken },
          }),
        );
        if (Array.isArray(accountsData?.data)) {
          for (const acc of accountsData.data) {
            if (acc.id && !pageTargets.some((p) => p.id === acc.id)) {
              pageTargets.push({
                id: acc.id,
                name: acc.name || `Page ${acc.id}`,
                token: acc.access_token || accessToken,
              });
            }
          }
        }
      } catch (e: any) {
        // Ignorar si el token no tiene permisos de accounts o ya es Page Token
      }
    }

    return pageTargets;
  }

  /**
   * Obtiene todos los formularios de Lead Ads (Instant Forms) de una página específica con paginación.
   */
  private async fetchFormsForPage(page: { id: string; name: string; token: string }): Promise<any[]> {
    const baseUrl = await this.getEffectiveBaseUrl();
    let formsUrl: string | null = `${baseUrl}/${page.id}/leadgen_forms`;
    let formsParams: Record<string, any> | undefined = {
      fields: 'id,name,status,leads_count,created_time',
      limit: 100,
      access_token: page.token,
    };

    const allForms: any[] = [];
    while (formsUrl && allForms.length < 200) {
      const { data: fData }: { data: any } = await firstValueFrom(
        this.httpService.get(formsUrl, { params: formsParams }),
      );
      if (Array.isArray(fData?.data)) {
        allForms.push(...fData.data);
      }
      formsUrl = fData?.paging?.next ?? null;
      formsParams = undefined;
    }

    return allForms;
  }

  /**
   * Lista los formularios de Lead Ads (Instant Forms) asociados a las páginas de Meta.
   */
  async fetchPageLeadForms(pageId?: string): Promise<LeadForm[]> {
    try {
      const pageTargets = await this.resolvePageTargets(pageId);

      if (pageTargets.length === 0) {
        this.logger.warn('No se detectaron Páginas de Facebook asociadas al token para consultar formularios.');
        return [];
      }

      const allLeadForms: LeadForm[] = [];

      for (const page of pageTargets) {
        this.logger.log(`Consultando formularios instantáneos para página ${page.name} (${page.id})...`);
        try {
          const forms = await this.fetchFormsForPage(page);
          this.logger.log(`Encontrados ${forms.length} formularios en página ${page.name}.`);

          for (const f of forms) {
            const createdTime = f.created_time ? new Date(f.created_time) : null;
            allLeadForms.push(
              new LeadForm(
                f.id,
                f.name || `Form ${f.id}`,
                f.status || 'ACTIVE',
                Number(f.leads_count ?? 0),
                page.id,
                page.name,
                createdTime && !Number.isNaN(createdTime.getTime()) ? createdTime : null,
              ),
            );
          }
        } catch (pageErr: any) {
          const errMsg = pageErr?.response?.data?.error?.message ?? pageErr.message;
          this.logger.warn(`No se pudieron extraer formularios para página ${page.id}: ${errMsg}`);
        }
      }

      return allLeadForms;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al listar formularios de Meta: ${error?.message || error}`);
      return [];
    }
  }

  /**
   * Extrae leads directamente desde los formularios instantáneos (Leadgen Forms)
   * de la(s) Página(s) de Facebook asociadas al token.
   */
  async fetchPageLeadgenFormsLeads(pageId?: string): Promise<RawMetaLead[]> {
    const baseUrl = await this.getEffectiveBaseUrl();

    try {
      const pageTargets = await this.resolvePageTargets(pageId);

      if (pageTargets.length === 0) {
        this.logger.warn('No se detectaron Páginas de Facebook asociadas al token para consultar formularios.');
        return [];
      }

      const allLeads: RawMetaLead[] = [];

      for (const page of pageTargets) {
        this.logger.log(`Consultando formularios instantáneos para página ${page.name} (${page.id})...`);
        try {
          const allForms = await this.fetchFormsForPage(page);
          this.logger.log(`Encontrados ${allForms.length} formularios en página ${page.name}.`);

          for (const form of allForms) {
            let leadsUrl: string | null = `${baseUrl}/${form.id}/leads`;
            let leadsParams: Record<string, any> | undefined = {
              fields: 'id,created_time,campaign_id,ad_id,form_id,field_data',
              limit: 100,
              access_token: page.token,
            };

            let formPageCount = 0;
            while (leadsUrl && formPageCount < 20) {
              const { data: lData }: { data: any } = await firstValueFrom(
                this.httpService.get(leadsUrl, { params: leadsParams }),
              );
              if (Array.isArray(lData?.data)) {
                for (const item of lData.data) {
                  allLeads.push(MetaLeadMapper.toRawMetaLead(item, undefined, form.name));
                }
              }
              leadsUrl = lData?.paging?.next ?? null;
              leadsParams = undefined;
              formPageCount++;
            }
          }
        } catch (pageErr: any) {
          const errMsg = pageErr?.response?.data?.error?.message ?? pageErr.message;
          this.logger.warn(`No se pudieron extraer formularios para página ${page.id}: ${errMsg}`);
        }
      }

      this.logger.log(`Total leads obtenidos desde formularios de Páginas de Meta: ${allLeads.length}`);
      return allLeads;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al extraer leads de formularios Meta: ${error?.message || error}`);
      return [];
    }
  }

  /**
   * Lee el token vigente desde platform_credentials (BD) en cada llamada.
   */
  private async getCurrentAccessToken(): Promise<string> {
    const credential = await this.credentialRepository.findByPlatform(Platform.META);
    const token = credential?.accessToken || this.configService.get<string>('metaAds.accessToken');

    if (!token || token.trim().length === 0 || token.startsWith('tu_')) {
      throw new HttpException(
        'Las variables de Meta Ads no están configuradas en el sistema. Debe comunicarse con el Administrador para configurar las variables y poder extraer los leads.',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (credential && credential.isExpired()) {
      this.logger.error('El token de Meta almacenado ya expiró. Se requiere renovación manual.');
      throw new HttpException(
        'El token de Meta expiró. Renueva las credenciales en la sección de Variables o solicita asistencia al Administrador.',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (credential && credential.isNearExpiration()) {
      this.logger.warn('El token de Meta está por expirar en menos de 7 días. La renovación semanal debería cubrir esto.');
    }

    return token;
  }

  private handleMetaError(error: AxiosError | any): never {
    if (error instanceof HttpException) {
      throw error;
    }

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
