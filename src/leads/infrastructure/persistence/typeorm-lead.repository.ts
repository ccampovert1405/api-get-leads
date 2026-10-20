import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ILeadRepository, LeadListFilters, SaveManyResult } from '../../domain/repositories/lead.repository.interface';
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
            ciudadDeclarada: lead.ciudadDeclarada || existing.ciudadDeclarada,
            cedula: lead.cedula || existing.cedula,
            sourceCampaignId: lead.sourceCampaignId || existing.sourceCampaignId,
            idProvincia: lead.idProvincia || existing.idProvincia,
            idCanton: lead.idCanton || existing.idCanton,
            idDependencia: lead.idDependencia || existing.idDependencia,
            fullName: lead.fullName || existing.fullName,
            phone: lead.phone || existing.phone,
            email: lead.email || existing.email,
            webhookStatus: 'PENDING',
            webhookSentAt: null,
            webhookError: null,
          });
          return;
        }
      }

      const orm = LeadMapper.toOrm(lead);
      orm.webhookStatus = 'PENDING';
      orm.webhookSentAt = null;
      orm.webhookError = null;
      await this.repo.upsert(orm, ['source', 'sourceLeadId']);
    });
  }

  /**
   * Idempotente, clasificador de nuevos/actualizados/omitidos:
   * 1. NUEVO: Si no existe en BD, lo inserta con webhookStatus = 'PENDING'.
   * 2. ACTUALIZADO: Si ya existe pero trae nuevos datos o nueva fecha de sumisión,
   *    actualiza los datos y restablece webhookStatus = 'PENDING' para reenviar.
   * 3. OMITIDO: Si ya existe y es exactamente idéntico, se omite (no se reenvía al webhook).
   */
  async saveMany(leads: Lead[]): Promise<SaveManyResult> {
    if (leads.length === 0) {
      return {
        inserted: 0,
        skipped: 0,
        updated: 0,
        savedIds: [],
        insertedIds: [],
        updatedIds: [],
        skippedIds: [],
      };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const insertedIds: string[] = [];
    const updatedIds: string[] = [];
    const skippedIds: string[] = [];
    const savedIds: string[] = [];

    for (const lead of leads) {
      try {
        // 1. Buscar si ya existe por (source + sourceLeadId) o por cédula válida
        let existing: LeadOrmEntity | null = null;

        if (lead.source && lead.sourceLeadId) {
          existing = await this.repo.findOne({
            where: { source: lead.source, sourceLeadId: lead.sourceLeadId },
          });
        }

        if (!existing && lead.cedula && lead.cedula.trim().length >= 5) {
          const cleanCedula = lead.cedula.trim();
          existing = await this.repo.findOne({ where: { cedula: cleanCedula } });
        }

        // Caso 1: No existe en base de datos -> NUEVO
        if (!existing) {
          const orm = LeadMapper.toOrm(lead);
          orm.webhookStatus = 'PENDING';
          orm.webhookSentAt = null;
          orm.webhookError = null;
          orm.lastWebhookLogId = null;
          orm.lastWebhookPayload = null;

          const savedRecord = await this.withRetry(() => this.repo.save(orm));
          inserted++;
          insertedIds.push(savedRecord.id);
          savedIds.push(savedRecord.id);
          continue;
        }

        // Caso 2: Ya existe en base de datos -> Evaluar si hubo actualización real o si es idéntico
        const isNewSubmission =
          Boolean(lead.sourceLeadId && lead.sourceLeadId !== existing.sourceLeadId) ||
          Boolean(
            lead.receivedAt &&
              existing.receivedAt &&
              new Date(lead.receivedAt).getTime() >
                new Date(existing.lastSubmissionAt || existing.receivedAt).getTime(),
          );

        const hasDataChanges =
          Boolean(lead.fullName && lead.fullName !== existing.fullName) ||
          Boolean(lead.phone && lead.phone !== existing.phone) ||
          Boolean(lead.email && lead.email !== existing.email) ||
          Boolean(lead.formName && lead.formName !== existing.formName) ||
          Boolean(lead.ciudadDeclarada && lead.ciudadDeclarada !== existing.ciudadDeclarada) ||
          Boolean(lead.idCanton && Number(lead.idCanton) !== Number(existing.idCanton)) ||
          Boolean(lead.idProvincia && Number(lead.idProvincia) !== Number(existing.idProvincia)) ||
          Boolean(lead.idDependencia && lead.idDependencia !== existing.idDependencia);

        const shouldUpdate = isNewSubmission || hasDataChanges;

        if (shouldUpdate) {
          await this.repo.update(existing.id, {
            submissionCount: isNewSubmission
              ? (existing.submissionCount || 1) + 1
              : existing.submissionCount || 1,
            lastSubmissionAt: isNewSubmission
              ? lead.receivedAt
              : existing.lastSubmissionAt || existing.receivedAt,
            formName: lead.formName || existing.formName,
            rawPayload: (lead.rawPayload as Record<string, any>) || existing.rawPayload,
            contactPreference: lead.contactPreference || existing.contactPreference,
            ciudadDeclarada: lead.ciudadDeclarada || existing.ciudadDeclarada,
            cedula: lead.cedula || existing.cedula,
            sourceCampaignId: lead.sourceCampaignId || existing.sourceCampaignId,
            idProvincia: lead.idProvincia || existing.idProvincia,
            idCanton: lead.idCanton || existing.idCanton,
            idDependencia: lead.idDependencia || existing.idDependencia,
            fullName: lead.fullName || existing.fullName,
            phone: lead.phone || existing.phone,
            email: lead.email || existing.email,
            webhookStatus: 'PENDING', // Se restablece para ser despachado nuevamente
            webhookSentAt: null,
            webhookError: null,
          });

          updated++;
          updatedIds.push(existing.id);
          savedIds.push(existing.id);
        } else {
          // Caso 3: Es exactamente el mismo lead sin cambios. Se omite para no duplicar ni reenviar
          skipped++;
          skippedIds.push(existing.id);
        }
      } catch (err: any) {
        this.logger.warn(`Error al procesar lead ${lead.sourceLeadId}: ${err?.message || err}`);
      }
    }

    return {
      inserted,
      skipped,
      updated,
      savedIds,
      insertedIds,
      updatedIds,
      skippedIds,
    };
  }

  async findByIds(ids: string[]): Promise<Lead[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const records = await this.repo.find({
      where: { id: In(ids) },
      relations: ['provincia', 'canton', 'dependencia'],
      order: { receivedAt: 'DESC' },
    });

    return records.map((r) => LeadMapper.toDomain(r));
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

  async markWebhookDispatched(params: {
    leadIds: string[];
    status: 'SENT' | 'FAILED';
    webhookLogId?: string;
    error?: string | null;
    payloadsByLeadId?: Record<string, Record<string, any>>;
  }): Promise<void> {
    if (!params.leadIds || params.leadIds.length === 0) return;

    for (const leadId of params.leadIds) {
      try {
        const updateData: Partial<LeadOrmEntity> = {
          webhookStatus: params.status,
          webhookError: params.error ?? null,
        };

        if (params.status === 'SENT') {
          updateData.webhookSentAt = new Date();
          if (params.webhookLogId) {
            updateData.lastWebhookLogId = params.webhookLogId;
          }
        }

        if (params.payloadsByLeadId && params.payloadsByLeadId[leadId]) {
          updateData.lastWebhookPayload = params.payloadsByLeadId[leadId];
        }

        await this.repo.update(leadId, updateData);
      } catch (err: any) {
        this.logger.warn(`Error al actualizar estado de webhook para lead ${leadId}: ${err?.message || err}`);
      }
    }
  }

  async getWebhookStatusSummary(): Promise<{
    totalLeads: number;
    webhookSent: number;
    webhookPending: number;
    webhookFailed: number;
  }> {
    const totalLeads = await this.repo.count();
    const webhookSent = await this.repo.count({ where: { webhookStatus: 'SENT' } });
    const webhookPending = await this.repo.count({ where: { webhookStatus: 'PENDING' } });
    const webhookFailed = await this.repo.count({ where: { webhookStatus: 'FAILED' } });

    return {
      totalLeads,
      webhookSent,
      webhookPending,
      webhookFailed,
    };
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
