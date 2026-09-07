import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleOrmEntity } from './entities/role.orm-entity';
import { PermissionOrmEntity } from '../permissions/entities/permission.orm-entity';
import { MenuOrmEntity } from '../menus/entities/menu.orm-entity';
import { RolesService } from './application/services/roles.service';
import { RolesController } from './infrastructure/controllers/roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoleOrmEntity, PermissionOrmEntity, MenuOrmEntity])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
