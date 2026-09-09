import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import { GetCredentialStatusUseCase } from '../../application/use-cases/get-credential-status.use-case';
import { RenewMetaTokenUseCase } from '../../application/use-cases/renew-meta-token.use-case';
import { Platform } from '../../domain/entities/platform-credential.entity';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../domain/repositories/platform-credential.repository.interface';
import { RequireSuperAdminGuard } from '../../../auth/guards/require-super-admin.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { UpdatePlatformCredentialDto } from '../../application/dtos/update-platform-credential.dto';
import { SyncScheduleOrmEntity } from '../../../sync-schedules/infrastructure/persistence/entities/sync-schedule.orm-entity';

function maskValue(val?: string | null): string {
  if (!val || val.trim().length === 0) return '';
  if (val.length <= 8) return '********';
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

@ApiTags('platform-credentials')
@ApiBearerAuth()
@Controller('platform-credentials')
export class PlatformCredentialsController {
  private readonly logger = new Logger(PlatformCredentialsController.name);

  constructor(
    private readonly getCredentialStatusUseCase: GetCredentialStatusUseCase,
    private readonly renewMetaTokenUseCase: RenewMetaTokenUseCase,
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
    @InjectRepository(SyncScheduleOrmEntity)
    private readonly syncScheduleRepo: Repository<SyncScheduleOrmEntity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Endpoint de diagnóstico y estado del sistema.
   * Accesible por cualquier usuario autenticado para saber si las variables y el crontab están activos.
   */
  @Get('system-status')
  @ApiOperation({ summary: 'Verifica el estado de configuración de variables y programación de sincronización' })
  async getSystemStatus() {
    const metaCred = await this.credentialRepository.findByPlatform(Platform.META);
    const tiktokCred = await this.credentialRepository.findByPlatform(Platform.TIKTOK);

    // Fallbacks de .env si no existen en BD
    const metaEnvToken = this.configService.get<string>('metaAds.accessToken');
    const metaEnvAccount = this.configService.get<string>('metaAds.adAccountId');
    const tiktokEnvToken = this.configService.get<string>('tiktokAds.accessToken');
    const tiktokEnvAccount = this.configService.get<string>('tiktokAds.advertiserId');

    const metaToken = metaCred?.accessToken || metaEnvToken || '';
    const metaAccount = metaCred?.accountId || metaEnvAccount || '';
    const metaConfigured = Boolean(
      metaCred?.isConfigured() ||
        (metaToken && !metaToken.startsWith('tu_') && metaAccount && !metaAccount.includes('tu_')),
    );

    const tiktokToken = tiktokCred?.accessToken || tiktokEnvToken || '';
    const tiktokAccount = tiktokCred?.accountId || tiktokEnvAccount || '';
    const tiktokConfigured = Boolean(
      tiktokCred?.isConfigured() ||
        (tiktokToken && !tiktokToken.startsWith('tu_') && tiktokAccount && !tiktokAccount.includes('tu_')),
    );

    const schedule = await this.syncScheduleRepo.findOne({
      where: { name: 'sincronizacion-campanas-predeterminada' },
    });

    const isSyncActive = schedule ? schedule.isEnabled : true;
    const canExtractLeads = metaConfigured || tiktokConfigured;

    return {
      meta: {
        configured: metaConfigured,
        hasAccessToken: Boolean(metaToken && !metaToken.startsWith('tu_')),
        hasAdAccountId: Boolean(metaAccount && !metaAccount.includes('tu_')),
        adAccountId: maskValue(metaAccount),
        isActive: metaCred?.isActive ?? true,
        isExpired: metaCred?.isExpired() ?? false,
      },
      tiktok: {
        configured: tiktokConfigured,
        hasAccessToken: Boolean(tiktokToken && !tiktokToken.startsWith('tu_')),
        hasAdvertiserId: Boolean(tiktokAccount && !tiktokAccount.includes('tu_')),
        advertiserId: maskValue(tiktokAccount),
        isActive: tiktokCred?.isActive ?? true,
      },
      syncSchedule: {
        isEnabled: isSyncActive,
        cronExpression: schedule
          ? `${schedule.minute} ${schedule.hour} * * ${schedule.daysOfWeek.join(',')}`
          : '0 8 * * 1,2,3,4,5',
      },
      variablesConfigured: metaConfigured && tiktokConfigured,
      canExtractLeads,
      message: !canExtractLeads
        ? 'Las variables de entorno de Meta Ads y TikTok Ads no están configuradas en el sistema. Debe comunicarse con el Administrador para configurar las variables y poder extraer los leads.'
        : !isSyncActive
        ? 'La sincronización automática de campañas y leads se encuentra inactiva. Comuníquese con el administrador para activarla o habilítela en la programación Crontab.'
        : null,
    };
  }

  /**
   * Lista todas las credenciales/variables.
   * EXCLUSIVO PARA SUPER ADMINISTRADOR.
   */
  @Get()
  @UseGuards(RequireSuperAdminGuard)
  @ApiOperation({ summary: 'Lista todas las variables de plataformas (Solo Super Administrador)' })
  async getAllCredentials() {
    const list = await this.credentialRepository.findAll();
    const map = new Map(list.map((c) => [c.platform, c]));

    const platforms = [Platform.META, Platform.TIKTOK];
    return platforms.map((p) => {
      const c = map.get(p);
      const isMeta = p === Platform.META;
      const defaultUrl = isMeta
        ? this.configService.get<string>('metaAds.baseUrl') || 'https://graph.facebook.com/v19.0'
        : this.configService.get<string>('tiktokAds.baseUrl') || 'https://business-api.tiktok.com/open_api/v1.3';

      return {
        platform: p,
        accessToken: c?.accessToken || '',
        accessTokenMasked: maskValue(c?.accessToken),
        appId: c?.appId || (isMeta ? this.configService.get<string>('metaAds.appId') : this.configService.get<string>('tiktokAds.appId')) || '',
        appSecret: c?.appSecret || (isMeta ? this.configService.get<string>('metaAds.appSecret') : this.configService.get<string>('tiktokAds.appSecret')) || '',
        appSecretMasked: maskValue(c?.appSecret),
        accountId: c?.accountId || (isMeta ? this.configService.get<string>('metaAds.adAccountId') : this.configService.get<string>('tiktokAds.advertiserId')) || '',
        apiUrl: c?.apiUrl || defaultUrl,
        isActive: c?.isActive ?? true,
        isConfigured: c ? c.isConfigured() : false,
        expiresAt: c?.expiresAt || null,
        lastRenewedAt: c?.lastRenewedAt || null,
        lastRenewalStatus: c?.lastRenewalStatus || 'NEVER_RENEWED',
        lastRenewalError: c?.lastRenewalError || null,
        updatedAt: c?.updatedAt || null,
      };
    });
  }

  /**
   * Detalle de variables de una plataforma específica.
   * EXCLUSIVO PARA SUPER ADMINISTRADOR.
   */
  @Get(':platform')
  @UseGuards(RequireSuperAdminGuard)
  @ApiOperation({ summary: 'Obtiene las variables de una plataforma (Solo Super Administrador)' })
  async getByPlatform(@Param('platform') platformStr: string) {
    const platform = platformStr.toUpperCase() as Platform;
    const c = await this.credentialRepository.findByPlatform(platform);

    const isMeta = platform === Platform.META;
    const defaultUrl = isMeta
      ? this.configService.get<string>('metaAds.baseUrl') || 'https://graph.facebook.com/v19.0'
      : this.configService.get<string>('tiktokAds.baseUrl') || 'https://business-api.tiktok.com/open_api/v1.3';

    return {
      platform,
      accessToken: c?.accessToken || '',
      accessTokenMasked: maskValue(c?.accessToken),
      appId: c?.appId || (isMeta ? this.configService.get<string>('metaAds.appId') : this.configService.get<string>('tiktokAds.appId')) || '',
      appSecret: c?.appSecret || (isMeta ? this.configService.get<string>('metaAds.appSecret') : this.configService.get<string>('tiktokAds.appSecret')) || '',
      appSecretMasked: maskValue(c?.appSecret),
      accountId: c?.accountId || (isMeta ? this.configService.get<string>('metaAds.adAccountId') : this.configService.get<string>('tiktokAds.advertiserId')) || '',
      apiUrl: c?.apiUrl || defaultUrl,
      isActive: c?.isActive ?? true,
      isConfigured: c ? c.isConfigured() : false,
      expiresAt: c?.expiresAt || null,
      lastRenewedAt: c?.lastRenewedAt || null,
      lastRenewalStatus: c?.lastRenewalStatus || 'NEVER_RENEWED',
      lastRenewalError: c?.lastRenewalError || null,
      updatedAt: c?.updatedAt || null,
    };
  }

  /**
   * Actualiza las variables de una plataforma.
   * EXCLUSIVO PARA SUPER ADMINISTRADOR.
   */
  @Put(':platform')
  @UseGuards(RequireSuperAdminGuard)
  @ApiOperation({ summary: 'Actualiza las variables de una plataforma (Solo Super Administrador)' })
  async updatePlatform(
    @Param('platform') platformStr: string,
    @Body() dto: UpdatePlatformCredentialDto,
  ) {
    const platform = platformStr.toUpperCase() as Platform;
    const existing = await this.credentialRepository.findByPlatform(platform);

    let accessToken = dto.accessToken;
    if (accessToken && (accessToken.includes('...') || accessToken.trim() === '********')) {
      accessToken = existing?.accessToken || '';
    }

    let appSecret = dto.appSecret;
    if (appSecret && (appSecret.includes('...') || appSecret.trim() === '********')) {
      appSecret = existing?.appSecret || '';
    }

    await this.credentialRepository.upsert({
      platform,
      accessToken: accessToken ?? existing?.accessToken ?? '',
      appId: dto.appId !== undefined ? dto.appId : existing?.appId ?? null,
      appSecret: appSecret !== undefined ? appSecret : existing?.appSecret ?? null,
      accountId: dto.accountId !== undefined ? dto.accountId : existing?.accountId ?? null,
      apiUrl: dto.apiUrl !== undefined ? dto.apiUrl : existing?.apiUrl ?? null,
      isActive: dto.isActive !== undefined ? dto.isActive : existing?.isActive ?? true,
      lastRenewedAt: new Date(),
      lastRenewalStatus: 'OK',
      lastRenewalError: null,
    });

    this.logger.log(`Variables de plataforma [${platform}] actualizadas por el Super Administrador.`);
    return this.getByPlatform(platform);
  }

  /**
   * Prueba de conexión en caliente contra la API externa.
   * EXCLUSIVO PARA SUPER ADMINISTRADOR.
   */
  @Post(':platform/test')
  @UseGuards(RequireSuperAdminGuard)
  @ApiOperation({ summary: 'Prueba la conectividad con la API externa usando las credenciales guardadas' })
  async testConnection(@Param('platform') platformStr: string) {
    const platform = platformStr.toUpperCase() as Platform;
    const c = await this.credentialRepository.findByPlatform(platform);

    const isMeta = platform === Platform.META;
    const token = c?.accessToken || (isMeta ? this.configService.get('metaAds.accessToken') : this.configService.get('tiktokAds.accessToken'));
    const account = c?.accountId || (isMeta ? this.configService.get('metaAds.adAccountId') : this.configService.get('tiktokAds.advertiserId'));
    const apiUrl = c?.apiUrl || (isMeta ? this.configService.get('metaAds.baseUrl') : this.configService.get('tiktokAds.baseUrl'));

    if (!token || token.startsWith('tu_') || token.trim().length === 0) {
      return {
        success: false,
        message: 'No hay un token de acceso válido configurado para realizar la prueba.',
      };
    }

    try {
      if (isMeta) {
        // Test Meta Graph API llamando al endpoint /me o al endpoint de la cuenta
        const url = account ? `${apiUrl}/${account}` : `${apiUrl}/me`;
        const res = await firstValueFrom(
          this.httpService.get(url, {
            params: { access_token: token, fields: 'id,name' },
          }),
        );
        return {
          success: true,
          message: `Conexión exitosa con Meta Graph API. Cuenta identificada: ${res.data?.name || res.data?.id || 'OK'}`,
          data: res.data,
        };
      } else {
        // Test TikTok Business API llamando a /user/info/
        const url = `${apiUrl}/user/info/`;
        const res = await firstValueFrom(
          this.httpService.get(url, {
            headers: { 'Access-Token': token },
          }),
        );
        if (res.data?.code === 0) {
          return {
            success: true,
            message: `Conexión exitosa con TikTok Business API: ${res.data?.message || 'OK'}`,
            data: res.data?.data,
          };
        } else {
          return {
            success: false,
            message: `TikTok API devolvió código ${res.data?.code}: ${res.data?.message || 'Error'}`,
          };
        }
      }
    } catch (error: any) {
      const detail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      return {
        success: false,
        message: `Fallo al conectar con ${platform}: ${detail}`,
      };
    }
  }

  @Get('meta/status')
  @ApiOperation({ summary: 'Muestra el estado del token de Meta (sin exponer el token en sí)' })
  async getMetaStatus() {
    const credential = await this.getCredentialStatusUseCase.execute(Platform.META);

    if (!credential) {
      return { configured: false };
    }

    return {
      configured: true,
      hasToken: Boolean(credential.accessToken),
      expiresAt: credential.expiresAt,
      isNearExpiration: credential.isNearExpiration(),
      isExpired: credential.isExpired(),
      lastRenewedAt: credential.lastRenewedAt,
      lastRenewalStatus: credential.lastRenewalStatus,
      lastRenewalError: credential.lastRenewalError,
    };
  }

  @Post('meta/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fuerza una renovación inmediata del token de Meta' })
  async renewMeta() {
    return this.renewMetaTokenUseCase.execute();
  }

  @Get('swagger/status')
  @RequirePermissions({
    identificador: 'swagger.read',
    nombre: 'Ver APIs Asignadas Swagger RBAC',
  })
  @ApiOperation({ summary: 'Verificación de acceso a la consola de APIs Asignadas Swagger RBAC' })
  async getSwaggerStatus() {
    return { status: 'ok', enabled: true };
  }
}
