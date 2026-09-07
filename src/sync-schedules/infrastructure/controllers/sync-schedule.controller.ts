import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SyncScheduleService } from '../../application/services/sync-schedule.service';
import { UpdateSyncScheduleDto } from '../../application/dtos/update-sync-schedule.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('Programación de Sincronización')
@ApiBearerAuth()
@Controller('sync-schedules')
export class SyncScheduleController {
  constructor(private readonly syncScheduleService: SyncScheduleService) {}

  @Get()
  @RequirePermissions({
    identificador: 'sync.schedules.read',
    nombre: 'Ver configuración de sincronización programada',
  })
  @ApiOperation({
    summary: 'Obtener configuración del Crontab de sincronización',
    description:
      'Devuelve los parámetros activos (días de semana, hora, minuto, plataformas), la expresión cron resultante y la fecha/hora de la próxima ejecución programada.',
  })
  @ApiResponse({ status: 200, description: 'Configuración actual recuperada exitosamente' })
  async getSchedule() {
    return this.syncScheduleService.getSchedule();
  }

  @Put()
  @RequirePermissions({
    identificador: 'sync.schedules.update',
    nombre: 'Actualizar configuración de sincronización programada',
  })
  @ApiOperation({
    summary: 'Actualizar parámetros del Crontab de sincronización',
    description:
      'Modifica los días de la semana, hora, minuto y opciones de sincronización en BD y reprograma el CronJob en memoria de forma inmediata sin reiniciar el servidor.',
  })
  @ApiResponse({ status: 200, description: 'Configuración actualizada y CronJob reprogramado' })
  async updateSchedule(@Body() dto: UpdateSyncScheduleDto) {
    return this.syncScheduleService.updateSchedule(dto);
  }

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({
    identificador: 'sync.schedules.trigger',
    nombre: 'Ejecutar sincronización programada bajo demanda',
  })
  @ApiOperation({
    summary: 'Disparar sincronización manual inmediata',
    description:
      'Ejecuta en este instante el flujo de sincronización de campañas y leads (Meta Ads y TikTok Ads) tal como lo haría el cron, guardando el log de resultados.',
  })
  @ApiResponse({ status: 200, description: 'Sincronización manual ejecutada exitosamente' })
  @ApiResponse({ status: 409, description: 'Conflicto: ya hay una sincronización en curso' })
  async triggerManualSync() {
    return this.syncScheduleService.triggerManualSync();
  }

  @Get('logs')
  @RequirePermissions({
    identificador: 'sync.schedules.logs.read',
    nombre: 'Ver historial de ejecuciones de sincronización',
  })
  @ApiOperation({
    summary: 'Consultar historial de ejecuciones y logs',
    description:
      'Obtiene el listado cronológico de las sincronizaciones ejecutadas (por CRON o MANUAL), su estado (SUCCESS/FAILED), duración y cantidades procesadas.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Historial de logs recuperado' })
  async getLogs(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.syncScheduleService.getExecutionLogs(limit, offset);
  }
}
