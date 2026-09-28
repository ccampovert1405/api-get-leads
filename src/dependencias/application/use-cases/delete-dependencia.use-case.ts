import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDependenciaRepository,
  DEPENDENCIA_REPOSITORY,
} from '../../domain/repositories/dependencia.repository.interface';

@Injectable()
export class DeleteDependenciaUseCase {
  constructor(
    @Inject(DEPENDENCIA_REPOSITORY)
    private readonly repo: IDependenciaRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Dependencia con ID ${id} no encontrada.`);
    }
    return true;
  }
}
