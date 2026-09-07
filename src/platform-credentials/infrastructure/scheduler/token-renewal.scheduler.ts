import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RenewMetaTokenUseCase } from '../../application/use-cases/renew-meta-token.use-case';

@Injectable()
export class TokenRenewalScheduler {
  private readonly logger = new Logger(TokenRenewalScheduler.name);

  constructor(private readonly renewMetaTokenUseCase: RenewMetaTokenUseCase) {}

  /**
   * Corre cada lunes a las 3:00 AM. Renovar semanalmente da margen amplio
   * incluso frente a tokens de 60 días: nunca pasan más de 7 días sin intentar
   * refrescar, muy por debajo del umbral de expiración.
   */
  @Cron(CronExpression.EVERY_WEEK, { name: 'meta-token-renewal' })
  async handleMetaTokenRenewal(): Promise<void> {
    this.logger.log('Iniciando renovación programada del token de Meta...');
    const result = await this.renewMetaTokenUseCase.execute();

    if (result.renewed) {
      this.logger.log('Renovación programada completada correctamente.');
    } else {
      this.logger.error(
        `Renovación programada falló: ${result.error}. ` +
          'El token vigente sigue en uso; revisar manualmente si el error persiste.',
      );
    }
  }
}
