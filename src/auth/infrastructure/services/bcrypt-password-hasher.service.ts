import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly saltRounds: number;

  constructor(private readonly configService: ConfigService) {
    // 12 rounds: estándar recomendado para producción en 2026 (balance costo-cómputo/seguridad).
    this.saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
  }

  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.saltRounds);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
