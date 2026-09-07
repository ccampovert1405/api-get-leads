import { Platform, PlatformCredential, RenewalStatus } from '../../domain/entities/platform-credential.entity';
import { PlatformCredentialOrmEntity } from '../persistence/entities/platform-credential.orm-entity';

export class PlatformCredentialMapper {
  static toDomain(orm: PlatformCredentialOrmEntity): PlatformCredential {
    return new PlatformCredential(
      orm.id,
      orm.platform as Platform,
      orm.accessToken,
      orm.expiresAt,
      orm.lastRenewedAt,
      orm.lastRenewalStatus as RenewalStatus,
      orm.lastRenewalError,
      orm.updatedAt,
    );
  }
}
