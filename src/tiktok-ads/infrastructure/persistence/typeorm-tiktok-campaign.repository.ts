import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITikTokCampaignRepository } from '../../domain/repositories/tiktok-campaign.repository.interface';
import { TikTokCampaign } from '../../domain/entities/tiktok-campaign.entity';
import { TikTokCampaignOrmEntity } from './entities/tiktok-campaign.orm-entity';
import { TikTokCampaignMapper } from '../mappers/tiktok-campaign.mapper';

@Injectable()
export class TypeOrmTikTokCampaignRepository implements ITikTokCampaignRepository {
  private readonly logger = new Logger(TypeOrmTikTokCampaignRepository.name);

  constructor(
    @InjectRepository(TikTokCampaignOrmEntity)
    private readonly repo: Repository<TikTokCampaignOrmEntity>,
  ) {}

  async saveMany(campaigns: TikTokCampaign[]): Promise<void> {
    const ormEntities = campaigns.map((c) => TikTokCampaignMapper.toOrm(c));
    await this.withRetry(() => this.repo.upsert(ormEntities, ['tiktokCampaignId']));
  }

  async findByTikTokId(tiktokCampaignId: string): Promise<TikTokCampaign | null> {
    const found = await this.repo.findOne({ where: { tiktokCampaignId } });
    return found ? TikTokCampaignMapper.toDomain(found) : null;
  }

  async findAll(): Promise<TikTokCampaign[]> {
    const all = await this.repo.find({ order: { createdAt: 'DESC' } });
    return all.map((e) => TikTokCampaignMapper.toDomain(e));
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) {
        this.logger.error('Fallaron todos los reintentos de persistencia', error as Error);
        throw error;
      }
      this.logger.warn(`Reintentando persistencia... (${retries} intentos restantes)`);
      await new Promise((r) => setTimeout(r, delayMs));
      return this.withRetry(fn, retries - 1, delayMs * 2);
    }
  }
}
