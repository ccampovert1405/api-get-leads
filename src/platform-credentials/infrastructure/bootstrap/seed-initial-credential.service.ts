import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../domain/entities/platform-credential.entity';

/**
 * Al arrancar la app, si no hay credenciales de Meta o TikTok en base de datos todavía,
 * las siembra desde las variables de entorno (.env). Esto permite que la base de datos
 * sea la fuente de verdad y que el Super Administrador las pueda editar dinámicamente.
 */
@Injectable()
export class SeedInitialCredentialService implements OnModuleInit {
  private readonly logger = new Logger(SeedInitialCredentialService.name);

  constructor(
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedMeta();
    await this.seedTikTok();
  }

  private async seedMeta(): Promise<void> {
    const existing = await this.credentialRepository.findByPlatform(Platform.META);
    if (existing) return;

    const envToken = this.configService.get<string>('metaAds.accessToken') || '';
    const envAppId = this.configService.get<string>('metaAds.appId') || '';
    const envAppSecret = this.configService.get<string>('metaAds.appSecret') || '';
    const envAccountId = this.configService.get<string>('metaAds.adAccountId') || '';
    const envBaseUrl = this.configService.get<string>('metaAds.baseUrl') || 'https://graph.facebook.com/v19.0';

    await this.credentialRepository.upsert({
      platform: Platform.META,
      accessToken: envToken,
      appId: envAppId,
      appSecret: envAppSecret,
      accountId: envAccountId,
      apiUrl: envBaseUrl,
      isActive: true,
      expiresAt: null,
      lastRenewedAt: new Date(),
      lastRenewalStatus: envToken ? 'OK' : 'NEVER_RENEWED',
      lastRenewalError: null,
    });

    this.logger.log('Variables de Meta Ads sembradas en BD desde configuración inicial.');
  }

  private async seedTikTok(): Promise<void> {
    const existing = await this.credentialRepository.findByPlatform(Platform.TIKTOK);
    if (existing) return;

    const envToken = this.configService.get<string>('tiktokAds.accessToken') || '';
    const envAppId = this.configService.get<string>('tiktokAds.appId') || '';
    const envAppSecret = this.configService.get<string>('tiktokAds.appSecret') || '';
    const envAccountId = this.configService.get<string>('tiktokAds.advertiserId') || '';
    const envBaseUrl = this.configService.get<string>('tiktokAds.baseUrl') || 'https://business-api.tiktok.com/open_api/v1.3';

    await this.credentialRepository.upsert({
      platform: Platform.TIKTOK,
      accessToken: envToken,
      appId: envAppId,
      appSecret: envAppSecret,
      accountId: envAccountId,
      apiUrl: envBaseUrl,
      isActive: true,
      expiresAt: null,
      lastRenewedAt: new Date(),
      lastRenewalStatus: envToken ? 'OK' : 'NEVER_RENEWED',
      lastRenewalError: null,
    });

    this.logger.log('Variables de TikTok Ads sembradas en BD desde configuración inicial.');
  }
}
