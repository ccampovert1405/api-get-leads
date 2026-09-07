import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateMenuDto {
  @ApiProperty({ description: 'Etiqueta o nombre visible del menú', example: 'Leads Unificados' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Ruta o identificador de pestaña', example: '/leads' })
  @IsString()
  @IsNotEmpty()
  ruta: string;

  @ApiPropertyOptional({ description: 'Nombre del icono Material Symbol', example: 'contacts' })
  @IsString()
  @IsOptional()
  icono?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 1, default: 0 })
  @IsInt()
  @IsOptional()
  orden?: number;

  @ApiPropertyOptional({
    description: 'Sección o tipo de menú',
    example: 'Principal',
    default: 'Principal',
  })
  @IsString()
  @IsOptional()
  tipo?: string;
}
