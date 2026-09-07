import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionOrmEntity } from './entities/permission.orm-entity';
import { RoleOrmEntity } from '../roles/entities/role.orm-entity';
import { PermissionsScannerService } from './services/permissions-scanner.service';
import { PermissionsService } from './application/services/permissions.service';
import { PermissionsController } from './infrastructure/controllers/permissions.controller';

@Module({
  imports: [
    DiscoveryModule,
    TypeOrmModule.forFeature([PermissionOrmEntity, RoleOrmEntity]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsScannerService, PermissionsService],
  exports: [TypeOrmModule, PermissionsScannerService, PermissionsService],
})
export class PermissionsModule {}
