export enum LeadSource {
  META = 'META',
  TIKTOK = 'TIKTOK',
}

/**
 * rawPayload guarda la respuesta original de la plataforma (jsonb) para
 * trazabilidad/auditoría, sin forzar al dominio a conocer su forma exacta.
 */
export class Lead {
  public readonly campaignId: string | null;

  constructor(
    public readonly id: string,
    public readonly source: LeadSource,
    public readonly sourceLeadId: string,
    public readonly sourceCampaignId: string | null,
    public readonly formName: string | null,
    public readonly fullName: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly rawPayload: Record<string, unknown>,
    public readonly receivedAt: Date,
    public readonly createdAt: Date,
  ) {
    this.campaignId = sourceCampaignId;
  }

  hasContactInfo(): boolean {
    return Boolean(this.email || this.phone);
  }
}
