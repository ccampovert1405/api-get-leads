import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvinciaOrmEntity } from './entities/provincia.orm-entity';
import { CantonOrmEntity } from './entities/canton.orm-entity';
import { GeoResolverService } from './services/geo-resolver.service';
import { GeoController } from './controllers/geo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProvinciaOrmEntity, CantonOrmEntity])],
  controllers: [GeoController],
  providers: [GeoResolverService],
  exports: [GeoResolverService, TypeOrmModule],
})
export class GeoModule {}
