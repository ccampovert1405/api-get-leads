import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  CampaignNotFoundException,
  InvalidCampaignDataException,
} from '../../meta-ads/domain/exceptions/domain.exceptions';
import {
  InvalidCredentialsException,
  UserInactiveException,
} from '../../auth/domain/exceptions/auth.exceptions';
import {
  InvalidTikTokCampaignDataException,
  TikTokLeadsExportFailedException,
  TikTokLeadsExportTimeoutException,
} from '../../tiktok-ads/domain/exceptions/domain.exceptions';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Traduce excepciones de dominio a códigos HTTP semánticos y normaliza
 * el shape de todas las respuestas de error de la API según el estándar corporativo.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  // Mapa de excepciones de dominio -> status HTTP.
  private readonly domainExceptionStatusMap = new Map<Function, { status: HttpStatus; error: string }>([
    [CampaignNotFoundException, { status: HttpStatus.NOT_FOUND, error: 'Not Found' }],
    [InvalidCampaignDataException, { status: HttpStatus.BAD_REQUEST, error: 'Bad Request' }],
    [InvalidCredentialsException, { status: HttpStatus.UNAUTHORIZED, error: 'Unauthorized' }],
    [UserInactiveException, { status: HttpStatus.FORBIDDEN, error: 'Forbidden' }],
    [InvalidTikTokCampaignDataException, { status: HttpStatus.BAD_REQUEST, error: 'Bad Request' }],
    [TikTokLeadsExportFailedException, { status: HttpStatus.BAD_GATEWAY, error: 'Bad Gateway' }],
    [TikTokLeadsExportTimeoutException, { status: HttpStatus.GATEWAY_TIMEOUT, error: 'Gateway Timeout' }],
  ]);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveError(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode}: ${message}`);
    }

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private resolveError(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();

      if (typeof response === 'string') {
        return { statusCode: status, message: response, error: exception.name };
      }

      const body = response as Record<string, unknown>;
      return {
        statusCode: status,
        message: (body.message as string | string[]) ?? exception.message,
        error: (body.error as string) || exception.name || 'Http Exception',
      };
    }

    for (const [exceptionClass, config] of this.domainExceptionStatusMap.entries()) {
      if (exception instanceof exceptionClass) {
        return {
          statusCode: config.status,
          message: (exception as Error).message,
          error: config.error,
        };
      }
    }

    // Excepción no reconocida: nunca filtramos el stack/detalle interno al cliente.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrió un error inesperado en el servidor',
      error: 'Internal Server Error',
    };
  }
}
