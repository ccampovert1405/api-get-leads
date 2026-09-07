import { Inject, Injectable } from '@nestjs/common';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../domain/repositories/platform-credential.repository.interface';
import { Platform, PlatformCredential } from '../../domain/entities/platform-credential.entity';

@Injectable()
export class GetCredentialStatusUseCase {
  constructor(
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
  ) {}

  async execute(platform: Platform): Promise<PlatformCredential | null> {
    return this.credentialRepository.findByPlatform(platform);
  }
}
