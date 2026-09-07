import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SyncTikTokCampaignsUseCase } from '../../application/use-cases/sync-tiktok-campaigns.use-case';
import { GetTikTokCampaignsUseCase } from '../../application/use-cases/get-tiktok-campaigns.use-case';
import { SyncTikTokCampaignsDto } from '../../application/dtos/sync-tiktok-campaigns.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('tiktok-ads')
@ApiBearerAuth()
@Controller('tiktok-ads/campaigns')
export class TikTokCampaignsController {
  constructor(
    private readonly syncCampaignsUseCase: SyncTikTokCampaignsUseCase,
    private readonly getCampaignsUseCase: GetTikTokCampaignsUseCase,
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({
    identificador: 'tiktok.campaigns.sync',
    nombre: 'Sincronizar Campañas TikTok',
  })
  @ApiOperation({ summary: 'Sincroniza campañas desde TikTok Business API' })
  @ApiResponse({ status: 200, description: 'Campañas sincronizadas exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de anunciante inválidos' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async sync(@Body() dto: SyncTikTokCampaignsDto) {
    return this.syncCampaignsUseCase.execute(dto.advertiserId);
  }

  @Get()
  @RequirePermissions({
    identificador: 'tiktok.campaigns.list',
    nombre: 'Listar Campañas TikTok',
  })
  @ApiOperation({ summary: 'Lista las campañas de TikTok persistidas localmente' })
  @ApiResponse({ status: 200, description: 'Listado de campañas recuperado exitosamente' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async findAll() {
    return this.getCampaignsUseCase.execute();
  }
}
