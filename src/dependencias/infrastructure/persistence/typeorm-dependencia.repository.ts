import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IDependenciaRepository } from '../../domain/repositories/dependencia.repository.interface';
import { DependenciaOrmEntity, DependenciaEstado } from './entities/dependencia.orm-entity';

@Injectable()
export class TypeOrmDependenciaRepository implements IDependenciaRepository {
  constructor(
    @InjectRepository(DependenciaOrmEntity)
    private readonly repo: Repository<DependenciaOrmEntity>,
  ) {}

  async create(data: Partial<DependenciaOrmEntity>): Promise<DependenciaOrmEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<DependenciaOrmEntity>): Promise<DependenciaOrmEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async findById(id: string): Promise<DependenciaOrmEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['provincia', 'canton'],
    });
  }

  async findByProvincia(idProvincia: number): Promise<DependenciaOrmEntity[]> {
    return this.repo.find({
      where: { idProvincia, estado: DependenciaEstado.ACTIVO },
      relations: ['provincia', 'canton'],
      order: { nombre: 'ASC' },
    });
  }

  async findAll(filters?: { search?: string; idProvincia?: number; estado?: string }): Promise<DependenciaOrmEntity[]> {
    const qb = this.repo.createQueryBuilder('dep')
      .leftJoinAndSelect('dep.provincia', 'provincia')
      .leftJoinAndSelect('dep.canton', 'canton');

    if (filters?.idProvincia) {
      qb.andWhere('dep.idProvincia = :idProvincia', { idProvincia: filters.idProvincia });
    }

    if (filters?.estado) {
      qb.andWhere('dep.estado = :estado', { estado: filters.estado });
    }

    if (filters?.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(dep.nombre) LIKE :term OR LOWER(dep.codigo) LIKE :term OR LOWER(dep.direccion) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('dep.createdAt', 'DESC');
    return qb.getMany();
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repo.delete(id);
    return (res.affected ?? 0) > 0;
  }
}
