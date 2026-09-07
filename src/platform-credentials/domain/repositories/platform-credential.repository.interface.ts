import { Platform, PlatformCredential } from '../entities/platform-credential.entity';

export interface ICredentialUpsertData {
  platform: Platform;
  accessToken: string;
  expiresAt: Date | null;
  lastRenewedAt: Date;
  lastRenewalStatus: 'OK' | 'FAILED';
  lastRenewalError: string | null;
}

export interface IPlatformCredentialRepository {
  findByPlatform(platform: Platform): Promise<PlatformCredential | null>;
  upsert(data: ICredentialUpsertData): Promise<void>;
}

export const PLATFORM_CREDENTIAL_REPOSITORY = Symbol('IPlatformCredentialRepository');
