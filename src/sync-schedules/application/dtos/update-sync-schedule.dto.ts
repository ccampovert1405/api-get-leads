import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayNotEmpty,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSyncScheduleDto {
  @ApiProperty({
    description:
      'Días de la semana en que se ejecutará el cron. 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 0 ó 7=Domingo',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(7, { each: true })
  daysOfWeek: number[];

  @ApiProperty({
    description: 'Hora de ejecución (formato 24 horas: 0 a 23)',
    example: 8,
    minimum: 0,
    maximum: 23,
  })
  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @ApiProperty({
    description: 'Minuto de ejecución (0 a 59)',
    example: 30,
    minimum: 0,
    maximum: 59,
  })
  @IsInt()
  @Min(0)
  @Max(59)
  minute: number;

  @ApiPropertyOptional({
    description: 'Estado activo o inactivo de la programación automática',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si se deben sincronizar campañas de Meta Ads',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  syncMeta?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si se deben sincronizar campañas de TikTok Ads',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  syncTikTok?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si se deben descargar automáticamente los leads de cada campaña',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  syncLeads?: boolean;

  @ApiPropertyOptional({
    description: 'Zona horaria para la ejecución del cron',
    example: 'America/Guayaquil',
    default: 'America/Guayaquil',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
