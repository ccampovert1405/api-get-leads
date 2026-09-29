import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { WebhookConfigService } from '../../application/services/webhook-config.service';
import { WebhookDispatcherService } from '../../application/services/webhook-dispatcher.service';
import { UpdateWebhookConfigDto } from '../../application/dtos/update-webhook-config.dto';
import { TestWebhookDto } from '../../application/dtos/test-webhook.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly configService: WebhookConfigService,
    private readonly dispatcherService: WebhookDispatcherService,
  ) {}

  @Get('config')
  @RequirePermissions({
    identificador: 'webhooks.config.read',
    nombre: 'Consultar configuración de webhook',
  })
  @ApiOperation({ summary: 'Obtener la configuración activa del webhook de sincronización' })
  @ApiResponse({ status: 200, description: 'Configuración recuperada exitosamente' })
  async getConfig() {
    return this.configService.getConfig();
  }

  @Put('config')
  @RequirePermissions({
    identificador: 'webhooks.config.update',
    nombre: 'Actualizar configuración de webhook',
  })
  @ApiOperation({ summary: 'Actualizar la configuración del webhook (URL, secret HMAC, modo de entrega)' })
  @ApiResponse({ status: 200, description: 'Configuración de webhook actualizada exitosamente' })
  async updateConfig(@Body() dto: UpdateWebhookConfigDto) {
    return this.configService.updateConfig(dto);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({
    identificador: 'webhooks.test',
    nombre: 'Probar envío de webhook de sincronización',
  })
  @ApiOperation({
    summary:
      'Envía un lead simulado de prueba hacia la URL configurada (o provista en el body) y retorna la respuesta HTTP en vivo',
  })
  @ApiResponse({ status: 200, description: 'Prueba de webhook ejecutada' })
  async testWebhook(@Body() dto: TestWebhookDto) {
    const currentConfig = await this.configService.getConfig();

    const targetUrl = dto.url || currentConfig.url;
    if (!targetUrl || targetUrl.trim().length === 0) {
      return {
        success: false,
        httpStatus: null,
        durationMs: 0,
        responseBody: null,
        errorMessage: 'Debe ingresar una URL de webhook para realizar la prueba.',
        payload: null,
        attempts: 0,
      };
    }

    return this.dispatcherService.testWebhook({
      url: targetUrl,
      secret: dto.secret !== undefined ? dto.secret : currentConfig.secret,
      authToken: dto.authToken !== undefined ? dto.authToken : currentConfig.authToken,
      deliveryFormat: dto.deliveryFormat || currentConfig.deliveryFormat,
    });
  }

  @Get('logs')
  @RequirePermissions({
    identificador: 'webhooks.logs.read',
    nombre: 'Consultar historial de entregas de webhook',
  })
  @ApiOperation({ summary: 'Consulta el historial de entregas del webhook con paginación' })
  @ApiResponse({ status: 200, description: 'Historial de entregas recuperado' })
  async getLogs(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.configService.getDeliveryLogs(parseInt(limit, 10) || 20, parseInt(offset, 10) || 0);
  }
}
