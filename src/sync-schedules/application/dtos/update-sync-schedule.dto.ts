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
  IsEnum,
} from 'class-validator';

export enum ScheduleMode {
  EXACT_TIME = 'EXACT_TIME',
  INTERVAL = 'INTERVAL',
  CUSTOM_HOURS = 'CUSTOM_HOURS',
}

export class UpdateSyncScheduleDto {
  @ApiPropertyOptional({
    description:
      'Modalidad de programación del cron: EXACT_TIME (hora fija), INTERVAL (cada X horas), CUSTOM_HOURS (horas específicas)',
    enum: ScheduleMode,
    default: ScheduleMode.EXACT_TIME,
  })
  @IsOptional()
  @IsEnum(ScheduleMode)
  scheduleMode?: ScheduleMode;

  @ApiPropertyOptional({
    description: 'Intervalo en horas si scheduleMode es INTERVAL (ej: 2, 3, 4, 6, 8, 12)',
    example: 4,
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  intervalHours?: number;

  @ApiPropertyOptional({
    description:
      'Lista de horas específicas del día (0 a 23) si scheduleMode es CUSTOM_HOURS (ej: [11, 14] para 11am y 2pm)',
    example: [11, 14],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(23, { each: true })
  customHours?: number[];

  @ApiPropertyOptional({
    description: 'Cantidad de veces que se ejecutará en el día',
    example: 2,
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  timesPerDay?: number;

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

  @ApiPropertyOptional({
    description: 'Hora de ejecución (formato 24 horas: 0 a 23) para modalidad EXACT_TIME',
    example: 8,
    minimum: 0,
    maximum: 23,
    default: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

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
