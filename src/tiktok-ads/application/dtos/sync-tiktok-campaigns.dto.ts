import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncTikTokCampaignsDto {
  @ApiPropertyOptional({
    example: '7012345678901234567',
    description: 'TikTok advertiser_id. Si se omite, usa TIKTOK_ADVERTISER_ID del .env.',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  advertiserId?: string;
}
