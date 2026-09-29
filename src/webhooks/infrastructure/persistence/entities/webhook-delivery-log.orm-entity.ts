import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SyncExecutionLogOrmEntity } from '../../../../sync-schedules/infrastructure/persistence/entities/sync-execution-log.orm-entity';

@Entity('webhook_delivery_logs')
export class WebhookDeliveryLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sync_log_id', type: 'uuid', nullable: true })
  syncLogId: string | null;

  @ManyToOne(() => SyncExecutionLogOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sync_log_id' })
  syncLog: SyncExecutionLogOrmEntity | null;

  @Column({ name: 'url', type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'delivery_format', type: 'varchar', length: 20 })
  deliveryFormat: string;

  @Column({ name: 'leads_count', type: 'integer', default: 0 })
  leadsCount: number;

  @Column({ name: 'http_status', type: 'integer', nullable: true })
  httpStatus: number | null;

  @Column({ name: 'duration_ms', type: 'integer', default: 0 })
  durationMs: number;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: 'SUCCESS' | 'FAILED';

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload: Record<string, any> | Array<any> | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'attempts', type: 'integer', default: 1 })
  attempts: number;

  @Index('IDX_webhook_delivery_logs_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
