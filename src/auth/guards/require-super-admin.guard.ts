import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class RequireSuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const role = (user.role || user.rol || '').toString().trim().toLowerCase();

    if (role !== 'super administrador') {
      throw new ForbiddenException(
        'Acceso restringido: Esta acción o sección de variables solo puede ser configurada por el Super Administrador.',
      );
    }

    return true;
  }
}
