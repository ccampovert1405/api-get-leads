import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../application/ports/token-issuer.port';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      // Falla rápido en boot si falta el secreto: nunca arrancar sin JWT_SECRET en prod.
      throw new Error('JWT_SECRET no está configurado');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException('Token inválido');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions || [],
    };
  }
}
