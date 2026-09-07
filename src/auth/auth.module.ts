import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './infrastructure/controllers/auth.controller';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher.service';
import { JwtTokenIssuer } from './infrastructure/services/jwt-token-issuer.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

import { LoginUseCase } from './application/use-cases/login.use-case';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_ISSUER } from './application/ports/token-issuer.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    JwtStrategy,
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
  exports: [PASSWORD_HASHER, USER_REPOSITORY],
})
export class AuthModule {}
