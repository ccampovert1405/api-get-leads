import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('campaigns')
export class CampaignOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'meta_campaign_id' })
  metaCampaignId: string;

  @Column()
  name: string;

  @Column()
  status: string;

  @Column()
  objective: string;

  @Column({ name: 'daily_budget', type: 'decimal', nullable: true })
  dailyBudget: number | null;

  @Column({ type: 'jsonb', nullable: true })
  insights: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
