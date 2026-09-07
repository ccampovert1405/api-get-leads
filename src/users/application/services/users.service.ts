import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/entities/user.orm-entity';
import { RoleOrmEntity } from '../../../roles/entities/role.orm-entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepo: Repository<RoleOrmEntity>,
  ) {}

  private sanitizeUser(user: UserOrmEntity) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async findAll(): Promise<Omit<UserOrmEntity, 'passwordHash'>[]> {
    const users = await this.userRepo.find({
      relations: { rol: true },
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.sanitizeUser(u));
  }

  async findOne(id: string): Promise<Omit<UserOrmEntity, 'passwordHash'>> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { rol: true },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }
    return this.sanitizeUser(user);
  }

  async create(dto: CreateUserDto): Promise<Omit<UserOrmEntity, 'passwordHash'>> {
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException(`El nombre de usuario "${dto.username}" ya está registrado.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    let roleEntity: RoleOrmEntity | null = null;
    let roleName = dto.role ?? 'Analista';

    if (dto.roleId) {
      roleEntity = await this.roleRepo.findOne({ where: { rolId: dto.roleId } });
      if (roleEntity) {
        roleName = roleEntity.nombreRol;
      }
    } else if (dto.role) {
      roleEntity = await this.roleRepo.findOne({ where: { nombreRol: dto.role } });
    }

    const newUser = this.userRepo.create({
      username: dto.username,
      passwordHash,
      role: roleName,
      rol: roleEntity,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await this.userRepo.save(newUser);
    return this.sanitizeUser(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<Omit<UserOrmEntity, 'passwordHash'>> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { rol: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    if (dto.username && dto.username !== user.username) {
      const duplicate = await this.userRepo.findOne({ where: { username: dto.username } });
      if (duplicate) {
        throw new ConflictException(`El nombre de usuario "${dto.username}" ya está en uso.`);
      }
      user.username = dto.username;
    }

    if (dto.password && dto.password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (dto.roleId) {
      const roleEntity = await this.roleRepo.findOne({ where: { rolId: dto.roleId } });
      if (!roleEntity) {
        throw new NotFoundException(`Rol con ID "${dto.roleId}" no existe.`);
      }
      user.rol = roleEntity;
      user.role = roleEntity.nombreRol;
    } else if (dto.role) {
      const roleEntity = await this.roleRepo.findOne({ where: { nombreRol: dto.role } });
      if (roleEntity) {
        user.rol = roleEntity;
        user.role = roleEntity.nombreRol;
      } else {
        user.role = dto.role;
      }
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    const updated = await this.userRepo.save(user);
    return this.sanitizeUser(updated);
  }

  async remove(id: string, currentUserId?: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    if (currentUserId && user.id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta mientras estás en sesión activa.');
    }

    if (user.username === 'administrator') {
      throw new BadRequestException('No se permite eliminar la cuenta de administración principal del sistema.');
    }

    await this.userRepo.remove(user);
    return { success: true, message: `Usuario "${user.username}" eliminado con éxito.` };
  }
}
