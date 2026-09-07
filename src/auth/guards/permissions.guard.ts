import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Bypass automático para roles administrativos (Super Administrador, Administrador, ADMIN)
    const userRole = (user.role || user.rol || '').toString().toLowerCase();
    if (
      userRole === 'super administrador' ||
      userRole === 'administrador' ||
      userRole === 'admin'
    ) {
      return true;
    }

    const userPermsList: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : Array.isArray(user.permisos)
      ? user.permisos
      : [];

    const userPerms = new Set<string>(userPermsList);
    const hasAll = requiredPermissions.every((perm) => userPerms.has(perm));

    if (!hasAll) {
      throw new ForbiddenException('Acceso denegado: No posee los permisos requeridos');
    }

    return true;
  }
}
