export enum Platform {
  META = 'META',
  TIKTOK = 'TIKTOK',
}

export enum RenewalStatus {
  OK = 'OK',
  FAILED = 'FAILED',
  NEVER_RENEWED = 'NEVER_RENEWED',
}

/**
 * Representa el token de acceso vigente de una plataforma externa (Meta, TikTok),
 * gestionado en base de datos en vez de en variables de entorno estáticas, para
 * poder renovarlo en caliente sin necesidad de un redeploy.
 */
export class PlatformCredential {
  constructor(
    public readonly id: string,
    public readonly platform: Platform,
    public readonly accessToken: string,
    public readonly expiresAt: Date | null, // null = sin expiración conocida (ej. System User token)
    public readonly lastRenewedAt: Date | null,
    public readonly lastRenewalStatus: RenewalStatus,
    public readonly lastRenewalError: string | null,
    public readonly updatedAt: Date,
    public readonly appId: string | null = null,
    public readonly appSecret: string | null = null,
    public readonly accountId: string | null = null,
    public readonly apiUrl: string | null = null,
    public readonly isActive: boolean = true,
  ) {}

  /**
   * Determina si la credencial está completamente configurada para operar en vivo
   * (tiene token válido, no expirado, y cuenta asignada sin valores por defecto de plantilla).
   */
  isConfigured(): boolean {
    if (!this.isActive) return false;
    const token = this.accessToken?.trim() || '';
    const account = this.accountId?.trim() || '';
    const hasToken = token.length > 0 && !token.startsWith('tu_') && token !== 'placeholder';
    const hasAccount = account.length > 0 && !account.includes('tu_') && account !== 'placeholder';
    return hasToken && hasAccount && !this.isExpired();
  }

  /** Considera "por vencer" si expira en menos de 7 días, para renovar con margen. */
  isNearExpiration(): boolean {
    if (!this.expiresAt) return false;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return this.expiresAt.getTime() - Date.now() < sevenDaysMs;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt.getTime() < Date.now();
  }
}
