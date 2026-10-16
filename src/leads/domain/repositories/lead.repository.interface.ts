import { Lead, LeadSource } from '../entities/lead.entity';

export interface LeadListFilters {
  source?: LeadSource;
  campaignId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
  provinciaId?: number;
  dependenciaId?: string;
  search?: string;
}

export interface SaveManyResult {
  inserted: number;
  skipped: number;
  updated: number;
  savedIds: string[];
  insertedIds: string[];
  updatedIds: string[];
  skippedIds: string[];
}

export interface ILeadRepository {
  save(lead: Lead): Promise<void>;
  saveMany(leads: Lead[]): Promise<SaveManyResult>;
  findBySourceLeadId(source: LeadSource, sourceLeadId: string): Promise<Lead | null>;
  findByCedula(cedula: string): Promise<Lead | null>;
  findByIds(ids: string[]): Promise<Lead[]>;
  findAll(filters: LeadListFilters): Promise<{ items: Lead[]; total: number }>;
  markWebhookDispatched(params: {
    leadIds: string[];
    status: 'SENT' | 'FAILED';
    webhookLogId?: string;
    error?: string | null;
    payloadsByLeadId?: Record<string, Record<string, any>>;
  }): Promise<void>;
  getWebhookStatusSummary(): Promise<{
    totalLeads: number;
    webhookSent: number;
    webhookPending: number;
    webhookFailed: number;
  }>;
}

export const LEAD_REPOSITORY = Symbol('ILeadRepository');

