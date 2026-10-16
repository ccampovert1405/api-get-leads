import { Controller, Get, Inject, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ILeadRepository, LEAD_REPOSITORY } from '../../domain/repositories/lead.repository.interface';
import { ListLeadsQueryDto } from '../../application/dtos/list-leads-query.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leadRepository: ILeadRepository) {}

  @Get('webhook-status')
  @RequirePermissions({
    identificador: 'leads.webhook-status.read',
    nombre: 'Consultar estado y métricas de webhook de leads',
  })
  @ApiOperation({ summary: 'Obtiene métricas de leads (total, enviados por webhook, pendientes y fallidos)' })
  @ApiResponse({ status: 200, description: 'Resumen de estado de webhook recuperado exitosamente' })
  async getWebhookStatus() {
    return this.leadRepository.getWebhookStatusSummary();
  }

  @Get()
  @RequirePermissions({
    identificador: 'leads.list',
    nombre: 'Listar Leads Paginados',
  })
  @ApiOperation({ summary: 'Lista leads (Meta y/o TikTok) con filtros geográficos, dependencias y paginación' })
  @ApiResponse({ status: 200, description: 'Leads recuperados exitosamente' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async findAll(@Query() query: ListLeadsQueryDto) {
    const pageSize = query.pageSize ?? query.limit ?? 50;
    const { items, total } = await this.leadRepository.findAll({
      source: query.source,
      campaignId: query.campaignId,
      provinciaId: query.provinciaId,
      dependenciaId: query.dependenciaId,
      search: query.search,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      pageSize,
    });

    return {
      total,
      page: query.page ?? 1,
      pageSize,
      items,
    };
  }

  @Get('export')
  @RequirePermissions({
    identificador: 'leads.export',
    nombre: 'Exportar Leads CSV',
  })
  @ApiOperation({ summary: 'Descarga los leads filtrados como archivo CSV (hasta 5000 filas)' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'Archivo CSV descargado correctamente' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async export(@Query() query: ListLeadsQueryDto, @Res({ passthrough: true }) res: Response): Promise<string> {
    const { items } = await this.leadRepository.findAll({
      source: query.source,
      campaignId: query.campaignId,
      provinciaId: query.provinciaId,
      dependenciaId: query.dependenciaId,
      search: query.search,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: 1,
      pageSize: 5000,
    });

    const header = [
      'source',
      'sourceLeadId',
      'cedula',
      'fullName',
      'email',
      'phone',
      'submissionCount',
      'contactPreference',
      'ciudadDeclarada',
      'provincia',
      'canton',
      'dependencia',
      'campaignId',
      'formName',
      'receivedAt',
    ];
    const rows = items.map((l) =>
      [
        l.source,
        l.sourceLeadId,
        l.cedula ?? '',
        l.fullName ?? '',
        l.email ?? '',
        l.phone ?? '',
        l.submissionCount,
        l.contactPreference ?? '',
        l.ciudadDeclarada ?? '',
        l.provincia?.nombre ?? '',
        l.canton?.nombre ?? '',
        l.dependencia?.nombre ?? '',
        l.sourceCampaignId ?? '',
        l.formName ?? '',
        l.receivedAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.csv"`);
    return csv;
  }

  @Get(':id')
  @RequirePermissions({
    identificador: 'leads.read',
    nombre: 'Consultar detalle de Lead',
  })
  @ApiOperation({ summary: 'Obtiene el detalle de un lead por su ID, incluyendo la estructura JSON despachada por webhook' })
  @ApiResponse({ status: 200, description: 'Detalle de lead recuperado' })
  @ApiResponse({ status: 404, description: 'Lead no encontrado' })
  async findOne(@Param('id') id: string) {
    const leads = await this.leadRepository.findByIds([id]);
    if (!leads || leads.length === 0) {
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);
    }
    return leads[0];
  }
}
