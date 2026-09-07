import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { SyncScheduleOrmEntity } from '../../infrastructure/persistence/entities/sync-schedule.orm-entity';
import { SyncExecutionLogOrmEntity } from '../../infrastructure/persistence/entities/sync-execution-log.orm-entity';
import { UpdateSyncScheduleDto } from '../dtos/update-sync-schedule.dto';
import { SyncCampaignsUseCase } from '../../../meta-ads/application/use-cases/sync-campaigns.use-case';
import { SyncMetaLeadsUseCase } from '../../../meta-ads/application/use-cases/sync-meta-leads.use-case';
import { SyncTikTokCampaignsUseCase } from '../../../tiktok-ads/application/use-cases/sync-tiktok-campaigns.use-case';

export const SYNC_CRON_JOB_NAME = 'campaigns-and-leads-sync-job';

@Injectable()
export class SyncScheduleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SyncScheduleService.name);
  private isExecuting = false;

  constructor(
    @InjectRepository(SyncScheduleOrmEntity)
    private readonly scheduleRepository: Repository<SyncScheduleOrmEntity>,
    @InjectRepository(SyncExecutionLogOrmEntity)
    private readonly logRepository: Repository<SyncExecutionLogOrmEntity>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly syncMetaCampaignsUseCase: SyncCampaignsUseCase,
    private readonly syncMetaLeadsUseCase: SyncMetaLeadsUseCase,
    private readonly syncTikTokCampaignsUseCase: SyncTikTokCampaignsUseCase,
  ) {}

  /**
   * Al arrancar la aplicación, lee la configuración de BD y monta el cron dinámico.
   */
  async onApplicationBootstrap(): Promise<void> {
    const schedule = await this.getOrCreateDefaultSchedule();
    this.rescheduleCronJob(schedule);
  }

  /**
   * Obtiene la configuración actual de sincronización programada.
   */
  async getSchedule(): Promise<SyncScheduleOrmEntity & { cronExpression: string; nextRun: string | null }> {
    const schedule = await this.getOrCreateDefaultSchedule();
    const cronExpression = this.buildCronExpression(schedule.minute, schedule.hour, schedule.daysOfWeek);
    const nextRun = this.getNextExecutionDate();

    return {
      ...schedule,
      cronExpression,
      nextRun,
    };
  }

  /**
   * Actualiza los parámetros de la sincronización (días, hora, minuto, flags)
   * y reprograma el CronJob en memoria inmediatamente.
   */
  async updateSchedule(
    dto: UpdateSyncScheduleDto,
  ): Promise<SyncScheduleOrmEntity & { cronExpression: string; nextRun: string | null }> {
    const schedule = await this.getOrCreateDefaultSchedule();

    schedule.daysOfWeek = dto.daysOfWeek;
    schedule.hour = dto.hour;
    schedule.minute = dto.minute;
    if (dto.isEnabled !== undefined) schedule.isEnabled = dto.isEnabled;
    if (dto.syncMeta !== undefined) schedule.syncMeta = dto.syncMeta;
    if (dto.syncTikTok !== undefined) schedule.syncTikTok = dto.syncTikTok;
    if (dto.syncLeads !== undefined) schedule.syncLeads = dto.syncLeads;
    if (dto.timezone !== undefined) schedule.timezone = dto.timezone;

    const saved = await this.scheduleRepository.save(schedule);
    this.logger.log(`Configuración de sincronización actualizada: hora=${saved.hour}:${saved.minute}, días=${saved.daysOfWeek}`);

    this.rescheduleCronJob(saved);

    const cronExpression = this.buildCronExpression(saved.minute, saved.hour, saved.daysOfWeek);
    const nextRun = this.getNextExecutionDate();

    return {
      ...saved,
      cronExpression,
      nextRun,
    };
  }

  /**
   * Dispara manualmente la sincronización bajo demanda.
   */
  async triggerManualSync(): Promise<{
    message: string;
    logId: string;
    metaCampaigns: number;
    metaLeads: number;
    tiktokCampaigns: number;
  }> {
    if (this.isExecuting) {
      throw new ConflictException('Ya hay una sincronización en ejecución en este momento.');
    }

    const schedule = await this.getOrCreateDefaultSchedule();
    const result = await this.executeSyncWorkflow(schedule, 'MANUAL');

    return {
      message: 'Sincronización ejecutada exitosamente',
      logId: result.logId,
      metaCampaigns: result.metaCampaigns,
      metaLeads: result.metaLeads,
      tiktokCampaigns: result.tiktokCampaigns,
    };
  }

  /**
   * Consulta el historial de ejecuciones con paginación.
   */
  async getExecutionLogs(limit = 20, offset = 0): Promise<{ items: SyncExecutionLogOrmEntity[]; total: number }> {
    const [items, total] = await this.logRepository.findAndCount({
      order: { startedAt: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });

    return { items, total };
  }

  /**
   * Callback invocado automáticamente por el CronJob cuando llega la hora programada.
   */
  private async handleCronExecution(): Promise<void> {
    this.logger.log('Disparando sincronización programada por CRON...');
    const schedule = await this.getOrCreateDefaultSchedule();

    if (!schedule.isEnabled) {
      this.logger.warn('La sincronización programada está deshabilitada. Omitiendo.');
      return;
    }

    await this.executeSyncWorkflow(schedule, 'CRON');
  }

  /**
   * Flujo central de ejecución de sincronización (Meta + TikTok + Leads)
   * con logging persistente en BD y manejo robusto de excepciones.
   */
  private async executeSyncWorkflow(
    schedule: SyncScheduleOrmEntity,
    triggerType: 'CRON' | 'MANUAL',
  ): Promise<{
    logId: string;
    metaCampaigns: number;
    metaLeads: number;
    tiktokCampaigns: number;
  }> {
    if (this.isExecuting) {
      this.logger.warn(`Sincronización solicitada por ${triggerType} ignorada: ya hay una en curso.`);
      return { logId: '', metaCampaigns: 0, metaLeads: 0, tiktokCampaigns: 0 };
    }

    this.isExecuting = true;

    // Crear registro de log con status RUNNING
    const log = this.logRepository.create({
      scheduleId: schedule.id,
      triggerType,
      status: 'RUNNING',
      startedAt: new Date(),
      metaCampaignsSynced: 0,
      metaLeadsSynced: 0,
      tiktokCampaignsSynced: 0,
      details: {},
    });
    const savedLog = await this.logRepository.save(log);

    let metaCampaignsCount = 0;
    let metaLeadsCount = 0;
    let tiktokCampaignsCount = 0;
    const errors: string[] = [];

    try {
      // 1. Sincronizar Meta Ads (Campañas y Leads)
      if (schedule.syncMeta) {
        try {
          this.logger.log('Sincronizando campañas de Meta Ads...');
          const metaCampResult = await this.syncMetaCampaignsUseCase.execute();
          metaCampaignsCount = metaCampResult.synced;
          this.logger.log(`Campañas Meta Ads sincronizadas: ${metaCampaignsCount}`);

          if (schedule.syncLeads) {
            this.logger.log('Sincronizando leads de Meta Ads de todas las campañas...');
            const metaLeadsResult = await this.syncMetaLeadsUseCase.execute({});
            metaLeadsCount = metaLeadsResult.leadsSaved;
            this.logger.log(`Leads de Meta Ads guardados: ${metaLeadsCount} nuevos`);
          }
        } catch (err: any) {
          const errMsg = `Error en Meta Ads: ${err?.message || err}`;
          this.logger.error(errMsg);
          errors.push(errMsg);
        }
      }

      // 2. Sincronizar TikTok Ads (Campañas)
      if (schedule.syncTikTok) {
        try {
          this.logger.log('Sincronizando campañas de TikTok Ads...');
          const tiktokResult = await this.syncTikTokCampaignsUseCase.execute();
          tiktokCampaignsCount = tiktokResult.synced;
          this.logger.log(`Campañas TikTok Ads sincronizadas: ${tiktokCampaignsCount}`);
        } catch (err: any) {
          const errMsg = `Error en TikTok Ads: ${err?.message || err}`;
          this.logger.error(errMsg);
          errors.push(errMsg);
        }
      }

      // Determinar estado final del log
      const isFailed = errors.length > 0 && (metaCampaignsCount === 0 && tiktokCampaignsCount === 0);
      savedLog.status = isFailed ? 'FAILED' : 'SUCCESS';
      savedLog.finishedAt = new Date();
      savedLog.metaCampaignsSynced = metaCampaignsCount;
      savedLog.metaLeadsSynced = metaLeadsCount;
      savedLog.tiktokCampaignsSynced = tiktokCampaignsCount;
      savedLog.details = {
        syncMeta: schedule.syncMeta,
        syncTikTok: schedule.syncTikTok,
        syncLeads: schedule.syncLeads,
        errors: errors.length > 0 ? errors : undefined,
      };
      savedLog.errorMessage = errors.length > 0 ? errors.join('; ') : null;
      await this.logRepository.save(savedLog);

      // Actualizar estado en schedule
      schedule.lastRunAt = new Date();
      schedule.lastRunStatus = savedLog.status;
      schedule.lastRunMessage =
        errors.length > 0
          ? `Parcialmente completado con advertencias: ${errors.join('; ')}`
          : `Éxito: ${metaCampaignsCount} camp. Meta, ${metaLeadsCount} leads Meta, ${tiktokCampaignsCount} camp. TikTok`;
      await this.scheduleRepository.save(schedule);

      return {
        logId: savedLog.id,
        metaCampaigns: metaCampaignsCount,
        metaLeads: metaLeadsCount,
        tiktokCampaigns: tiktokCampaignsCount,
      };
    } catch (criticalErr: any) {
      this.logger.error(`Fallo crítico en sincronización: ${criticalErr?.message || criticalErr}`);
      savedLog.status = 'FAILED';
      savedLog.finishedAt = new Date();
      savedLog.errorMessage = criticalErr?.message || String(criticalErr);
      await this.logRepository.save(savedLog);

      schedule.lastRunAt = new Date();
      schedule.lastRunStatus = 'FAILED';
      schedule.lastRunMessage = `Fallo crítico: ${criticalErr?.message || criticalErr}`;
      await this.scheduleRepository.save(schedule);

      return {
        logId: savedLog.id,
        metaCampaigns: metaCampaignsCount,
        metaLeads: metaLeadsCount,
        tiktokCampaigns: tiktokCampaignsCount,
      };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Reprograma el CronJob en SchedulerRegistry.
   */
  private rescheduleCronJob(schedule: SyncScheduleOrmEntity): void {
    // 1. Si ya existe, detener y remover
    if (this.schedulerRegistry.doesExist('cron', SYNC_CRON_JOB_NAME)) {
      this.logger.log(`Removiendo CronJob anterior '${SYNC_CRON_JOB_NAME}'`);
      this.schedulerRegistry.deleteCronJob(SYNC_CRON_JOB_NAME);
    }

    // 2. Si no está activo, no crearlo
    if (!schedule.isEnabled) {
      this.logger.log('Sincronización automática deshabilitada por configuración.');
      return;
    }

    // 3. Crear expresión cron
    const cronExp = this.buildCronExpression(schedule.minute, schedule.hour, schedule.daysOfWeek);
    this.logger.log(`Registrando CronJob '${SYNC_CRON_JOB_NAME}' con expresión: "${cronExp}" (TZ: ${schedule.timezone})`);

    const job = new CronJob(
      cronExp,
      () => {
        this.handleCronExecution();
      },
      null,
      true,
      schedule.timezone || 'America/Guayaquil',
    );

    this.schedulerRegistry.addCronJob(SYNC_CRON_JOB_NAME, job);
    job.start();

    const nextDate = this.getNextExecutionDate();
    this.logger.log(`CronJob '${SYNC_CRON_JOB_NAME}' activo. Próxima ejecución: ${nextDate}`);
  }

  /**
   * Convierte minuto, hora y lista de días a expresión cron estándar.
   * Formato: "minuto hora * * dias" (ej: "30 8 * * 1,2,3,4,5")
   */
  private buildCronExpression(minute: number, hour: number, daysOfWeek: number[]): string {
    const sortedDays = Array.from(new Set(daysOfWeek)).sort((a, b) => a - b);
    const daysPart = sortedDays.length > 0 ? sortedDays.join(',') : '*';
    return `${minute} ${hour} * * ${daysPart}`;
  }

  /**
   * Obtiene la próxima fecha calculada de ejecución del CronJob activo.
   */
  private getNextExecutionDate(): string | null {
    try {
      if (this.schedulerRegistry.doesExist('cron', SYNC_CRON_JOB_NAME)) {
        const job = this.schedulerRegistry.getCronJob(SYNC_CRON_JOB_NAME);
        const next = job.nextDate();
        return next ? next.toISO() : null;
      }
    } catch {
      // Si no existe o no tiene próxima fecha
    }
    return null;
  }

  /**
   * Busca la configuración existente o crea una predeterminada (Lunes a Viernes 08:00 AM).
   */
  private async getOrCreateDefaultSchedule(): Promise<SyncScheduleOrmEntity> {
    let schedule = await this.scheduleRepository.findOne({
      where: { name: 'sincronizacion-campanas-predeterminada' },
    });

    if (!schedule) {
      schedule = this.scheduleRepository.create({
        name: 'sincronizacion-campanas-predeterminada',
        description: 'Sincronización automática de campañas y leads de Meta Ads y TikTok Ads',
        isEnabled: true,
        daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes
        hour: 8,
        minute: 0,
        timezone: 'America/Guayaquil',
        syncMeta: true,
        syncTikTok: true,
        syncLeads: true,
      });
      schedule = await this.scheduleRepository.save(schedule);
      this.logger.log('Creada configuración inicial predeterminada de sincronización en PostgreSQL');
    }

    return schedule;
  }
}
