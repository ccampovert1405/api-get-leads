import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WebhookConfigOrmEntity } from '../../infrastructure/persistence/entities/webhook-config.orm-entity';
import { WebhookDeliveryLogOrmEntity } from '../../infrastructure/persistence/entities/webhook-delivery-log.orm-entity';
import { UpdateWebhookConfigDto } from '../dtos/update-webhook-config.dto';

@Injectable()
export class WebhookConfigService {
  private readonly logger = new Logger(WebhookConfigService.name);

  constructor(
    @InjectRepository(WebhookConfigOrmEntity)
    private readonly configRepo: Repository<WebhookConfigOrmEntity>,
    @InjectRepository(WebhookDeliveryLogOrmEntity)
    private readonly logRepo: Repository<WebhookDeliveryLogOrmEntity>,
  ) {}

  /**
   * Obtiene la configuración activa del webhook o inicializa una por defecto.
   */
  async getConfig(): Promise<WebhookConfigOrmEntity> {
    return this.getOrCreateDefaultConfig();
  }

  /**
   * Actualiza los parámetros del webhook configurados por el cliente.
   */
  async updateConfig(dto: UpdateWebhookConfigDto): Promise<WebhookConfigOrmEntity> {
    const config = await this.getOrCreateDefaultConfig();

    if (dto.url !== undefined) config.url = dto.url ? dto.url.trim() : null;
    if (dto.secret !== undefined) config.secret = dto.secret ? dto.secret.trim() : null;
    if (dto.authToken !== undefined) config.authToken = dto.authToken ? dto.authToken.trim() : null;
    if (dto.isEnabled !== undefined) config.isEnabled = dto.isEnabled;
    if (dto.deliveryFormat !== undefined) config.deliveryFormat = dto.deliveryFormat;
    if (dto.triggerOnlyWhenLeadsFound !== undefined) config.triggerOnlyWhenLeadsFound = dto.triggerOnlyWhenLeadsFound;
    if (dto.retryAttempts !== undefined) config.retryAttempts = dto.retryAttempts;
    if (dto.timeoutMs !== undefined) config.timeoutMs = dto.timeoutMs;

    const saved = await this.configRepo.save(config);
    this.logger.log(`Configuración de Webhook actualizada: URL=${saved.url}, Habilitado=${saved.isEnabled}, Formato=${saved.deliveryFormat}`);
    return saved;
  }

  /**
   * Consulta el historial paginado de entregas del webhook.
   */
  async getDeliveryLogs(limit = 20, offset = 0): Promise<{ items: WebhookDeliveryLogOrmEntity[]; total: number }> {
    const [items, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });

    return { items, total };
  }

  /**
   * Obtiene el primer registro de configuración existente o crea uno inicial.
   */
  async getOrCreateDefaultConfig(): Promise<WebhookConfigOrmEntity> {
    const existing = await this.configRepo.find({
      take: 1,
      order: { createdAt: 'ASC' },
    });

    if (existing.length > 0) {
      return existing[0];
    }

    const created = this.configRepo.create({
      url: null,
      secret: null,
      authToken: null,
      isEnabled: false,
      deliveryFormat: 'INDIVIDUAL',
      triggerOnlyWhenLeadsFound: true,
      retryAttempts: 3,
      timeoutMs: 10000,
    });

    const saved = await this.configRepo.save(created);
    this.logger.log('Registro predeterminado de configuración de Webhook inicializado en BD.');
    return saved;
  }
}
