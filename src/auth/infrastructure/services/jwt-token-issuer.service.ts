import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccessToken, ITokenIssuer, JwtPayload } from '../../application/ports/token-issuer.port';

@Injectable()
export class JwtTokenIssuer implements ITokenIssuer {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  sign(payload: JwtPayload): AccessToken {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '8h');

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn }),
      expiresIn,
      tokenType: 'Bearer',
      user: {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        permissions: payload.permissions || [],
      },
    };
  }
}
