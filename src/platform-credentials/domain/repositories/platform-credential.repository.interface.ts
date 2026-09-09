import { Platform, PlatformCredential } from '../entities/platform-credential.entity';

export interface ICredentialUpsertData {
  platform: Platform;
  accessToken: string;
  expiresAt?: Date | null;
  lastRenewedAt?: Date | null;
  lastRenewalStatus?: 'OK' | 'FAILED' | 'NEVER_RENEWED';
  lastRenewalError?: string | null;
  appId?: string | null;
  appSecret?: string | null;
  accountId?: string | null;
  apiUrl?: string | null;
  isActive?: boolean;
}

export interface IPlatformCredentialRepository {
  findByPlatform(platform: Platform): Promise<PlatformCredential | null>;
  findAll(): Promise<PlatformCredential[]>;
  upsert(data: ICredentialUpsertData): Promise<void>;
  deleteByPlatform(platform: Platform): Promise<void>;
}

export const PLATFORM_CREDENTIAL_REPOSITORY = Symbol('IPlatformCredentialRepository');
