import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserOrmEntity } from './entities/user.orm-entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    const found = await this.repo.findOne({
      where: { username },
      relations: { rol: { permisos: true } },
    });
    return found ? UserMapper.toDomain(found) : null;
  }

  async findById(id: string): Promise<User | null> {
    const found = await this.repo.findOne({
      where: { id },
      relations: { rol: { permisos: true } },
    });
    return found ? UserMapper.toDomain(found) : null;
  }

  async save(user: User): Promise<void> {
    await this.repo.upsert(UserMapper.toOrm(user), ['username']);
  }
}
