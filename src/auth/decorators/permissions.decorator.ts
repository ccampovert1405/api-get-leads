import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionDescriptor {
  identificador: string;
  nombre?: string;
}

export type PermissionInput = string | PermissionDescriptor;

export const RequirePermissions = (...permissions: PermissionInput[]) => {
  const normalized = permissions.map((p) => {
    if (typeof p === 'string') return p;
    return p.identificador;
  });
  return SetMetadata(PERMISSIONS_KEY, normalized);
};
