import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ICredentialUpsertData,
  IPlatformCredentialRepository,
} from '../../domain/repositories/platform-credential.repository.interface';
import { Platform, PlatformCredential } from '../../domain/entities/platform-credential.entity';
import { PlatformCredentialOrmEntity } from './entities/platform-credential.orm-entity';
import { PlatformCredentialMapper } from '../mappers/platform-credential.mapper';

@Injectable()
export class TypeOrmPlatformCredentialRepository implements IPlatformCredentialRepository {
  constructor(
    @InjectRepository(PlatformCredentialOrmEntity)
    private readonly repo: Repository<PlatformCredentialOrmEntity>,
  ) {}

  async findByPlatform(platform: Platform): Promise<PlatformCredential | null> {
    const found = await this.repo.findOne({ where: { platform } });
    return found ? PlatformCredentialMapper.toDomain(found) : null;
  }

  async upsert(data: ICredentialUpsertData): Promise<void> {
    await this.repo.upsert(
      {
        platform: data.platform,
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
        lastRenewedAt: data.lastRenewedAt,
        lastRenewalStatus: data.lastRenewalStatus,
        lastRenewalError: data.lastRenewalError,
      },
      ['platform'],
    );
  }
}
