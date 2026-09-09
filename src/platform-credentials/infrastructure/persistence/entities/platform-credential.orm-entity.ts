import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('platform_credentials')
export class PlatformCredentialOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  platform: string;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_renewed_at', type: 'timestamptz', nullable: true })
  lastRenewedAt: Date | null;

  @Column({ name: 'last_renewal_status', length: 20, default: 'NEVER_RENEWED' })
  lastRenewalStatus: string;

  @Column({ name: 'last_renewal_error', type: 'text', nullable: true })
  lastRenewalError: string | null;

  @Column({ name: 'app_id', type: 'varchar', length: 100, nullable: true })
  appId: string | null;

  @Column({ name: 'app_secret', type: 'text', nullable: true })
  appSecret: string | null;

  @Column({ name: 'account_id', type: 'varchar', length: 100, nullable: true })
  accountId: string | null;

  @Column({ name: 'api_url', type: 'varchar', length: 255, nullable: true })
  apiUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
