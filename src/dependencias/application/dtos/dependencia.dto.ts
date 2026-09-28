import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { DependenciaEstado } from '../../infrastructure/persistence/entities/dependencia.orm-entity';

export class CreateDependenciaDto {
  @ApiProperty({ description: 'Nombre de la dependencia o sucursal', example: 'Agencia Latacunga' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ description: 'Código único interno', example: 'AG-COT-01' })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiProperty({ description: 'ID de la provincia', example: 5 })
  @IsNumber()
  @IsNotEmpty()
  idProvincia: number;

  @ApiPropertyOptional({ description: 'ID del cantón', example: 36 })
  @IsNumber()
  @IsOptional()
  idCanton?: number;

  @ApiPropertyOptional({ description: 'Dirección física de la sucursal' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Correo de contacto' })
  @IsString()
  @IsOptional()
  correo?: string;

  @ApiPropertyOptional({ enum: DependenciaEstado, default: DependenciaEstado.ACTIVO })
  @IsEnum(DependenciaEstado)
  @IsOptional()
  estado?: DependenciaEstado;
}

export class UpdateDependenciaDto {
  @ApiPropertyOptional({ description: 'Nombre de la dependencia o sucursal' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Código único interno' })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiPropertyOptional({ description: 'ID de la provincia' })
  @IsNumber()
  @IsOptional()
  idProvincia?: number;

  @ApiPropertyOptional({ description: 'ID del cantón' })
  @IsNumber()
  @IsOptional()
  idCanton?: number;

  @ApiPropertyOptional({ description: 'Dirección física' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Correo de contacto' })
  @IsString()
  @IsOptional()
  correo?: string;

  @ApiPropertyOptional({ enum: DependenciaEstado })
  @IsEnum(DependenciaEstado)
  @IsOptional()
  estado?: DependenciaEstado;
}

export class ListDependenciasQueryDto {
  @ApiPropertyOptional({ description: 'Término de búsqueda por nombre, código o dirección' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de provincia' })
  @IsOptional()
  idProvincia?: number;

  @ApiPropertyOptional({ enum: DependenciaEstado, description: 'Filtrar por estado' })
  @IsEnum(DependenciaEstado)
  @IsOptional()
  estado?: DependenciaEstado;
}
