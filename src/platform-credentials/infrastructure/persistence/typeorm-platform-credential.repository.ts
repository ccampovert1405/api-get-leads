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

  async findAll(): Promise<PlatformCredential[]> {
    const found = await this.repo.find({ order: { platform: 'ASC' } });
    return found.map((item) => PlatformCredentialMapper.toDomain(item));
  }

  async upsert(data: ICredentialUpsertData): Promise<void> {
    const existing = await this.repo.findOne({ where: { platform: data.platform } });

    if (existing) {
      if (data.accessToken !== undefined) existing.accessToken = data.accessToken;
      if (data.expiresAt !== undefined) existing.expiresAt = data.expiresAt;
      if (data.lastRenewedAt !== undefined) existing.lastRenewedAt = data.lastRenewedAt;
      if (data.lastRenewalStatus !== undefined) existing.lastRenewalStatus = data.lastRenewalStatus;
      if (data.lastRenewalError !== undefined) existing.lastRenewalError = data.lastRenewalError;
      if (data.appId !== undefined) existing.appId = data.appId;
      if (data.appSecret !== undefined) existing.appSecret = data.appSecret;
      if (data.accountId !== undefined) existing.accountId = data.accountId;
      if (data.apiUrl !== undefined) existing.apiUrl = data.apiUrl;
      if (data.isActive !== undefined) existing.isActive = data.isActive;
      await this.repo.save(existing);
    } else {
      const created = this.repo.create({
        platform: data.platform,
        accessToken: data.accessToken,
        expiresAt: data.expiresAt ?? null,
        lastRenewedAt: data.lastRenewedAt ?? null,
        lastRenewalStatus: data.lastRenewalStatus ?? 'NEVER_RENEWED',
        lastRenewalError: data.lastRenewalError ?? null,
        appId: data.appId ?? null,
        appSecret: data.appSecret ?? null,
        accountId: data.accountId ?? null,
        apiUrl: data.apiUrl ?? null,
        isActive: data.isActive ?? true,
      });
      await this.repo.save(created);
    }
  }

  async deleteByPlatform(platform: Platform): Promise<void> {
    await this.repo.delete({ platform });
  }
}
