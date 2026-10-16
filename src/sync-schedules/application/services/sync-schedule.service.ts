import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  ConflictException,
  NotFoundException,
  Inject,
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
import { DownloadTikTokLeadsUseCase } from '../../../tiktok-ads/application/use-cases/download-tiktok-leads.use-case';
import { ILeadRepository, LEAD_REPOSITORY } from '../../../leads/domain/repositories/lead.repository.interface';
import { WebhookConfigService } from '../../../webhooks/application/services/webhook-config.service';
import { WebhookDispatcherService } from '../../../webhooks/application/services/webhook-dispatcher.service';
import {
  IPlatformCredentialRepository,
  PLATFORM_CREDENTIAL_REPOSITORY,
} from '../../../platform-credentials/domain/repositories/platform-credential.repository.interface';
import { Platform } from '../../../platform-credentials/domain/entities/platform-credential.entity';

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
    private readonly downloadTikTokLeadsUseCase: DownloadTikTokLeadsUseCase,
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepository: ILeadRepository,
    private readonly webhookConfigService: WebhookConfigService,
    private readonly webhookDispatcherService: WebhookDispatcherService,
    @Inject(PLATFORM_CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IPlatformCredentialRepository,
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
  async getSchedule(): Promise<
    SyncScheduleOrmEntity & {
      cronExpression: string;
      nextRun: string | null;
      summaryText: string;
    }
  > {
    const schedule = await this.getOrCreateDefaultSchedule();
    const cronExpression = this.buildCronExpression(
      schedule.minute,
      schedule.scheduleMode,
      schedule.hour,
      schedule.intervalHours,
      schedule.customHours,
      schedule.daysOfWeek,
    );
    const nextRun = this.getNextExecutionDate();
    const summaryText = this.buildScheduleSummary(schedule);

    return {
      ...schedule,
      cronExpression,
      nextRun,
      summaryText,
    };
  }

  /**
   * Actualiza los parámetros de la sincronización (modalidad, días, horas, intervalos, flags)
   * y reprograma el CronJob en memoria inmediatamente.
   */
  async updateSchedule(
    dto: UpdateSyncScheduleDto,
  ): Promise<
    SyncScheduleOrmEntity & {
      cronExpression: string;
      nextRun: string | null;
      summaryText: string;
    }
  > {
    const schedule = await this.getOrCreateDefaultSchedule();

    schedule.daysOfWeek = dto.daysOfWeek;
    schedule.minute = dto.minute;

    if (dto.scheduleMode !== undefined) {
      schedule.scheduleMode = dto.scheduleMode;
    }
    if (dto.intervalHours !== undefined) {
      schedule.intervalHours = dto.intervalHours;
    }
    if (dto.customHours !== undefined) {
      schedule.customHours = dto.customHours;
    }

    if (dto.timesPerDay !== undefined) {
      schedule.timesPerDay = dto.timesPerDay;
    } else if (schedule.scheduleMode === 'INTERVAL' && schedule.intervalHours) {
      schedule.timesPerDay = Math.floor(24 / schedule.intervalHours);
    } else if (schedule.scheduleMode === 'CUSTOM_HOURS' && schedule.customHours) {
      schedule.timesPerDay = schedule.customHours.length;
    } else if (schedule.scheduleMode === 'EXACT_TIME') {
      schedule.timesPerDay = 1;
    }

    if (dto.hour !== undefined) {
      schedule.hour = dto.hour;
    } else if (
      schedule.scheduleMode === 'CUSTOM_HOURS' &&
      schedule.customHours &&
      schedule.customHours.length > 0
    ) {
      schedule.hour = schedule.customHours[0];
    } else if (schedule.hour === undefined || schedule.hour === null) {
      schedule.hour = 8;
    }

    if (dto.isEnabled !== undefined) schedule.isEnabled = dto.isEnabled;
    if (dto.syncMeta !== undefined) schedule.syncMeta = dto.syncMeta;
    if (dto.syncTikTok !== undefined) schedule.syncTikTok = dto.syncTikTok;
    if (dto.syncLeads !== undefined) schedule.syncLeads = dto.syncLeads;
    if (dto.timezone !== undefined) schedule.timezone = dto.timezone;

    const saved = await this.scheduleRepository.save(schedule);
    this.logger.log(
      `Configuración de sincronización actualizada: modo=${saved.scheduleMode}, intervalo=${saved.intervalHours}h, horasCustom=${JSON.stringify(saved.customHours)}, horaBase=${saved.hour}:${saved.minute}, días=${saved.daysOfWeek}`,
    );

    this.rescheduleCronJob(saved);

    const cronExpression = this.buildCronExpression(
      saved.minute,
      saved.scheduleMode,
      saved.hour,
      saved.intervalHours,
      saved.customHours,
      saved.daysOfWeek,
    );
    const nextRun = this.getNextExecutionDate();
    const summaryText = this.buildScheduleSummary(saved);

    return {
      ...saved,
      cronExpression,
      nextRun,
      summaryText,
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
    tiktokLeads: number;
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
      tiktokLeads: result.tiktokLeads,
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
   * con logging persistente en BD, descarga de leads de ambas plataformas
   * y disparo asíncrono del webhook saliente configurado por el cliente.
   */
  private async executeSyncWorkflow(
    schedule: SyncScheduleOrmEntity,
    triggerType: 'CRON' | 'MANUAL',
  ): Promise<{
    logId: string;
    metaCampaigns: number;
    metaLeads: number;
    tiktokCampaigns: number;
    tiktokLeads: number;
  }> {
    if (this.isExecuting) {
      this.logger.warn(`Sincronización solicitada por ${triggerType} ignorada: ya hay una en curso.`);
      return { logId: '', metaCampaigns: 0, metaLeads: 0, tiktokCampaigns: 0, tiktokLeads: 0 };
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
      tiktokLeadsSynced: 0,
      details: {},
    });
    const savedLog = await this.logRepository.save(log);

    let metaCampaignsCount = 0;
    let metaLeadsCount = 0;
    let tiktokCampaignsCount = 0;
    let tiktokLeadsCount = 0;
    const allProcessedLeadIds: string[] = [];
    const leadActionsById: Record<string, 'CREATED' | 'UPDATED'> = {};
    const errors: string[] = [];
    let metaLeadsStats = { fetched: 0, inserted: 0, updated: 0, skipped: 0 };
    let tiktokLeadsStats = { fetched: 0, inserted: 0, updated: 0, skipped: 0 };

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
            metaLeadsCount = metaLeadsResult.insertedCount + metaLeadsResult.updatedCount;
            metaLeadsStats = {
              fetched: metaLeadsResult.leadsFetched,
              inserted: metaLeadsResult.insertedCount,
              updated: metaLeadsResult.updatedCount,
              skipped: metaLeadsResult.skippedCount,
            };

            for (const id of metaLeadsResult.insertedIds) {
              allProcessedLeadIds.push(id);
              leadActionsById[id] = 'CREATED';
            }
            for (const id of metaLeadsResult.updatedIds) {
              allProcessedLeadIds.push(id);
              leadActionsById[id] = 'UPDATED';
            }

            this.logger.log(
              `Leads Meta Ads: ${metaLeadsResult.insertedCount} nuevos, ${metaLeadsResult.updatedCount} actualizados, ${metaLeadsResult.skippedCount} omitidos (sin cambios). Total en cola webhook: ${allProcessedLeadIds.length}`,
            );
          }
        } catch (err: any) {
          const errMsg = `Error en Meta Ads: ${err?.message || err}`;
          this.logger.error(errMsg);
          errors.push(errMsg);
        }
      }

      // 2. Sincronizar TikTok Ads (Campañas y Leads)
      if (schedule.syncTikTok) {
        try {
          this.logger.log('Sincronizando campañas de TikTok Ads...');
          const tiktokResult = await this.syncTikTokCampaignsUseCase.execute();
          tiktokCampaignsCount = tiktokResult.synced;
          this.logger.log(`Campañas TikTok Ads sincronizadas: ${tiktokCampaignsCount}`);

          if (schedule.syncLeads) {
            try {
              const cred = await this.credentialRepository.findByPlatform(Platform.TIKTOK);
              const advertiserId = cred?.accountId;
              const pageId = cred?.appId || cred?.accountId;
              if (advertiserId && pageId && !advertiserId.includes('tu_')) {
                this.logger.log(`Sincronizando leads de TikTok Ads (advertiser: ${advertiserId}, page: ${pageId})...`);
                const today = new Date();
                const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // Rango de 3 días para crontab
                const startDate = past.toISOString().split('T')[0];
                const endDate = today.toISOString().split('T')[0];

                const ttLeadsResult = await this.downloadTikTokLeadsUseCase.execute({
                  advertiserId,
                  pageId,
                  startDate,
                  endDate,
                });
                tiktokLeadsCount = ttLeadsResult.inserted + ttLeadsResult.updated;
                tiktokLeadsStats = {
                  fetched: ttLeadsResult.fetched,
                  inserted: ttLeadsResult.inserted,
                  updated: ttLeadsResult.updated,
                  skipped: ttLeadsResult.skipped,
                };

                for (const id of ttLeadsResult.insertedIds) {
                  allProcessedLeadIds.push(id);
                  leadActionsById[id] = 'CREATED';
                }
                for (const id of ttLeadsResult.updatedIds) {
                  allProcessedLeadIds.push(id);
                  leadActionsById[id] = 'UPDATED';
                }

                this.logger.log(
                  `Leads TikTok Ads: ${ttLeadsResult.inserted} nuevos, ${ttLeadsResult.updated} actualizados, ${ttLeadsResult.skipped} omitidos.`,
                );
              } else {
                this.logger.log('TikTok advertiserId o pageId no configurados completamente para descarga automática de leads en crontab.');
              }
            } catch (ttLeadsErr: any) {
              const errMsg = `Error en descarga de leads TikTok: ${ttLeadsErr?.message || ttLeadsErr}`;
              this.logger.warn(errMsg);
              errors.push(errMsg);
            }
          }
        } catch (err: any) {
          const errMsg = `Error en TikTok Ads: ${err?.message || err}`;
          this.logger.error(errMsg);
          errors.push(errMsg);
        }
      }

      // Determinar estado final del log
      const isFailed = errors.length > 0 && (metaCampaignsCount === 0 && tiktokCampaignsCount === 0 && metaLeadsCount === 0 && tiktokLeadsCount === 0);
      savedLog.status = isFailed ? 'FAILED' : 'SUCCESS';
      savedLog.finishedAt = new Date();
      savedLog.metaCampaignsSynced = metaCampaignsCount;
      savedLog.metaLeadsSynced = metaLeadsCount;
      savedLog.tiktokCampaignsSynced = tiktokCampaignsCount;
      savedLog.tiktokLeadsSynced = tiktokLeadsCount;
      savedLog.details = {
        syncMeta: schedule.syncMeta,
        syncTikTok: schedule.syncTikTok,
        syncLeads: schedule.syncLeads,
        metaLeadsStats,
        tiktokLeadsStats,
        totalLeadsDispatchedToWebhook: allProcessedLeadIds.length,
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
          : `Éxito: ${metaCampaignsCount} camp. Meta, ${metaLeadsCount} leads Meta (${metaLeadsStats.inserted} nuevos, ${metaLeadsStats.updated} act.), ${tiktokCampaignsCount} camp. TikTok, ${tiktokLeadsCount} leads TikTok`;
      await this.scheduleRepository.save(schedule);

      // 3. Disparo Asíncrono del Webhook Saliente para leads nuevos o actualizados
      try {
        const webhookConfig = await this.webhookConfigService.getConfig();
        if (webhookConfig && webhookConfig.isEnabled && webhookConfig.url) {
          const uniqueLeadIds = Array.from(new Set(allProcessedLeadIds));
          if (uniqueLeadIds.length > 0 || !webhookConfig.triggerOnlyWhenLeadsFound) {
            this.logger.log(`Invocando webhook saliente (${webhookConfig.deliveryFormat}) para ${uniqueLeadIds.length} leads calificados (nuevos o actualizados)...`);
            const leadsToSend = uniqueLeadIds.length > 0
              ? await this.leadRepository.findByIds(uniqueLeadIds)
              : [];
            await this.webhookDispatcherService.dispatchLeads(
              webhookConfig,
              leadsToSend,
              savedLog.id,
              leadActionsById,
            );
          }
        }
      } catch (webhookErr: any) {
        this.logger.warn(`Error no bloqueante al disparar webhook: ${webhookErr?.message || webhookErr}`);
      }

      return {
        logId: savedLog.id,
        metaCampaigns: metaCampaignsCount,
        metaLeads: metaLeadsCount,
        tiktokCampaigns: tiktokCampaignsCount,
        tiktokLeads: tiktokLeadsCount,
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
        tiktokLeads: tiktokLeadsCount,
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
    const cronExp = this.buildCronExpression(
      schedule.minute,
      schedule.scheduleMode,
      schedule.hour,
      schedule.intervalHours,
      schedule.customHours,
      schedule.daysOfWeek,
    );
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

  // Convierte minuto, hora, intervalo o lista de horas y días a expresión cron estándar.
  // Formato: "minuto horas * * dias" (ej: "30 8 * * 1,2,3,4,5" o "0 */4 * * 1,2,3,4,5" o "0 11,14 * * 1,2,3,4,5")
  public buildCronExpression(
    minute: number,
    scheduleMode: 'EXACT_TIME' | 'INTERVAL' | 'CUSTOM_HOURS' = 'EXACT_TIME',
    hour: number = 8,
    intervalHours?: number | null,
    customHours?: number[] | null,
    daysOfWeek: number[] = [1, 2, 3, 4, 5],
  ): string {
    const sortedDays = Array.from(new Set(daysOfWeek)).sort((a, b) => a - b);
    const daysPart = sortedDays.length > 0 ? sortedDays.join(',') : '*';

    let hoursPart: string;

    if (scheduleMode === 'INTERVAL' && intervalHours && intervalHours > 0) {
      hoursPart = `*/${intervalHours}`;
    } else if (scheduleMode === 'CUSTOM_HOURS' && Array.isArray(customHours) && customHours.length > 0) {
      const uniqueHours = Array.from(new Set(customHours))
        .filter((h) => typeof h === 'number' && h >= 0 && h <= 23)
        .sort((a, b) => a - b);
      hoursPart = uniqueHours.length > 0 ? uniqueHours.join(',') : `${hour ?? 8}`;
    } else {
      hoursPart = `${hour ?? 8}`;
    }

    return `${minute} ${hoursPart} * * ${daysPart}`;
  }

  /**
   * Genera un resumen explicativo en español legible de la programación activa.
   */
  public buildScheduleSummary(schedule: SyncScheduleOrmEntity): string {
    const dayNames: Record<number, string> = {
      1: 'Lun',
      2: 'Mar',
      3: 'Mié',
      4: 'Jue',
      5: 'Vie',
      6: 'Sáb',
      0: 'Dom',
      7: 'Dom',
    };
    const daysText = (schedule.daysOfWeek || [])
      .map((d) => dayNames[d] || String(d))
      .join(', ');

    const formatHour = (h: number, m: number): string => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const minStr = m.toString().padStart(2, '0');
      return `${h12.toString().padStart(2, '0')}:${minStr} ${ampm} (${h.toString().padStart(2, '0')}:${minStr})`;
    };

    const minStr = (schedule.minute || 0).toString().padStart(2, '0');

    if (schedule.scheduleMode === 'INTERVAL' && schedule.intervalHours) {
      const times = Math.floor(24 / schedule.intervalHours);
      return `Cada ${schedule.intervalHours} hora(s) (${times} veces al día) al minuto :${minStr} [${daysText}]`;
    }

    if (
      schedule.scheduleMode === 'CUSTOM_HOURS' &&
      Array.isArray(schedule.customHours) &&
      schedule.customHours.length > 0
    ) {
      const formattedHours = schedule.customHours
        .sort((a, b) => a - b)
        .map((h) => formatHour(h, schedule.minute || 0))
        .join(', ');
      return `${schedule.customHours.length} veces al día a las [${formattedHours}] [${daysText}]`;
    }

    return `Una vez al día a las ${formatHour(schedule.hour ?? 8, schedule.minute || 0)} [${daysText}]`;
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
        scheduleMode: 'EXACT_TIME',
        intervalHours: null,
        customHours: null,
        timesPerDay: 1,
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
    } else {
      let needsSave = false;
      if (!schedule.scheduleMode) {
        schedule.scheduleMode = 'EXACT_TIME';
        needsSave = true;
      }
      if (schedule.timesPerDay == null) {
        schedule.timesPerDay = 1;
        needsSave = true;
      }
      if (needsSave) {
        schedule = await this.scheduleRepository.save(schedule);
      }
    }

    return schedule;
  }
}
