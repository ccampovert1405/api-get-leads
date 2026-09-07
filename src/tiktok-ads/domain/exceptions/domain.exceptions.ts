export class InvalidTikTokCampaignDataException extends Error {
  constructor(reason: string) {
    super(`Invalid TikTok campaign data: ${reason}`);
    this.name = 'InvalidTikTokCampaignDataException';
  }
}

export class TikTokLeadsExportFailedException extends Error {
  constructor(reason: string) {
    super(`No se pudo completar la exportación de leads de TikTok: ${reason}`);
    this.name = 'TikTokLeadsExportFailedException';
  }
}

export class TikTokLeadsExportTimeoutException extends Error {
  constructor(taskId: string) {
    super(`La exportación de leads de TikTok (task ${taskId}) excedió el tiempo de espera`);
    this.name = 'TikTokLeadsExportTimeoutException';
  }
}
