import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDependenciaRepository,
  DEPENDENCIA_REPOSITORY,
} from '../../domain/repositories/dependencia.repository.interface';
import { DependenciaOrmEntity } from '../../infrastructure/persistence/entities/dependencia.orm-entity';

@Injectable()
export class GetDependenciaByIdUseCase {
  constructor(
    @Inject(DEPENDENCIA_REPOSITORY)
    private readonly repo: IDependenciaRepository,
  ) {}

  async execute(id: string): Promise<DependenciaOrmEntity> {
    const found = await this.repo.findById(id);
    if (!found) {
      throw new NotFoundException(`Dependencia con ID ${id} no encontrada.`);
    }
    return found;
  }
}
