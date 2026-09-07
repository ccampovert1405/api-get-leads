import { Inject, Injectable, Logger } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IPasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.port';
import { ITokenIssuer, TOKEN_ISSUER, AccessToken } from '../ports/token-issuer.port';
import {
  InvalidCredentialsException,
  UserInactiveException,
} from '../../domain/exceptions/auth.exceptions';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: ITokenIssuer,
  ) {}

  async execute(username: string, plainPassword: string): Promise<AccessToken> {
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      // No revelamos si el usuario existe o no (mitiga user enumeration)
      this.logger.warn(`Intento de login con usuario inexistente: ${username}`);
      throw new InvalidCredentialsException();
    }

    if (!user.canAuthenticate()) {
      throw new UserInactiveException(username);
    }

    const passwordMatches = await this.passwordHasher.compare(plainPassword, user.passwordHash);

    if (!passwordMatches) {
      this.logger.warn(`Contraseña incorrecta para usuario: ${username}`);
      throw new InvalidCredentialsException();
    }

    this.logger.log(`Login exitoso: ${username} (Rol: ${user.role})`);

    return this.tokenIssuer.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    });
  }
}
