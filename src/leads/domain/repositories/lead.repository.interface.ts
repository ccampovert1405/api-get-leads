import { Lead, LeadSource } from '../entities/lead.entity';

export interface LeadListFilters {
  source?: LeadSource;
  campaignId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface ILeadRepository {
  save(lead: Lead): Promise<void>;
  saveMany(leads: Lead[]): Promise<{ inserted: number; skipped: number }>;
  findBySourceLeadId(source: LeadSource, sourceLeadId: string): Promise<Lead | null>;
  findAll(filters: LeadListFilters): Promise<{ items: Lead[]; total: number }>;
}

export const LEAD_REPOSITORY = Symbol('ILeadRepository');
