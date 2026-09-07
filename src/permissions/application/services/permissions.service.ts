import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionOrmEntity } from '../../entities/permission.orm-entity';
import { CreatePermissionDto } from '../dtos/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly permissionRepo: Repository<PermissionOrmEntity>,
  ) {}

  async findAll(): Promise<any[]> {
    const permissions = await this.permissionRepo.find({
      relations: { roles: true },
      order: { identificadorAccion: 'ASC' },
    });

    return permissions.map((p) => ({
      permisoId: p.permisoId,
      nombreAccion: p.nombreAccion,
      identificadorAccion: p.identificadorAccion,
      rolesCount: p.roles?.length || 0,
      roles: p.roles?.map((r) => ({ rolId: r.rolId, nombreRol: r.nombreRol })) || [],
    }));
  }

  async findOne(id: string): Promise<PermissionOrmEntity> {
    const perm = await this.permissionRepo.findOne({
      where: { permisoId: id },
      relations: { roles: true },
    });
    if (!perm) {
      throw new NotFoundException(`Permiso con ID "${id}" no encontrado.`);
    }
    return perm;
  }

  async create(dto: CreatePermissionDto): Promise<PermissionOrmEntity> {
    const existing = await this.permissionRepo.findOne({
      where: { identificadorAccion: dto.identificadorAccion },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un permiso con el identificador "${dto.identificadorAccion}".`,
      );
    }

    const newPerm = this.permissionRepo.create({
      nombreAccion: dto.nombreAccion,
      identificadorAccion: dto.identificadorAccion,
    });

    return this.permissionRepo.save(newPerm);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const perm = await this.findOne(id);
    await this.permissionRepo.remove(perm);
    return {
      success: true,
      message: `Permiso "${perm.identificadorAccion}" eliminado exitosamente.`,
    };
  }
}
