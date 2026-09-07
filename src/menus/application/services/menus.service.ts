import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuOrmEntity } from '../../entities/menu.orm-entity';
import { RoleOrmEntity } from '../../../roles/entities/role.orm-entity';
import { CreateMenuDto } from '../dtos/create-menu.dto';
import { UpdateMenuDto } from '../dtos/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(MenuOrmEntity)
    private readonly menuRepo: Repository<MenuOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepo: Repository<RoleOrmEntity>,
  ) {}

  async findAll(): Promise<MenuOrmEntity[]> {
    return this.menuRepo.find({
      order: { orden: 'ASC', label: 'ASC' },
    });
  }

  async findMyMenus(user: { role?: string; sub?: string }): Promise<MenuOrmEntity[]> {
    const roleName = user?.role || '';
    const isSuperOrAdmin =
      roleName === 'Super Administrador' ||
      roleName === 'Administrador' ||
      roleName.toLowerCase().includes('admin');

    if (isSuperOrAdmin) {
      return this.findAll();
    }

    const role = await this.roleRepo.findOne({
      where: { nombreRol: roleName },
      relations: { menus: true },
    });

    if (!role || !role.menus) {
      return [];
    }

    return role.menus.sort((a, b) => a.orden - b.orden);
  }

  async findOne(id: string): Promise<MenuOrmEntity> {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Menú con ID "${id}" no encontrado.`);
    }
    return menu;
  }

  async create(dto: CreateMenuDto): Promise<MenuOrmEntity> {
    const menu = this.menuRepo.create({
      label: dto.label,
      ruta: dto.ruta,
      icono: dto.icono ?? 'circle',
      orden: dto.orden ?? 0,
      tipo: dto.tipo ?? 'Principal',
    });
    return this.menuRepo.save(menu);
  }

  async update(id: string, dto: UpdateMenuDto): Promise<MenuOrmEntity> {
    const menu = await this.findOne(id);
    if (dto.label !== undefined) menu.label = dto.label;
    if (dto.ruta !== undefined) menu.ruta = dto.ruta;
    if (dto.icono !== undefined) menu.icono = dto.icono;
    if (dto.orden !== undefined) menu.orden = dto.orden;
    if (dto.tipo !== undefined) menu.tipo = dto.tipo;
    return this.menuRepo.save(menu);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const menu = await this.findOne(id);
    await this.menuRepo.remove(menu);
    return { success: true, message: `Menú "${menu.label}" eliminado exitosamente.` };
  }
}
