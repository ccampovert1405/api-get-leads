import { IsDateString, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DownloadLeadsDto {
  @ApiProperty({ example: '7012345678901234567', description: 'TikTok advertiser_id' })
  @IsString()
  @MinLength(5)
  advertiserId: string;

  @ApiProperty({ example: '7098765432109876543', description: 'TikTok page_id (Instant Form)' })
  @IsString()
  @MinLength(5)
  pageId: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  endDate: string;
}
