import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DownloadTikTokLeadsUseCase } from '../../application/use-cases/download-tiktok-leads.use-case';
import { DownloadLeadsDto } from '../../application/dtos/download-leads.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('tiktok-ads')
@ApiBearerAuth()
@Controller('tiktok-ads/leads')
export class TikTokLeadsController {
  constructor(private readonly downloadLeadsUseCase: DownloadTikTokLeadsUseCase) {}

  @Post('download')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({
    identificador: 'tiktok.leads.download',
    nombre: 'Descargar Leads TikTok',
  })
  @ApiOperation({
    summary:
      'Descarga leads de un Instant Form de TikTok en un rango de fechas y los persiste. ' +
      'Los leads ya descargados anteriormente se omiten automáticamente (idempotente).',
  })
  @ApiResponse({ status: 200, description: 'Descarga y persistencia de leads completada' })
  @ApiResponse({ status: 400, description: 'Rango de fechas o parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  @ApiResponse({ status: 502, description: 'Fallo al consumir la API de exportación de TikTok' })
  @ApiResponse({ status: 504, description: 'Tiempo de espera excedido esperando generación de archivo en TikTok' })
  async download(@Body() dto: DownloadLeadsDto) {
    return this.downloadLeadsUseCase.execute({
      advertiserId: dto.advertiserId,
      pageId: dto.pageId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
  }
}
