import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncCampaignsDto {
  @ApiPropertyOptional({
    example: 'act_123456789',
    description: 'ID de la cuenta publicitaria (act_XXXXXXXXX). Si se omite, usa META_AD_ACCOUNT_ID del .env.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^act_\d+$/, { message: 'adAccountId inválido, formato esperado act_XXXXXXXXX' })
  adAccountId?: string;
}
