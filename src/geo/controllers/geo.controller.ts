import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinciaOrmEntity } from '../entities/provincia.orm-entity';
import { CantonOrmEntity } from '../entities/canton.orm-entity';

@ApiTags('geo')
@ApiBearerAuth()
@Controller('geo')
export class GeoController {
  constructor(
    @InjectRepository(ProvinciaOrmEntity)
    private readonly provinciaRepo: Repository<ProvinciaOrmEntity>,
    @InjectRepository(CantonOrmEntity)
    private readonly cantonRepo: Repository<CantonOrmEntity>,
  ) {}

  @Get('provincias')
  @ApiOperation({ summary: 'Lista todas las provincias del Ecuador' })
  @ApiResponse({ status: 200, description: 'Provincias obtenidas exitosamente' })
  async getProvincias() {
    return this.provinciaRepo.find({
      order: { provincia: 'ASC' },
      relations: ['cantones'],
    });
  }

  @Get('cantones')
  @ApiOperation({ summary: 'Lista cantones, opcionalmente filtrados por provincia' })
  @ApiResponse({ status: 200, description: 'Cantones obtenidos exitosamente' })
  async getCantones(@Query('provinciaId') provinciaId?: string) {
    const where: any = {};
    if (provinciaId) {
      where.idProvincia = Number(provinciaId);
    }
    return this.cantonRepo.find({
      where,
      order: { canton: 'ASC' },
      relations: ['provincia'],
    });
  }
}
