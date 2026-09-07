import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ILeadRepository, LeadListFilters } from '../../domain/repositories/lead.repository.interface';
import { Lead, LeadSource } from '../../domain/entities/lead.entity';
import { LeadOrmEntity } from './entities/lead.orm-entity';
import { LeadMapper } from '../mappers/lead.mapper';

@Injectable()
export class TypeOrmLeadRepository implements ILeadRepository {
  private readonly logger = new Logger(TypeOrmLeadRepository.name);

  constructor(
    @InjectRepository(LeadOrmEntity)
    private readonly repo: Repository<LeadOrmEntity>,
  ) {}

  async save(lead: Lead): Promise<void> {
    await this.withRetry(() =>
      this.repo.upsert(LeadMapper.toOrm(lead), ['source', 'sourceLeadId']),
    );
  }

  /**
   * Idempotente por diseño: upsert por [source, source_lead_id].
   * Procesa en bloques de 500 para no exceder los límites de parámetros en PostgreSQL.
   */
  async saveMany(leads: Lead[]): Promise<{ inserted: number; skipped: number }> {
    if (leads.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const ormEntities = leads.map((l) => LeadMapper.toOrm(l));
    const CHUNK_SIZE = 500;

    for (let i = 0; i < ormEntities.length; i += CHUNK_SIZE) {
      const chunk = ormEntities.slice(i, i + CHUNK_SIZE);
      await this.withRetry(() =>
        this.repo.upsert(chunk, ['source', 'sourceLeadId']),
      );
    }

    return { inserted: leads.length, skipped: 0 };
  }

  async findBySourceLeadId(source: LeadSource, sourceLeadId: string): Promise<Lead | null> {
    const found = await this.repo.findOne({ where: { source, sourceLeadId } });
    return found ? LeadMapper.toDomain(found) : null;
  }

  async findAll(filters: LeadListFilters): Promise<{ items: Lead[]; total: number }> {
    const page = filters.page ?? 1;
    // Permite hasta 5000 filas para exportaciones y hasta 200 para paginación regular
    const maxAllowed = (filters.pageSize ?? 50) > 200 ? 5000 : 200;
    const pageSize = Math.min(filters.pageSize ?? 50, maxAllowed);

    const qb = this.repo.createQueryBuilder('lead');

    if (filters.source) {
      qb.andWhere('lead.source = :source', { source: filters.source });
    }
    if (filters.campaignId) {
      qb.andWhere('lead.sourceCampaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.from) {
      qb.andWhere('lead.receivedAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('lead.receivedAt <= :to', { to: filters.to });
    }

    qb.orderBy('lead.receivedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map((r) => LeadMapper.toDomain(r)), total };
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) {
        this.logger.error('Fallaron todos los reintentos de persistencia de leads', error as Error);
        throw error;
      }
      this.logger.warn(`Reintentando persistencia de leads... (${retries} intentos restantes)`);
      await new Promise((r) => setTimeout(r, delayMs));
      return this.withRetry(fn, retries - 1, delayMs * 2);
    }
  }
}
