import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Nombre de usuario único para inicio de sesión', example: 'operador_meta' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Contraseña en texto plano (mínimo 6 caracteres)', example: 'SecurePass2026!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'ID del rol asignado (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Nombre del rol asignado', example: 'Analista' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Estado activo o suspendido del usuario', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
