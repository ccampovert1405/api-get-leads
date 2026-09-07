import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface StandardApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, StandardApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardApiResponse<T> | T> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((resData) => {
        // Si es una exportación de archivo (CSV u otro tipo no JSON) o cabeceras ya enviadas, no envolver
        const contentType = response.getHeader('content-type');
        if (
          response.headersSent ||
          (typeof contentType === 'string' && (contentType.includes('text/csv') || contentType.includes('application/octet-stream')))
        ) {
          return resData;
        }

        let message = 'Operación completada exitosamente';
        let data = resData;

        if (resData && typeof resData === 'object' && 'message' in resData && 'data' in resData) {
          message = (resData as any).message;
          data = (resData as any).data;
        } else if (
          resData &&
          typeof resData === 'object' &&
          'message' in resData &&
          Object.keys(resData).length === 1
        ) {
          message = (resData as any).message;
          data = null as any;
        }

        return {
          success: true,
          statusCode,
          message,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
