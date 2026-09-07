import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadOrmEntity } from './infrastructure/persistence/entities/lead.orm-entity';
import { TypeOrmLeadRepository } from './infrastructure/persistence/typeorm-lead.repository';
import { LeadsController } from './infrastructure/controllers/leads.controller';
import { LEAD_REPOSITORY } from './domain/repositories/lead.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([LeadOrmEntity])],
  controllers: [LeadsController],
  providers: [{ provide: LEAD_REPOSITORY, useClass: TypeOrmLeadRepository }],
  exports: [LEAD_REPOSITORY],
})
export class LeadsModule {}
