import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SyncExecutionLogOrmEntity } from './sync-execution-log.orm-entity';

@Entity('sync_schedules')
export class SyncScheduleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'days_of_week', type: 'jsonb', default: [1, 2, 3, 4, 5] })
  daysOfWeek: number[]; // 0=Domingo, 1=Lunes, ..., 6=Sábado (o 7=Domingo)

  @Column({ name: 'hour', type: 'smallint', default: 8 })
  hour: number; // 0-23

  @Column({ name: 'minute', type: 'smallint', default: 0 })
  minute: number; // 0-59

  @Column({ name: 'timezone', type: 'varchar', length: 50, default: 'America/Guayaquil' })
  timezone: string;

  @Column({ name: 'sync_meta', type: 'boolean', default: true })
  syncMeta: boolean;

  @Column({ name: 'sync_tiktok', type: 'boolean', default: true })
  syncTikTok: boolean;

  @Column({ name: 'sync_leads', type: 'boolean', default: true })
  syncLeads: boolean;

  @Column({ name: 'last_run_at', type: 'timestamp with time zone', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'last_run_status', type: 'varchar', length: 30, nullable: true })
  lastRunStatus: string | null;

  @Column({ name: 'last_run_message', type: 'text', nullable: true })
  lastRunMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => SyncExecutionLogOrmEntity, (log) => log.schedule)
  logs: SyncExecutionLogOrmEntity[];
}
