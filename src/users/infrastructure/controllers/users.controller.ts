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
import { UsersService } from '../../application/services/users.service';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UpdateUserDto } from '../../application/dtos/update-user.dto';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions({
    identificador: 'users.read',
    nombre: 'Ver listado de usuarios',
  })
  @ApiOperation({ summary: 'Obtiene el listado de todos los usuarios registrados' })
  @ApiResponse({ status: 200, description: 'Listado de usuarios obtenido correctamente' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions({
    identificador: 'users.read',
    nombre: 'Ver detalle de usuario',
  })
  @ApiOperation({ summary: 'Obtiene el perfil y detalles de un usuario' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions({
    identificador: 'users.create',
    nombre: 'Crear nuevos usuarios',
  })
  @ApiOperation({ summary: 'Registra un nuevo usuario en el sistema con su rol' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions({
    identificador: 'users.update',
    nombre: 'Actualizar datos de usuario',
  })
  @ApiOperation({ summary: 'Actualiza rol, estado o contraseña de un usuario' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions({
    identificador: 'users.delete',
    nombre: 'Eliminar usuarios',
  })
  @ApiOperation({ summary: 'Elimina un usuario del sistema' })
  async remove(@Param('id') id: string, @CurrentUser('sub') currentUserId: string) {
    return this.usersService.remove(id, currentUserId);
  }
}
