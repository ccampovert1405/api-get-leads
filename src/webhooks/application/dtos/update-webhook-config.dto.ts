import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookDeliveryFormat } from '../../infrastructure/persistence/entities/webhook-config.orm-entity';

export class UpdateWebhookConfigDto {
  @ApiPropertyOptional({
    description: 'URL destino del webhook configurada por el cliente (debe iniciar con http:// o https://)',
    example: 'https://mi-crm.com/api/webhooks/leads',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Clave secreta opcional para firmar criptográficamente el payload con HMAC SHA-256',
    example: 'mi_secreto_super_seguro_123',
  })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({
    description: 'Token opcional para cabecera Authorization: Bearer <token>',
    example: 'eyJhbGciOiJIUzI1NiIsIn...',
  })
  @IsOptional()
  @IsString()
  authToken?: string;

  @ApiPropertyOptional({
    description: 'Habilitar o pausar el despacho de webhooks al terminar el crontab',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Formato de entrega: INDIVIDUAL (1 POST por cada lead), BATCH (1 POST con array de leads), ENVELOPE (1 POST con metadata y array)',
    enum: ['INDIVIDUAL', 'BATCH', 'ENVELOPE'],
    example: 'INDIVIDUAL',
  })
  @IsOptional()
  @IsIn(['INDIVIDUAL', 'BATCH', 'ENVELOPE'])
  deliveryFormat?: WebhookDeliveryFormat;

  @ApiPropertyOptional({
    description: 'Si es true, solo dispara el webhook si se descargaron leads en esa corrida',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  triggerOnlyWhenLeadsFound?: boolean;

  @ApiPropertyOptional({
    description: 'Número de reintentos en caso de fallo (0 - 5)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  retryAttempts?: number;

  @ApiPropertyOptional({
    description: 'Tiempo límite de espera en milisegundos (1000 - 60000)',
    example: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;
}
