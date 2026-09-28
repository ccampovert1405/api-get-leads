import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProvinciaOrmEntity } from '../../../../geo/entities/provincia.orm-entity';
import { CantonOrmEntity } from '../../../../geo/entities/canton.orm-entity';
import { DependenciaOrmEntity } from '../../../../dependencias/infrastructure/persistence/entities/dependencia.orm-entity';

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

  @Index('IDX_LEADS_CEDULA')
  @Column({ type: 'varchar', length: 20, nullable: true })
  cedula: string | null;

  @Column({ name: 'submission_count', type: 'int', default: 1 })
  submissionCount: number;

  @Column({ name: 'ciudad_declarada', type: 'varchar', length: 150, nullable: true })
  ciudadDeclarada: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'contact_preference', type: 'varchar', length: 50, nullable: true })
  contactPreference: string | null;

  @Index('IDX_LEADS_ID_CANTON')
  @Column({ name: 'id_canton', type: 'bigint', nullable: true })
  idCanton: number | null;

  @ManyToOne(() => CantonOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_canton' })
  canton: CantonOrmEntity | null;

  @Index('IDX_LEADS_ID_PROVINCIA')
  @Column({ name: 'id_provincia', type: 'bigint', nullable: true })
  idProvincia: number | null;

  @ManyToOne(() => ProvinciaOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_provincia' })
  provincia: ProvinciaOrmEntity | null;

  @Index('IDX_LEADS_ID_DEPENDENCIA')
  @Column({ name: 'id_dependencia', type: 'uuid', nullable: true })
  idDependencia: string | null;

  @ManyToOne(() => DependenciaOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_dependencia' })
  dependencia: DependenciaOrmEntity | null;

  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload: Record<string, any>;

  @Index('IDX_LEADS_RECEIVED_AT')
  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ name: 'last_submission_at', type: 'timestamptz', nullable: true })
  lastSubmissionAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
