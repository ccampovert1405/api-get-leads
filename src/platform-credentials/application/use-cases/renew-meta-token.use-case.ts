import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../domain/entities/platform-credential.entity';
import { ITokenRenewalPort, META_TOKEN_RENEWAL_PORT } from '../ports/token-renewal.port';

export interface RenewTokenResult {
  renewed: boolean;
  expiresAt: Date | null;
  error?: string;
}

@Injectable()
export class RenewMetaTokenUseCase {
  private readonly logger = new Logger(RenewMetaTokenUseCase.name);

  constructor(
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
    @Inject(META_TOKEN_RENEWAL_PORT)
    private readonly tokenRenewal: ITokenRenewalPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(): Promise<RenewTokenResult> {
    const current = await this.credentialRepository.findByPlatform(Platform.META);

    if (!current) {
      const msg = 'No hay credencial de Meta registrada aún (falta el seed inicial)';
      this.logger.warn(msg);
      return { renewed: false, expiresAt: null, error: msg };
    }

    const appId = current.appId || this.configService.get<string>('metaAds.appId');
    const appSecret = current.appSecret || this.configService.get<string>('metaAds.appSecret');

    if (!appId || !appSecret) {
      const msg =
        'META_APP_ID / META_APP_SECRET no configurados en BD ni en variables de entorno, no se puede renovar el token';
      this.logger.warn(msg);
      return { renewed: false, expiresAt: current.expiresAt, error: msg };
    }

    try {
      const result = await this.tokenRenewal.renew(current.accessToken, appId, appSecret);

      const expiresAt = result.expiresInSeconds
        ? new Date(Date.now() + result.expiresInSeconds * 1000)
        : null;

      await this.credentialRepository.upsert({
        platform: Platform.META,
        accessToken: result.accessToken,
        expiresAt,
        lastRenewedAt: new Date(),
        lastRenewalStatus: 'OK',
        lastRenewalError: null,
      });

      this.logger.log(
        `Token de Meta renovado correctamente. ` +
          (expiresAt ? `Nueva expiración: ${expiresAt.toISOString()}` : 'Sin expiración reportada.'),
      );

      return { renewed: true, expiresAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Fallo al renovar el token de Meta: ${message}`);

      // Registramos el fallo pero NO borramos el token vigente: sigue siendo
      // usable hasta que realmente expire o sea revocado.
      await this.credentialRepository.upsert({
        platform: Platform.META,
        accessToken: current.accessToken,
        expiresAt: current.expiresAt,
        lastRenewedAt: current.lastRenewedAt ?? new Date(),
        lastRenewalStatus: 'FAILED',
        lastRenewalError: message,
      });

      return { renewed: false, expiresAt: current.expiresAt, error: message };
    }
  }
}
