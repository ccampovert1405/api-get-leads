import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Nombre descriptivo y único del rol', example: 'Auditor de Campañas' })
  @IsString()
  @IsNotEmpty()
  nombreRol: string;

  @ApiPropertyOptional({ description: 'Descripción de funciones y responsabilidades del rol', example: 'Acceso para auditar leads y métricas sin modificar configuraciones' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Lista de IDs de permisos asignados',
    example: ['uuid-perm-1', 'uuid-perm-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de menús asignados',
    example: ['uuid-menu-1', 'uuid-menu-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  menuIds?: string[];
}
