import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SyncCampaignsUseCase } from '../../application/use-cases/sync-campaigns.use-case';
import { GetCampaignsUseCase } from '../../application/use-cases/get-campaigns.use-case';
import { SyncMetaLeadsUseCase } from '../../application/use-cases/sync-meta-leads.use-case';
import { SyncCampaignsDto } from '../../application/dtos/sync-campaigns.dto';
import { SyncMetaLeadsDto } from '../../application/dtos/sync-meta-leads.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('meta-ads')
@ApiBearerAuth()
@Controller('meta-ads/campaigns')
export class CampaignsController {
  constructor(
    private readonly syncCampaignsUseCase: SyncCampaignsUseCase,
    private readonly getCampaignsUseCase: GetCampaignsUseCase,
    private readonly syncMetaLeadsUseCase: SyncMetaLeadsUseCase,
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({
    identificador: 'meta.campaigns.sync',
    nombre: 'Sincronizar Campañas Meta',
  })
  @ApiOperation({
    summary:
      'Sincroniza campañas desde Meta Graph API. Si se omite adAccountId, toma META_AD_ACCOUNT_ID del .env',
  })
  @ApiResponse({ status: 200, description: 'Campañas sincronizadas exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de cuenta publicitaria inválidos' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async sync(@Body() dto?: SyncCampaignsDto) {
    return this.syncCampaignsUseCase.execute(dto?.adAccountId);
  }

  @Get()
  @RequirePermissions({
    identificador: 'meta.campaigns.list',
    nombre: 'Listar Campañas Meta',
  })
  @ApiOperation({ summary: 'Lista las campañas de Meta persistidas localmente' })
  @ApiResponse({ status: 200, description: 'Listado de campañas recuperado exitosamente' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async findAll() {
    return this.getCampaignsUseCase.execute();
  }

  @Post('leads/sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({
    identificador: 'meta.leads.sync',
    nombre: 'Sincronizar Leads Meta',
  })
  @ApiOperation({
    summary:
      'Descarga los leads de Meta Ads de cada campaña y los persiste en la base de datos unificada',
  })
  @ApiResponse({ status: 200, description: 'Leads de Meta sincronizados exitosamente' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async syncLeads(@Body() dto?: SyncMetaLeadsDto) {
    return this.syncMetaLeadsUseCase.execute({
      campaignId: dto?.campaignId,
      adAccountId: dto?.adAccountId,
      pageId: dto?.pageId,
    });
  }
}
