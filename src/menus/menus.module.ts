import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuOrmEntity } from './entities/menu.orm-entity';
import { RoleOrmEntity } from '../roles/entities/role.orm-entity';
import { MenusService } from './application/services/menus.service';
import { MenusController } from './infrastructure/controllers/menus.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MenuOrmEntity, RoleOrmEntity])],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService, TypeOrmModule],
})
export class MenusModule {}
