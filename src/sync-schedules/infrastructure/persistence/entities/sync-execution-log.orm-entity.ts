import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SyncScheduleOrmEntity } from './sync-schedule.orm-entity';

@Entity('sync_execution_logs')
export class SyncExecutionLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  scheduleId: string | null;

  @ManyToOne(() => SyncScheduleOrmEntity, (schedule) => schedule.logs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: SyncScheduleOrmEntity | null;

  @Column({ name: 'trigger_type', type: 'varchar', length: 20 })
  triggerType: 'CRON' | 'MANUAL';

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';

  @Index()
  @CreateDateColumn({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamp with time zone', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'meta_campaigns_synced', type: 'integer', default: 0 })
  metaCampaignsSynced: number;

  @Column({ name: 'meta_leads_synced', type: 'integer', default: 0 })
  metaLeadsSynced: number;

  @Column({ name: 'tiktok_campaigns_synced', type: 'integer', default: 0 })
  tiktokCampaignsSynced: number;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;
}
