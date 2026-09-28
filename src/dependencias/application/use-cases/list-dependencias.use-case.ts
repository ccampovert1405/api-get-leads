import { Injectable, Inject } from '@nestjs/common';
import {
  IDependenciaRepository,
  DEPENDENCIA_REPOSITORY,
} from '../../domain/repositories/dependencia.repository.interface';
import { ListDependenciasQueryDto } from '../dtos/dependencia.dto';
import { DependenciaOrmEntity } from '../../infrastructure/persistence/entities/dependencia.orm-entity';

@Injectable()
export class ListDependenciasUseCase {
  constructor(
    @Inject(DEPENDENCIA_REPOSITORY)
    private readonly repo: IDependenciaRepository,
  ) {}

  async execute(query?: ListDependenciasQueryDto): Promise<DependenciaOrmEntity[]> {
    return this.repo.findAll({
      search: query?.search,
      idProvincia: query?.idProvincia ? Number(query.idProvincia) : undefined,
      estado: query?.estado,
    });
  }
}
