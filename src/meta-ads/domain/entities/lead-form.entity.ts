export class LeadForm {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly status: string,
    public readonly leadsCount: number,
    public readonly pageId: string,
    public readonly pageName: string,
    public readonly createdTime: Date | null,
  ) {}
}
