import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesService } from '../../application/services/roles.service';
import { CreateRoleDto } from '../../application/dtos/create-role.dto';
import { UpdateRoleDto } from '../../application/dtos/update-role.dto';
import { AssignPermissionsDto } from '../../application/dtos/assign-permissions.dto';
import { AssignMenusDto } from '../../application/dtos/assign-menus.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';


@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions({
    identificador: 'roles.read',
    nombre: 'Ver catálogo de roles',
  })
  @ApiOperation({ summary: 'Obtiene todos los roles con sus permisos y menús vinculados' })
  @ApiResponse({ status: 200, description: 'Catálogo de roles recuperado exitosamente' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions({
    identificador: 'roles.read',
    nombre: 'Ver detalle de rol',
  })
  @ApiOperation({ summary: 'Obtiene la información y permisos detallados de un rol' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions({
    identificador: 'roles.create',
    nombre: 'Crear nuevos roles',
  })
  @ApiOperation({ summary: 'Crea un nuevo rol y asigna sus permisos y menús iniciales' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions({
    identificador: 'roles.update',
    nombre: 'Actualizar roles y asignaciones',
  })
  @ApiOperation({ summary: 'Actualiza nombre, descripción, permisos o menús de un rol' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Post(':id/permissions')
  @RequirePermissions({
    identificador: 'roles.assign_permissions',
    nombre: 'Asignar permisos a roles',
  })
  @ApiOperation({ summary: 'Sincroniza masivamente el conjunto de permisos asignados a un rol' })
  async assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rolesService.assignPermissions(id, dto.permissionIds);
  }

  @Post(':id/menus')
  @RequirePermissions({
    identificador: 'roles.assign_menus',
    nombre: 'Asignar menús a roles',
  })
  @ApiOperation({ summary: 'Sincroniza masivamente el conjunto de menús asignados a un rol' })
  async assignMenus(@Param('id') id: string, @Body() dto: AssignMenusDto) {
    return this.rolesService.assignMenus(id, dto.menuIds);
  }

  @Delete(':id')
  @RequirePermissions({
    identificador: 'roles.delete',
    nombre: 'Eliminar roles',
  })
  @ApiOperation({ summary: 'Elimina un rol del sistema' })
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
