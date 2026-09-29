import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookDeliveryFormat } from '../../infrastructure/persistence/entities/webhook-config.orm-entity';

export class TestWebhookDto {
  @ApiPropertyOptional({
    description: 'URL temporal para probar, o se usará la que esté guardada en la configuración',
    example: 'https://webhook.site/#!/...',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Secreto HMAC temporal para probar, o el configurado en BD',
  })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({
    description: 'Token Bearer temporal para probar, o el configurado en BD',
  })
  @IsOptional()
  @IsString()
  authToken?: string;

  @ApiPropertyOptional({
    description: 'Formato temporal a probar',
    enum: ['INDIVIDUAL', 'BATCH', 'ENVELOPE'],
  })
  @IsOptional()
  @IsIn(['INDIVIDUAL', 'BATCH', 'ENVELOPE'])
  deliveryFormat?: WebhookDeliveryFormat;
}
