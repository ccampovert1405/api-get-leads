import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '../auth/infrastructure/persistence/entities/user.orm-entity';
import { RoleOrmEntity } from '../roles/entities/role.orm-entity';
import { UsersService } from './application/services/users.service';
import { UsersController } from './infrastructure/controllers/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity, RoleOrmEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
