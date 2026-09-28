import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DependenciaOrmEntity } from './infrastructure/persistence/entities/dependencia.orm-entity';
import { TypeOrmDependenciaRepository } from './infrastructure/persistence/typeorm-dependencia.repository';
import { DEPENDENCIA_REPOSITORY } from './domain/repositories/dependencia.repository.interface';
import { CreateDependenciaUseCase } from './application/use-cases/create-dependencia.use-case';
import { UpdateDependenciaUseCase } from './application/use-cases/update-dependencia.use-case';
import { ListDependenciasUseCase } from './application/use-cases/list-dependencias.use-case';
import { GetDependenciaByIdUseCase } from './application/use-cases/get-dependencia-by-id.use-case';
import { DeleteDependenciaUseCase } from './application/use-cases/delete-dependencia.use-case';
import { DependenciasController } from './infrastructure/controllers/dependencias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DependenciaOrmEntity])],
  controllers: [DependenciasController],
  providers: [
    {
      provide: DEPENDENCIA_REPOSITORY,
      useClass: TypeOrmDependenciaRepository,
    },
    CreateDependenciaUseCase,
    UpdateDependenciaUseCase,
    ListDependenciasUseCase,
    GetDependenciaByIdUseCase,
    DeleteDependenciaUseCase,
  ],
  exports: [DEPENDENCIA_REPOSITORY, TypeOrmModule],
})
export class DependenciasModule {}
