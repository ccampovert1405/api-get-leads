import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../domain/entities/platform-credential.entity';

/**
 * Al arrancar la app, si no hay credencial de Meta en base de datos todavía,
 * la siembra desde META_ACCESS_TOKEN del .env. Esto permite migrar del modelo
 * "token estático en .env" al modelo "token gestionado en BD" sin pasos manuales:
 * el primer arranque hace la migración solo, los arranques siguientes no la tocan
 * (porque ya existe en BD, que es la fuente de verdad a partir de ahí).
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
    const existing = await this.credentialRepository.findByPlatform(Platform.META);

    if (existing) {
      return; // BD ya es la fuente de verdad, no sobreescribimos con el .env
    }

    const envToken = this.configService.get<string>('metaAds.accessToken');

    if (!envToken) {
      this.logger.warn(
        'No hay credencial de Meta en BD ni META_ACCESS_TOKEN en .env. ' +
          'La API de Meta no podrá autenticarse hasta que se configure un token.',
      );
      return;
    }

    await this.credentialRepository.upsert({
      platform: Platform.META,
      accessToken: envToken,
      expiresAt: null,
      lastRenewedAt: new Date(),
      lastRenewalStatus: 'OK',
      lastRenewalError: null,
    });

    this.logger.log('Credencial de Meta sembrada en BD desde META_ACCESS_TOKEN (.env).');
  }
}
