import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlatformCredentialOrmEntity } from './infrastructure/persistence/entities/platform-credential.orm-entity';
import { TypeOrmPlatformCredentialRepository } from './infrastructure/persistence/typeorm-platform-credential.repository';
import { MetaTokenExchangeService } from './infrastructure/http/meta-token-exchange.service';
import { SeedInitialCredentialService } from './infrastructure/bootstrap/seed-initial-credential.service';
import { TokenRenewalScheduler } from './infrastructure/scheduler/token-renewal.scheduler';
import { PlatformCredentialsController } from './infrastructure/controllers/platform-credentials.controller';

import { RenewMetaTokenUseCase } from './application/use-cases/renew-meta-token.use-case';
import { GetCredentialStatusUseCase } from './application/use-cases/get-credential-status.use-case';
import { META_TOKEN_RENEWAL_PORT } from './application/ports/token-renewal.port';
import { PLATFORM_CREDENTIAL_REPOSITORY } from './domain/repositories/platform-credential.repository.interface';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({ timeout: 10000 }),
    TypeOrmModule.forFeature([PlatformCredentialOrmEntity]),
  ],
  controllers: [PlatformCredentialsController],
  providers: [
    RenewMetaTokenUseCase,
    GetCredentialStatusUseCase,
    SeedInitialCredentialService,
    TokenRenewalScheduler,
    { provide: PLATFORM_CREDENTIAL_REPOSITORY, useClass: TypeOrmPlatformCredentialRepository },
    { provide: META_TOKEN_RENEWAL_PORT, useClass: MetaTokenExchangeService },
  ],
  exports: [PLATFORM_CREDENTIAL_REPOSITORY],
})
export class PlatformCredentialsModule {}
