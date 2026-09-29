import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type WebhookDeliveryFormat = 'INDIVIDUAL' | 'BATCH' | 'ENVELOPE';

@Entity('webhook_configs')
export class WebhookConfigOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'url', type: 'varchar', length: 500, nullable: true })
  url: string | null;

  @Column({ name: 'secret', type: 'text', nullable: true })
  secret: string | null;

  @Column({ name: 'auth_token', type: 'text', nullable: true })
  authToken: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({
    name: 'delivery_format',
    type: 'varchar',
    length: 20,
    default: 'INDIVIDUAL',
  })
  deliveryFormat: WebhookDeliveryFormat;

  @Column({
    name: 'trigger_only_when_leads_found',
    type: 'boolean',
    default: true,
  })
  triggerOnlyWhenLeadsFound: boolean;

  @Column({ name: 'retry_attempts', type: 'integer', default: 3 })
  retryAttempts: number;

  @Column({ name: 'timeout_ms', type: 'integer', default: 10000 })
  timeoutMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
