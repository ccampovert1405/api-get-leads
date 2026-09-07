import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LoginDto } from '../../application/dtos/login.dto';
import { Public } from '../../../common/decorators/public.decorator';
import {
  InvalidCredentialsException,
  UserInactiveException,
} from '../../domain/exceptions/auth.exceptions';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Limita fuerza bruta: 5 intentos por minuto por IP
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Autentica un usuario y retorna un JWT con sus claims y permisos' })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa, retorna token JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o usuario inactivo' })
  @ApiResponse({ status: 429, description: 'Límite de intentos excedido (rate limit)' })
  async login(@Body() dto: LoginDto) {
    try {
      return await this.loginUseCase.execute(dto.username, dto.password);
    } catch (error) {
      if (
        error instanceof InvalidCredentialsException ||
        error instanceof UserInactiveException
      ) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
