import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDependenciaRepository,
  DEPENDENCIA_REPOSITORY,
} from '../../domain/repositories/dependencia.repository.interface';
import { UpdateDependenciaDto } from '../dtos/dependencia.dto';
import { DependenciaOrmEntity } from '../../infrastructure/persistence/entities/dependencia.orm-entity';

@Injectable()
export class UpdateDependenciaUseCase {
  constructor(
    @Inject(DEPENDENCIA_REPOSITORY)
    private readonly repo: IDependenciaRepository,
  ) {}

  async execute(id: string, dto: UpdateDependenciaDto): Promise<DependenciaOrmEntity> {
    const updated = await this.repo.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`Dependencia con ID ${id} no encontrada.`);
    }
    return updated;
  }
}
