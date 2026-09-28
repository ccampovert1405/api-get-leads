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
    await this.withRetry(async () => {
      if (lead.cedula && lead.cedula.trim().length >= 5) {
        const existing = await this.repo.findOne({ where: { cedula: lead.cedula.trim() } });
        if (existing) {
          await this.repo.update(existing.id, {
            submissionCount: (existing.submissionCount || 1) + 1,
            lastSubmissionAt: lead.receivedAt,
            formName: lead.formName || existing.formName,
            rawPayload: lead.rawPayload as Record<string, any>,
            contactPreference: lead.contactPreference || existing.contactPreference,
            idProvincia: lead.idProvincia || existing.idProvincia,
            idCanton: lead.idCanton || existing.idCanton,
            idDependencia: lead.idDependencia || existing.idDependencia,
            fullName: lead.fullName || existing.fullName,
            phone: lead.phone || existing.phone,
            email: lead.email || existing.email,
          });
          return;
        }
      }

      await this.repo.upsert(LeadMapper.toOrm(lead), ['source', 'sourceLeadId']);
    });
  }

  /**
   * Idempotente y deduplicador por cédula:
   * Si la cédula ya existe, actualiza el registro e incrementa el submission_count.
   * Si no existe cédula o es nueva, inserta el lead.
   */
  async saveMany(leads: Lead[]): Promise<{ inserted: number; skipped: number; updated: number }> {
    if (leads.length === 0) {
      return { inserted: 0, skipped: 0, updated: 0 };
    }

    let inserted = 0;
    let updated = 0;

    for (const lead of leads) {
      try {
        if (lead.cedula && lead.cedula.trim().length >= 5) {
          const cleanCedula = lead.cedula.trim();
          const existing = await this.repo.findOne({ where: { cedula: cleanCedula } });
          if (existing) {
            // Ya existe un lead con esta cédula: no insertamos uno nuevo, incrementamos contador
            await this.repo.update(existing.id, {
              submissionCount: (existing.submissionCount || 1) + 1,
              lastSubmissionAt: lead.receivedAt,
              formName: lead.formName || existing.formName,
              rawPayload: lead.rawPayload as Record<string, any>,
              contactPreference: lead.contactPreference || existing.contactPreference,
              idProvincia: lead.idProvincia || existing.idProvincia,
              idCanton: lead.idCanton || existing.idCanton,
              idDependencia: lead.idDependencia || existing.idDependencia,
              fullName: lead.fullName || existing.fullName,
              phone: lead.phone || existing.phone,
              email: lead.email || existing.email,
            });
            updated++;
            continue;
          }
        }

        // Si no existe cédula o es nueva, hacemos upsert por source + sourceLeadId
        await this.withRetry(() =>
          this.repo.upsert(LeadMapper.toOrm(lead), ['source', 'sourceLeadId']),
        );
        inserted++;
      } catch (err: any) {
        this.logger.warn(`Error al procesar lead ${lead.sourceLeadId}: ${err?.message || err}`);
      }
    }

    return { inserted, skipped: 0, updated };
  }

  async findBySourceLeadId(source: LeadSource, sourceLeadId: string): Promise<Lead | null> {
    const found = await this.repo.findOne({
      where: { source, sourceLeadId },
      relations: ['provincia', 'canton', 'dependencia'],
    });
    return found ? LeadMapper.toDomain(found) : null;
  }

  async findByCedula(cedula: string): Promise<Lead | null> {
    const found = await this.repo.findOne({
      where: { cedula: cedula.trim() },
      relations: ['provincia', 'canton', 'dependencia'],
    });
    return found ? LeadMapper.toDomain(found) : null;
  }

  async findAll(filters: LeadListFilters): Promise<{ items: Lead[]; total: number }> {
    const page = filters.page ?? 1;
    const maxAllowed = (filters.pageSize ?? 50) > 200 ? 5000 : 200;
    const pageSize = Math.min(filters.pageSize ?? 50, maxAllowed);

    const qb = this.repo.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.provincia', 'provincia')
      .leftJoinAndSelect('lead.canton', 'canton')
      .leftJoinAndSelect('lead.dependencia', 'dependencia');

    if (filters.source) {
      qb.andWhere('lead.source = :source', { source: filters.source });
    }
    if (filters.campaignId) {
      qb.andWhere('lead.sourceCampaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.provinciaId) {
      qb.andWhere('lead.idProvincia = :provinciaId', { provinciaId: filters.provinciaId });
    }
    if (filters.dependenciaId) {
      qb.andWhere('lead.idDependencia = :dependenciaId', { dependenciaId: filters.dependenciaId });
    }
    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(lead.fullName) LIKE :term OR LOWER(lead.email) LIKE :term OR lead.phone LIKE :term OR lead.cedula LIKE :term OR lead.sourceCampaignId LIKE :term OR LOWER(lead.formName) LIKE :term)',
        { term },
      );
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
