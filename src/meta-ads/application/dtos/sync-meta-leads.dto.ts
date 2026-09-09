import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncMetaLeadsDto {
  @ApiPropertyOptional({
    example: '1202026123456789',
    description: 'ID específico de campaña de Meta. Si se omite, sincroniza los leads de todas las campañas locales.',
  })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({
    example: 'act_123456789',
    description: 'ID de cuenta publicitaria (act_XXXXXXXXX). Si se omite, usa META_AD_ACCOUNT_ID del .env.',
  })
  @IsOptional()
  @IsString()
  adAccountId?: string;

  @ApiPropertyOptional({
    example: '143369634551577',
    description: 'ID de página de Facebook para consultar formularios de leads. Si se omite, se autodetecta del token.',
  })
  @IsOptional()
  @IsString()
  pageId?: string;
}
