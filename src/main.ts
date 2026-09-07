import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // En prod, loguea solo lo esencial; 'debug'/'verbose' solo en desarrollo.
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : undefined,
  });

  const isProduction = process.env.NODE_ENV === 'production';

  // Cabeceras de seguridad con CSP compatible con Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        },
      },
    }),
  );

  // CORS: en desarrollo o con '*' refleja el origin para permitir credentials: true sin conflicto de spec
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  const isWildcardOrEmpty = !allowedOrigins || allowedOrigins.trim() === '*';

  app.enableCors({
    origin: isWildcardOrEmpty
      ? true
      : allowedOrigins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validación global estricta: rechaza cualquier campo no declarado en los DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Configuración de Swagger / OpenAPI
  const enableSwagger = process.env.SWAGGER_ENABLED === 'true' || !isProduction;

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Meta & TikTok Ads API')
      .setDescription(
        'API empresarial con arquitectura DDD y control de acceso basado en roles y permisos granulares (RBAC) para consumo y sincronización de campañas de Meta Graph API y TikTok Business API, y consolidación centralizada de leads.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticación y emisión de tokens')
      .addTag('meta-ads', 'Campañas e insights de Meta Graph API')
      .addTag('tiktok-ads', 'Campañas y descarga de leads de TikTok Business API')
      .addTag('leads', 'Consulta consolidada y exportación CSV de leads')
      .addTag('platform-credentials', 'Monitoreo y renovación de tokens de acceso')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
    });
  }

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`API corriendo en http://localhost:${port}`);
  if (enableSwagger) {
    logger.log(`Swagger disponible en http://localhost:${port}/docs`);
  }
}

bootstrap();
