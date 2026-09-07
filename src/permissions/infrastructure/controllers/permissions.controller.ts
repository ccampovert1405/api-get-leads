import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from '../../application/services/permissions.service';
import { CreatePermissionDto } from '../../application/dtos/create-permission.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions({
    identificador: 'permissions.read',
    nombre: 'Ver catálogo de permisos',
  })
  @ApiOperation({ summary: 'Obtiene el catálogo consolidado de todos los permisos del sistema' })
  @ApiResponse({ status: 200, description: 'Catálogo de permisos obtenido exitosamente' })
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @RequirePermissions({
    identificador: 'permissions.read',
    nombre: 'Ver detalle de permiso',
  })
  @ApiOperation({ summary: 'Obtiene el detalle de un permiso' })
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Post()
  @RequirePermissions({
    identificador: 'permissions.create',
    nombre: 'Crear nuevos permisos',
  })
  @ApiOperation({ summary: 'Crea un nuevo permiso en el catálogo de seguridad' })
  @ApiResponse({ status: 201, description: 'Permiso registrado exitosamente' })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Delete(':id')
  @RequirePermissions({
    identificador: 'permissions.delete',
    nombre: 'Eliminar permisos',
  })
  @ApiOperation({ summary: 'Elimina un permiso del catálogo' })
  async remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
