import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformCredentialDto {
  @ApiPropertyOptional({ description: 'Token de acceso vigente de la plataforma' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ description: 'App ID en el panel de desarrolladores' })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional({ description: 'App Secret confidencial' })
  @IsOptional()
  @IsString()
  appSecret?: string;

  @ApiPropertyOptional({ description: 'ID de la Cuenta Publicitaria (Meta: act_XXX) o Anunciante (TikTok: ID numérico)' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'URL base del endpoint de la API oficial' })
  @IsOptional()
  @IsString()
  apiUrl?: string;

  @ApiPropertyOptional({ description: 'Indica si la integración con la plataforma está activa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
