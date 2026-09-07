export class CampaignNotFoundException extends Error {
  constructor(id: string) {
    super(`Campaign with id ${id} not found`);
    this.name = 'CampaignNotFoundException';
  }
}

export class InvalidCampaignDataException extends Error {
  constructor(reason: string) {
    super(`Invalid campaign data: ${reason}`);
    this.name = 'InvalidCampaignDataException';
  }
}
