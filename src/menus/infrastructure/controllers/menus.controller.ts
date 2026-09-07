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
import { MenusService } from '../../application/services/menus.service';
import { CreateMenuDto } from '../../application/dtos/create-menu.dto';
import { UpdateMenuDto } from '../../application/dtos/update-menu.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@ApiTags('menus')
@ApiBearerAuth()
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  @RequirePermissions({
    identificador: 'menus.read',
    nombre: 'Ver catálogo de menús',
  })
  @ApiOperation({ summary: 'Obtiene todos los menús registrados ordenados por jerarquía' })
  @ApiResponse({ status: 200, description: 'Listado completo de menús' })
  async findAll() {
    return this.menusService.findAll();
  }

  @Get('my-menus')
  @ApiOperation({ summary: 'Obtiene los menús permitidos para el usuario autenticado según su rol' })
  @ApiResponse({ status: 200, description: 'Menús autorizados para el usuario' })
  async findMyMenus(@CurrentUser() user: any) {
    return this.menusService.findMyMenus(user);
  }

  @Get(':id')
  @RequirePermissions({
    identificador: 'menus.read',
    nombre: 'Ver detalle de menú',
  })
  @ApiOperation({ summary: 'Obtiene el detalle de un menú específico' })
  async findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }

  @Post()
  @RequirePermissions({
    identificador: 'menus.create',
    nombre: 'Crear nuevos menús',
  })
  @ApiOperation({ summary: 'Crea un nuevo ítem de menú en el sistema' })
  @ApiResponse({ status: 201, description: 'Menú creado exitosamente' })
  async create(@Body() dto: CreateMenuDto) {
    return this.menusService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions({
    identificador: 'menus.update',
    nombre: 'Actualizar menús',
  })
  @ApiOperation({ summary: 'Actualiza los datos de un menú existente' })
  async update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menusService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions({
    identificador: 'menus.delete',
    nombre: 'Eliminar menús',
  })
  @ApiOperation({ summary: 'Elimina un menú del sistema' })
  async remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }
}
