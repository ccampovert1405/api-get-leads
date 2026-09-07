import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nombre de usuario', example: 'operador_meta' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'Nueva contraseña (opcional)', example: 'NewSecurePass2026!' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'ID del rol asignado', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Nombre del rol asignado', example: 'Analista' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Estado activo o suspendido', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
