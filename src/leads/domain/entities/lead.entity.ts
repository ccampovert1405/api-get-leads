export enum LeadSource {
  META = 'META',
  TIKTOK = 'TIKTOK',
}

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
    public readonly cedula: string | null = null,
    public readonly submissionCount: number = 1,
    public readonly ciudadDeclarada: string | null = null,
    public readonly contactPreference: string | null = null,
    public readonly idCanton: number | null = null,
    public readonly idProvincia: number | null = null,
    public readonly idDependencia: string | null = null,
    public readonly lastSubmissionAt: Date | null = null,
    public readonly canton: { id: number; nombre: string } | null = null,
    public readonly provincia: { id: number; nombre: string } | null = null,
    public readonly dependencia: { id: string; nombre: string; codigo?: string | null } | null = null,
  ) {
    this.campaignId = sourceCampaignId;
  }

  hasContactInfo(): boolean {
    return Boolean(this.email || this.phone);
  }
}
