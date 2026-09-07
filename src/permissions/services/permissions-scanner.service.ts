import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionOrmEntity } from '../entities/permission.orm-entity';
import { RoleOrmEntity } from '../../roles/entities/role.orm-entity';
import { PERMISSIONS_KEY, PermissionDescriptor, PermissionInput } from '../../auth/decorators/permissions.decorator';

@Injectable()
export class PermissionsScannerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsScannerService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @InjectRepository(PermissionOrmEntity)
    private readonly permissionRepo: Repository<PermissionOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepo: Repository<RoleOrmEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.scanAndSyncPermissions();
  }

  async scanAndSyncPermissions(): Promise<void> {
    const discoveredPermissions = new Map<string, string>();
    const controllers = this.discoveryService.getControllers();

    for (const controller of controllers) {
      if (!controller.instance) continue;
      const instance = controller.instance;
      const prototype = Object.getPrototypeOf(instance);

      // Metadatos a nivel de clase
      const classPerms = this.reflector.get<PermissionInput[] | undefined>(
        PERMISSIONS_KEY,
        instance.constructor,
      );
      this.extractPermissions(classPerms, discoveredPermissions);

      // Metadatos a nivel de método
      if (prototype) {
        const methodNames = this.metadataScanner.getAllMethodNames(prototype);
        for (const methodName of methodNames) {
          const handler = prototype[methodName];
          if (typeof handler !== 'function') continue;
          const methodPerms = this.reflector.get<PermissionInput[] | undefined>(
            PERMISSIONS_KEY,
            handler,
          );
          this.extractPermissions(methodPerms, discoveredPermissions);
        }
      }
    }

    if (discoveredPermissions.size === 0) {
      this.logger.log('No se descubrieron permisos @RequirePermissions en los controladores.');
      return;
    }

    const allPermissionsInDb: PermissionOrmEntity[] = [];

    for (const [identificador, nombreSugerido] of discoveredPermissions.entries()) {
      let perm = await this.permissionRepo.findOne({
        where: { identificadorAccion: identificador },
      });

      if (!perm) {
        perm = await this.permissionRepo.save(
          this.permissionRepo.create({
            identificadorAccion: identificador,
            nombreAccion: nombreSugerido,
          }),
        );
        this.logger.log(`✨ [Auto-Permiso] Registrado en BD: [${identificador}] - "${nombreSugerido}"`);
      }
      allPermissionsInDb.push(perm);
    }

    // Vincular automáticamente todos los permisos al rol Super Administrador
    let superRole = await this.roleRepo.findOne({
      where: { nombreRol: 'Super Administrador' },
      relations: { permisos: true },
    });

    if (!superRole) {
      superRole = await this.roleRepo.save(
        this.roleRepo.create({
          nombreRol: 'Super Administrador',
          descripcion: 'Acceso total y sin restricciones a todos los recursos del sistema',
          permisos: allPermissionsInDb,
        }),
      );
      this.logger.log('✨ [Auto-Rol] Rol "Super Administrador" creado y sincronizado.');
    } else {
      const existingPermIds = new Set(superRole.permisos?.map((p) => p.permisoId) || []);
      const toAdd = allPermissionsInDb.filter((p) => !existingPermIds.has(p.permisoId));
      if (toAdd.length > 0) {
        superRole.permisos = [...(superRole.permisos || []), ...toAdd];
        await this.roleRepo.save(superRole);
        this.logger.log(`✨ [Auto-Rol] ${toAdd.length} nuevos permisos vinculados a "Super Administrador".`);
      }
    }
  }

  private extractPermissions(
    metadataValue: PermissionInput[] | undefined,
    targetMap: Map<string, string>,
  ): void {
    if (!metadataValue) return;
    const items = Array.isArray(metadataValue) ? metadataValue : [metadataValue];

    for (const item of items) {
      if (typeof item === 'string') {
        if (!targetMap.has(item)) {
          targetMap.set(item, this.formatPermissionName(item));
        }
      } else if (item && typeof item === 'object' && item.identificador) {
        targetMap.set(
          item.identificador,
          item.nombre || this.formatPermissionName(item.identificador),
        );
      }
    }
  }

  private formatPermissionName(identificador: string): string {
    const parts = identificador.split('.');
    if (parts.length >= 2) {
      const module = parts[0];
      const action = parts[parts.length - 1];
      const actionMap: Record<string, string> = {
        create: 'Crear',
        list: 'Listar',
        read: 'Consultar',
        update: 'Actualizar',
        delete: 'Eliminar',
        export: 'Exportar',
        sync: 'Sincronizar',
        download: 'Descargar',
        renew: 'Renovar',
      };
      const formattedAction = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
      const formattedModule = module.charAt(0).toUpperCase() + module.slice(1);
      return `${formattedAction} ${formattedModule}`;
    }
    return identificador;
  }
}
