import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Nombre descriptivo de la acción o permiso', example: 'Exportar Reporte Financiero' })
  @IsString()
  @IsNotEmpty()
  nombreAccion: string;

  @ApiProperty({ description: 'Identificador técnico en formato módulo.acción', example: 'reports.finance.export' })
  @IsString()
  @IsNotEmpty()
  identificadorAccion: string;
}
