import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('leads')
@Unique('UQ_LEADS_SOURCE_SOURCE_LEAD_ID', ['source', 'sourceLeadId'])
@Index('IDX_LEADS_SOURCE_RECEIVED_AT', ['source', 'receivedAt'])
export class LeadOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  source: string;

  @Column({ name: 'source_lead_id' })
  sourceLeadId: string;

  @Index()
  @Column({ name: 'source_campaign_id', type: 'varchar', nullable: true })
  sourceCampaignId: string | null;

  @Column({ name: 'form_name', type: 'varchar', nullable: true })
  formName: string | null;

  @Column({ name: 'full_name', type: 'varchar', nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload: Record<string, any>;

  @Index('IDX_LEADS_RECEIVED_AT')
  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
