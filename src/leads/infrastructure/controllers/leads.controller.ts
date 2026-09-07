import { Controller, Get, Inject, Query, Res } from '@nestjs/common';
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

  @Get()
  @RequirePermissions({
    identificador: 'leads.list',
    nombre: 'Listar Leads Paginados',
  })
  @ApiOperation({ summary: 'Lista leads (Meta y/o TikTok) con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Leads recuperados exitosamente' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async findAll(@Query() query: ListLeadsQueryDto) {
    const { items, total } = await this.leadRepository.findAll({
      source: query.source,
      campaignId: query.campaignId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
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
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: 1,
      pageSize: 5000,
    });

    const header = ['source', 'sourceLeadId', 'campaignId', 'formName', 'fullName', 'email', 'phone', 'receivedAt'];
    const rows = items.map((l) =>
      [
        l.source,
        l.sourceLeadId,
        l.sourceCampaignId ?? '',
        l.formName ?? '',
        l.fullName ?? '',
        l.email ?? '',
        l.phone ?? '',
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
}
