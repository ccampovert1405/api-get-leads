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
  ) {}

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
