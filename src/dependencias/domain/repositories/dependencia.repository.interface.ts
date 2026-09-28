import { DependenciaOrmEntity } from '../../infrastructure/persistence/entities/dependencia.orm-entity';

export const DEPENDENCIA_REPOSITORY = 'DEPENDENCIA_REPOSITORY';

export interface IDependenciaRepository {
  create(data: Partial<DependenciaOrmEntity>): Promise<DependenciaOrmEntity>;
  update(id: string, data: Partial<DependenciaOrmEntity>): Promise<DependenciaOrmEntity | null>;
  findById(id: string): Promise<DependenciaOrmEntity | null>;
  findByProvincia(idProvincia: number): Promise<DependenciaOrmEntity[]>;
  findAll(filters?: { search?: string; idProvincia?: number; estado?: string }): Promise<DependenciaOrmEntity[]>;
  delete(id: string): Promise<boolean>;
}
