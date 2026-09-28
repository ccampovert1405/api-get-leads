import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import {
  CreateDependenciaDto,
  UpdateDependenciaDto,
  ListDependenciasQueryDto,
} from '../../application/dtos/dependencia.dto';
import { CreateDependenciaUseCase } from '../../application/use-cases/create-dependencia.use-case';
import { UpdateDependenciaUseCase } from '../../application/use-cases/update-dependencia.use-case';
import { ListDependenciasUseCase } from '../../application/use-cases/list-dependencias.use-case';
import { GetDependenciaByIdUseCase } from '../../application/use-cases/get-dependencia-by-id.use-case';
import { DeleteDependenciaUseCase } from '../../application/use-cases/delete-dependencia.use-case';

@ApiTags('dependencias')
@ApiBearerAuth()
@Controller('dependencias')
export class DependenciasController {
  constructor(
    private readonly createDependenciaUseCase: CreateDependenciaUseCase,
    private readonly updateDependenciaUseCase: UpdateDependenciaUseCase,
    private readonly listDependenciasUseCase: ListDependenciasUseCase,
    private readonly getDependenciaByIdUseCase: GetDependenciaByIdUseCase,
    private readonly deleteDependenciaUseCase: DeleteDependenciaUseCase,
  ) {}

  @Get()
  @RequirePermissions({
    identificador: 'dependencias.list',
    nombre: 'Listar Dependencias',
  })
  @ApiOperation({ summary: 'Lista las dependencias o sucursales con filtros por provincia y búsqueda' })
  @ApiResponse({ status: 200, description: 'Dependencias obtenidas exitosamente' })
  async findAll(@Query() query: ListDependenciasQueryDto) {
    return this.listDependenciasUseCase.execute(query);
  }

  @Get(':id')
  @RequirePermissions({
    identificador: 'dependencias.list',
    nombre: 'Listar Dependencias',
  })
  @ApiOperation({ summary: 'Obtiene el detalle de una dependencia por su ID' })
  @ApiResponse({ status: 200, description: 'Dependencia encontrada' })
  async findOne(@Param('id') id: string) {
    return this.getDependenciaByIdUseCase.execute(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({
    identificador: 'dependencias.create',
    nombre: 'Crear Dependencia',
  })
  @ApiOperation({ summary: 'Crea una nueva dependencia asociada a una provincia y cantón' })
  @ApiResponse({ status: 201, description: 'Dependencia creada exitosamente' })
  async create(@Body() dto: CreateDependenciaDto) {
    return this.createDependenciaUseCase.execute(dto);
  }

  @Put(':id')
  @RequirePermissions({
    identificador: 'dependencias.update',
    nombre: 'Actualizar Dependencia',
  })
  @ApiOperation({ summary: 'Actualiza los datos de una dependencia existente' })
  @ApiResponse({ status: 200, description: 'Dependencia actualizada exitosamente' })
  async update(@Param('id') id: string, @Body() dto: UpdateDependenciaDto) {
    return this.updateDependenciaUseCase.execute(id, dto);
  }

  @Delete(':id')
  @RequirePermissions({
    identificador: 'dependencias.delete',
    nombre: 'Eliminar Dependencia',
  })
  @ApiOperation({ summary: 'Elimina una dependencia por su ID' })
  @ApiResponse({ status: 200, description: 'Dependencia eliminada exitosamente' })
  async remove(@Param('id') id: string) {
    return this.deleteDependenciaUseCase.execute(id);
  }
}
