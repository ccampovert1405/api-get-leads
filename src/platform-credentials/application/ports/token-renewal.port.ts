export interface TokenExchangeResult {
  accessToken: string;
  /** Segundos hasta expirar. undefined/null si Meta no reporta expiración (token permanente). */
  expiresInSeconds: number | null;
}

/**
 * Puerto genérico de renovación de token. Cada plataforma (Meta hoy, TikTok más
 * adelante si aplica) implementa esto en infraestructura sin que application
 * conozca los detalles HTTP concretos de cada API externa.
 */
export interface ITokenRenewalPort {
  renew(currentAccessToken: string, appId: string, appSecret: string): Promise<TokenExchangeResult>;
}

export const META_TOKEN_RENEWAL_PORT = Symbol('ITokenRenewalPort_Meta');
