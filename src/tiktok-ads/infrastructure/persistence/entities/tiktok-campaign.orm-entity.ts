import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('tiktok_campaigns')
export class TikTokCampaignOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'tiktok_campaign_id' })
  tiktokCampaignId: string;

  @Column({ name: 'advertiser_id' })
  advertiserId: string;

  @Column()
  name: string;

  @Column()
  status: string;

  @Column()
  objective: string;

  @Column({ type: 'decimal', nullable: true })
  budget: number | null;

  @Column({ type: 'jsonb', nullable: true })
  insights: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
