import { Injectable, Inject, ConflictException } from '@nestjs/common';
import {
  IDependenciaRepository,
  DEPENDENCIA_REPOSITORY,
} from '../../domain/repositories/dependencia.repository.interface';
import { CreateDependenciaDto } from '../dtos/dependencia.dto';
import { DependenciaOrmEntity } from '../../infrastructure/persistence/entities/dependencia.orm-entity';

@Injectable()
export class CreateDependenciaUseCase {
  constructor(
    @Inject(DEPENDENCIA_REPOSITORY)
    private readonly repo: IDependenciaRepository,
  ) {}

  async execute(dto: CreateDependenciaDto): Promise<DependenciaOrmEntity> {
    return this.repo.create(dto);
  }
}
