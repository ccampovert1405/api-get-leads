import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetCredentialStatusUseCase } from '../../application/use-cases/get-credential-status.use-case';
import { RenewMetaTokenUseCase } from '../../application/use-cases/renew-meta-token.use-case';
import { Platform } from '../../domain/entities/platform-credential.entity';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

@ApiTags('platform-credentials')
@ApiBearerAuth()
@Controller('platform-credentials')
export class PlatformCredentialsController {
  constructor(
    private readonly getCredentialStatusUseCase: GetCredentialStatusUseCase,
    private readonly renewMetaTokenUseCase: RenewMetaTokenUseCase,
  ) {}

  @Get('meta/status')
  @RequirePermissions({
    identificador: 'credentials.read',
    nombre: 'Consultar Estado Credencial',
  })
  @ApiOperation({ summary: 'Muestra el estado del token de Meta (sin exponer el token en sí)' })
  @ApiResponse({ status: 200, description: 'Estado del token obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async getMetaStatus() {
    const credential = await this.getCredentialStatusUseCase.execute(Platform.META);

    if (!credential) {
      return { configured: false };
    }

    return {
      configured: true,
      hasToken: Boolean(credential.accessToken),
      expiresAt: credential.expiresAt,
      isNearExpiration: credential.isNearExpiration(),
      isExpired: credential.isExpired(),
      lastRenewedAt: credential.lastRenewedAt,
      lastRenewalStatus: credential.lastRenewalStatus,
      lastRenewalError: credential.lastRenewalError,
    };
  }

  @Post('meta/renew')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({
    identificador: 'credentials.renew',
    nombre: 'Renovar Token Meta',
  })
  @ApiOperation({ summary: 'Fuerza una renovación inmediata del token de Meta (fuera del cron semanal)' })
  @ApiResponse({ status: 200, description: 'Renovación procesada' })
  @ApiResponse({ status: 401, description: 'Token de autenticación faltante o inválido' })
  @ApiResponse({ status: 403, description: 'No posee los permisos requeridos' })
  async renewMeta() {
    return this.renewMetaTokenUseCase.execute();
  }
}
