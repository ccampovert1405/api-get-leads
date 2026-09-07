import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ITokenRenewalPort, TokenExchangeResult } from '../../application/ports/token-renewal.port';

@Injectable()
export class MetaTokenExchangeService implements ITokenRenewalPort {
  private readonly logger = new Logger(MetaTokenExchangeService.name);
  private readonly graphBaseUrl = 'https://graph.facebook.com/v21.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Intercambia el token vigente por uno renovado usando fb_exchange_token.
   * Esto SOLO funciona si el token actual sigue siendo válido (no revocado);
   * es una extensión/renovación, no una recuperación de un token ya muerto.
   *
   * Nota de arquitectura: para un token verdaderamente permanente, la opción
   * más robusta es un System User Token de Business Manager (no expira nunca
   * salvo revocación manual). Este mecanismo de renovación periódica es una
   * red de seguridad adicional, útil mientras se usa un token derivado de
   * una cuenta personal.
   */
  async renew(currentAccessToken: string): Promise<TokenExchangeResult> {
    const appId = this.configService.get<string>('metaAds.appId');
    const appSecret = this.configService.get<string>('metaAds.appSecret');

    if (!appId || !appSecret) {
      throw new Error('META_APP_ID / META_APP_SECRET no configurados, no se puede renovar el token');
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.graphBaseUrl}/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: currentAccessToken,
          },
        }),
      );

      if (!data?.access_token) {
        throw new Error('Meta no devolvió un access_token en la respuesta de renovación');
      }

      return {
        accessToken: data.access_token,
        expiresInSeconds: typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : null,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const detail = (axiosError.response?.data as any)?.error?.message ?? axiosError.message;
      this.logger.error(`Error renovando token de Meta: ${detail}`);
      throw new Error(detail);
    }
  }
}
