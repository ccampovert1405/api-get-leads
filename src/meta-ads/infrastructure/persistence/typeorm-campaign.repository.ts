import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { Campaign } from '../../domain/entities/campaign.entity';
import { CampaignOrmEntity } from './entities/campaign.orm-entity';
import { CampaignMapper } from '../mappers/campaign.mapper';

@Injectable()
export class TypeOrmCampaignRepository implements ICampaignRepository {
  private readonly logger = new Logger(TypeOrmCampaignRepository.name);

  constructor(
    @InjectRepository(CampaignOrmEntity)
    private readonly repo: Repository<CampaignOrmEntity>,
  ) {}

  async save(campaign: Campaign): Promise<void> {
    await this.withRetry(() => this.repo.upsert(CampaignMapper.toOrm(campaign), ['metaCampaignId']));
  }

  async saveMany(campaigns: Campaign[]): Promise<void> {
    const ormEntities = campaigns.map((c) => CampaignMapper.toOrm(c));
    await this.withRetry(() => this.repo.upsert(ormEntities, ['metaCampaignId']));
  }

  async findByMetaId(metaCampaignId: string): Promise<Campaign | null> {
    const found = await this.repo.findOne({ where: { metaCampaignId } });
    return found ? CampaignMapper.toDomain(found) : null;
  }

  async findAll(): Promise<Campaign[]> {
    const all = await this.repo.find({ order: { createdAt: 'DESC' } });
    return all.map((e) => CampaignMapper.toDomain(e));
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
