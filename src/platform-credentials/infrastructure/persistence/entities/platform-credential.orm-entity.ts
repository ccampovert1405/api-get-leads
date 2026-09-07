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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
