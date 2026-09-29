import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { AxiosError } from 'axios';

import {
  WebhookConfigOrmEntity,
  WebhookDeliveryFormat,
} from '../../infrastructure/persistence/entities/webhook-config.orm-entity';
import { WebhookDeliveryLogOrmEntity } from '../../infrastructure/persistence/entities/webhook-delivery-log.orm-entity';
import { WebhookLeadMapper, WebhookLeadPayload } from '../mappers/webhook-lead.mapper';
import { Lead } from '../../../leads/domain/entities/lead.entity';
import { LeadOrmEntity } from '../../../leads/infrastructure/persistence/entities/lead.orm-entity';

export interface DispatchResult {
  sentCount: number;
  successCount: number;
  failedCount: number;
}

export interface WebhookSendResult {
  success: boolean;
  httpStatus: number | null;
  durationMs: number;
  responseBody: string | null;
  errorMessage: string | null;
  attempts: number;
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    @InjectRepository(WebhookDeliveryLogOrmEntity)
    private readonly deliveryLogRepo: Repository<WebhookDeliveryLogOrmEntity>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Despacha los leads recién sincronizados al endpoint webhook configurado.
   */
  async dispatchLeads(
    config: WebhookConfigOrmEntity,
    leads: (Lead | LeadOrmEntity)[],
    syncLogId?: string,
  ): Promise<DispatchResult> {
    if (!config || !config.isEnabled || !config.url || config.url.trim().length === 0) {
      this.logger.log('Webhook no configurado o deshabilitado. Omitiendo despacho.');
      return { sentCount: 0, successCount: 0, failedCount: 0 };
    }

    if (leads.length === 0 && config.triggerOnlyWhenLeadsFound) {
      this.logger.log('No hubo leads en esta sincronización y triggerOnlyWhenLeadsFound está activo. Omitiendo webhook.');
      return { sentCount: 0, successCount: 0, failedCount: 0 };
    }

    const leadPayloads: WebhookLeadPayload[] = leads.map((lead) => WebhookLeadMapper.toPayload(lead));
    const format: WebhookDeliveryFormat = config.deliveryFormat || 'INDIVIDUAL';

    this.logger.log(
      `Despachando webhook a ${config.url} con formato: ${format} para ${leadPayloads.length} leads (syncLog: ${syncLogId || 'n/a'})`,
    );

    let sentCount = 0;
    let successCount = 0;
    let failedCount = 0;

    if (format === 'INDIVIDUAL') {
      for (const singleLead of leadPayloads) {
        sentCount++;
        const res = await this.sendHttpRequest({
          url: config.url,
          payload: singleLead,
          secret: config.secret,
          authToken: config.authToken,
          timeoutMs: config.timeoutMs,
          retryAttempts: config.retryAttempts,
        });

        await this.recordDeliveryLog({
          syncLogId,
          url: config.url,
          deliveryFormat: 'INDIVIDUAL',
          leadsCount: 1,
          httpStatus: res.httpStatus,
          durationMs: res.durationMs,
          status: res.success ? 'SUCCESS' : 'FAILED',
          requestPayload: singleLead,
          responseBody: res.responseBody,
          errorMessage: res.errorMessage,
          attempts: res.attempts,
        });

        if (res.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }
    } else {
      // Modo BATCH o ENVELOPE
      const payloadToSend =
        format === 'BATCH'
          ? leadPayloads
          : {
              event: 'cron.leads.synced',
              timestamp: new Date().toISOString(),
              total: leadPayloads.length,
              leads: leadPayloads,
            };

      sentCount++;
      const res = await this.sendHttpRequest({
        url: config.url,
        payload: payloadToSend,
        secret: config.secret,
        authToken: config.authToken,
        timeoutMs: config.timeoutMs,
        retryAttempts: config.retryAttempts,
      });

      await this.recordDeliveryLog({
        syncLogId,
        url: config.url,
        deliveryFormat: format,
        leadsCount: leadPayloads.length,
        httpStatus: res.httpStatus,
        durationMs: res.durationMs,
        status: res.success ? 'SUCCESS' : 'FAILED',
        requestPayload: Array.isArray(payloadToSend) ? payloadToSend.slice(0, 5) : payloadToSend,
        responseBody: res.responseBody,
        errorMessage: res.errorMessage,
        attempts: res.attempts,
      });

      if (res.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    this.logger.log(`Resultado webhook: ${successCount} exitosos, ${failedCount} fallidos de ${sentCount} peticiones.`);
    return { sentCount, successCount, failedCount };
  }

  /**
   * Envía un lead simulado de prueba bajo demanda para validar la conectividad de la URL.
   */
  async testWebhook(params: {
    url: string;
    secret?: string | null;
    authToken?: string | null;
    deliveryFormat?: WebhookDeliveryFormat;
  }): Promise<WebhookSendResult & { payload: any }> {
    const sampleLead: WebhookLeadPayload = {
      id: '97685098-9ed0-4c08-83dd-aa4dd65061d0',
      source: 'META',
      sourceLeadId: '1414493017527392',
      sourceCampaignId: '120252513155910529',
      formName: 'FORMULARIO AUTOS NACIONAL 2026 V2',
      fullName: 'Vicente Klever Grijalva Laje',
      email: 'vicentegrijalva6@hotmail.com',
      phone: '+593993550844',
      rawPayload: {
        id: '1414493017527392',
        ad_id: '120252513724280529',
        form_id: '845761631911805',
        field_data: [
          { name: '¿en_dónde_quieres_ser_atendido?', values: ['los_ríos'] },
          { name: '¿cómo_quieres_que_te_contactemos?', values: ['whatsapp'] },
          { name: 'full_name', values: ['Vicente Klever Grijalva Laje'] },
          { name: 'ci_(ecuador)', values: ['0909956526'] },
          { name: 'phone_number', values: ['+593993550844'] },
          { name: 'email', values: ['vicentegrijalva6@hotmail.com'] },
        ],
        campaign_id: '120252513155910529',
        created_time: '2026-09-29T11:44:25+0000',
      },
      receivedAt: '2026-09-29T11:44:25.000Z',
      createdAt: new Date().toISOString(),
      cedula: '0909956526',
      submissionCount: 1,
      ciudadDeclarada: 'los_ríos',
      contactPreference: 'whatsapp',
      idCanton: null,
      idProvincia: null,
      idDependencia: null,
      lastSubmissionAt: null,
      canton: null,
      provincia: null,
      dependencia: null,
      campaignId: '120252513155910529',
    };

    const format = params.deliveryFormat || 'INDIVIDUAL';
    const payload =
      format === 'INDIVIDUAL'
        ? sampleLead
        : format === 'BATCH'
          ? [sampleLead]
          : {
              event: 'cron.leads.synced.test',
              timestamp: new Date().toISOString(),
              total: 1,
              leads: [sampleLead],
            };

    const result = await this.sendHttpRequest({
      url: params.url,
      payload,
      secret: params.secret,
      authToken: params.authToken,
      timeoutMs: 8000,
      retryAttempts: 1,
    });

    await this.recordDeliveryLog({
      url: params.url,
      deliveryFormat: format,
      leadsCount: 1,
      httpStatus: result.httpStatus,
      durationMs: result.durationMs,
      status: result.success ? 'SUCCESS' : 'FAILED',
      requestPayload: payload,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      attempts: result.attempts,
    });

    return { ...result, payload };
  }

  /**
   * Realiza la llamada HTTP POST con headers de firma HMAC SHA-256 y reintentos.
   */
  private async sendHttpRequest(options: {
    url: string;
    payload: any;
    secret?: string | null;
    authToken?: string | null;
    timeoutMs?: number;
    retryAttempts?: number;
  }): Promise<WebhookSendResult> {
    const { url, payload, secret, authToken, timeoutMs = 10000, retryAttempts = 3 } = options;
    const bodyString = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MetaAds-TikTok-WebhookEngine/1.0',
      'X-Webhook-Event': 'cron.leads.synced',
    };

    if (authToken && authToken.trim().length > 0) {
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    if (secret && secret.trim().length > 0) {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(bodyString, 'utf8');
      const signature = hmac.digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const maxAttempts = Math.max(1, retryAttempts);
    let currentAttempt = 0;
    let lastError: any = null;
    let lastStatus: number | null = null;
    let lastResponseBody: string | null = null;
    let totalDurationMs = 0;

    while (currentAttempt < maxAttempts) {
      currentAttempt++;
      const startTime = Date.now();

      try {
        const response = await firstValueFrom(
          this.httpService.post(url, bodyString, {
            headers,
            timeout: timeoutMs,
            transformResponse: [(data) => data], // Conservar texto crudo
          }),
        );

        totalDurationMs = Date.now() - startTime;
        const status = response.status;
        const responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const truncatedResponse = responseData ? responseData.substring(0, 1000) : null;

        const isSuccess = status >= 200 && status < 300;
        if (isSuccess) {
          return {
            success: true,
            httpStatus: status,
            durationMs: totalDurationMs,
            responseBody: truncatedResponse,
            errorMessage: null,
            attempts: currentAttempt,
          };
        }

        lastStatus = status;
        lastResponseBody = truncatedResponse;
      } catch (err: any) {
        totalDurationMs = Date.now() - startTime;
        lastError = err;

        if (err.response) {
          lastStatus = err.response.status;
          const respData =
            typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
          lastResponseBody = respData ? respData.substring(0, 1000) : null;
        } else {
          lastStatus = 0;
          lastResponseBody = null;
        }

        // Si es error 4xx de cliente (ej. 401 Unauthorized, 404), no reintentar
        if (lastStatus && lastStatus >= 400 && lastStatus < 500) {
          break;
        }

        // Si aún quedan intentos, esperar con backoff progresivo (500ms, 1000ms...)
        if (currentAttempt < maxAttempts) {
          const waitTime = currentAttempt * 500;
          await new Promise((r) => setTimeout(r, waitTime));
        }
      }
    }

    const errorMsg =
      lastError?.message ||
      (lastStatus ? `HTTP Status ${lastStatus}` : 'Error desconocido al invocar webhook');

    return {
      success: false,
      httpStatus: lastStatus,
      durationMs: totalDurationMs,
      responseBody: lastResponseBody,
      errorMessage: errorMsg,
      attempts: currentAttempt,
    };
  }

  private async recordDeliveryLog(data: Partial<WebhookDeliveryLogOrmEntity>): Promise<void> {
    try {
      const log = this.deliveryLogRepo.create({
        syncLogId: data.syncLogId ?? null,
        url: data.url || '',
        deliveryFormat: data.deliveryFormat || 'INDIVIDUAL',
        leadsCount: data.leadsCount ?? 0,
        httpStatus: data.httpStatus ?? null,
        durationMs: data.durationMs ?? 0,
        status: data.status ?? 'FAILED',
        requestPayload: data.requestPayload ?? null,
        responseBody: data.responseBody ?? null,
        errorMessage: data.errorMessage ?? null,
        attempts: data.attempts ?? 1,
      });

      await this.deliveryLogRepo.save(log);
    } catch (saveErr: any) {
      this.logger.warn(`No se pudo persistir log de webhook: ${saveErr?.message || saveErr}`);
    }
  }
}
