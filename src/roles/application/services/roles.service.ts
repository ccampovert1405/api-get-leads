import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleOrmEntity } from '../../entities/role.orm-entity';
import { PermissionOrmEntity } from '../../../permissions/entities/permission.orm-entity';
import { MenuOrmEntity } from '../../../menus/entities/menu.orm-entity';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepo: Repository<RoleOrmEntity>,
    @InjectRepository(PermissionOrmEntity)
    private readonly permissionRepo: Repository<PermissionOrmEntity>,
    @InjectRepository(MenuOrmEntity)
    private readonly menuRepo: Repository<MenuOrmEntity>,
  ) {}

  async findAll(): Promise<any[]> {
    const roles = await this.roleRepo.find({
      relations: { permisos: true, menus: true, usuarios: true },
      order: { nombreRol: 'ASC' },
    });

    return roles.map((r) => ({
      rolId: r.rolId,
      nombreRol: r.nombreRol,
      descripcion: r.descripcion,
      permisosCount: r.permisos?.length || 0,
      menusCount: r.menus?.length || 0,
      usersCount: r.usuarios?.length || 0,
      permisos: r.permisos || [],
      menus: r.menus || [],
    }));
  }

  async findOne(id: string): Promise<RoleOrmEntity> {
    const role = await this.roleRepo.findOne({
      where: { rolId: id },
      relations: { permisos: true, menus: true, usuarios: true },
    });
    if (!role) {
      throw new NotFoundException(`Rol con ID "${id}" no encontrado.`);
    }
    return role;
  }

  async create(dto: CreateRoleDto): Promise<RoleOrmEntity> {
    const existing = await this.roleRepo.findOne({ where: { nombreRol: dto.nombreRol } });
    if (existing) {
      throw new ConflictException(`El rol con nombre "${dto.nombreRol}" ya existe.`);
    }

    let permissions: PermissionOrmEntity[] = [];
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      permissions = await this.permissionRepo.findBy({
        permisoId: In(dto.permissionIds),
      });
    }

    let menus: MenuOrmEntity[] = [];
    if (dto.menuIds && dto.menuIds.length > 0) {
      menus = await this.menuRepo.findBy({
        id: In(dto.menuIds),
      });
    }

    const newRole = this.roleRepo.create({
      nombreRol: dto.nombreRol,
      descripcion: dto.descripcion ?? null,
      permisos: permissions,
      menus: menus,
    });

    return this.roleRepo.save(newRole);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleOrmEntity> {
    const role = await this.findOne(id);

    if (dto.nombreRol && dto.nombreRol !== role.nombreRol) {
      if (role.nombreRol === 'Super Administrador') {
        throw new BadRequestException('El nombre del rol "Super Administrador" es reservado y no puede modificarse.');
      }
      const duplicate = await this.roleRepo.findOne({ where: { nombreRol: dto.nombreRol } });
      if (duplicate) {
        throw new ConflictException(`Ya existe otro rol con el nombre "${dto.nombreRol}".`);
      }
      role.nombreRol = dto.nombreRol;
    }

    if (dto.descripcion !== undefined) {
      role.descripcion = dto.descripcion;
    }

    if (dto.permissionIds !== undefined) {
      role.permisos = dto.permissionIds.length > 0
        ? await this.permissionRepo.findBy({ permisoId: In(dto.permissionIds) })
        : [];
    }

    if (dto.menuIds !== undefined) {
      role.menus = dto.menuIds.length > 0
        ? await this.menuRepo.findBy({ id: In(dto.menuIds) })
        : [];
    }

    return this.roleRepo.save(role);
  }

  async assignPermissions(id: string, permissionIds: string[]): Promise<RoleOrmEntity> {
    const role = await this.findOne(id);
    role.permisos = permissionIds.length > 0
      ? await this.permissionRepo.findBy({ permisoId: In(permissionIds) })
      : [];
    return this.roleRepo.save(role);
  }

  async assignMenus(id: string, menuIds: string[]): Promise<RoleOrmEntity> {
    const role = await this.findOne(id);
    role.menus = menuIds.length > 0
      ? await this.menuRepo.findBy({ id: In(menuIds) })
      : [];
    return this.roleRepo.save(role);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const role = await this.findOne(id);

    if (role.nombreRol === 'Super Administrador') {
      throw new BadRequestException('No se permite eliminar el rol "Super Administrador" del sistema.');
    }

    if (role.usuarios && role.usuarios.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rol "${role.nombreRol}" porque tiene ${role.usuarios.length} usuarios vinculados. Reasigna los usuarios a otro rol primero.`,
      );
    }

    await this.roleRepo.remove(role);
    return { success: true, message: `Rol "${role.nombreRol}" eliminado exitosamente.` };
  }
}
