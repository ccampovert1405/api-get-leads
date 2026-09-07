import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoleOrmEntity } from '../../../../roles/entities/role.orm-entity';

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  username: string;

  @Column({ name: 'password_hash', length: 100 })
  passwordHash: string;

  @Column({ length: 50, default: 'Analista' })
  role: string;

  @ManyToOne(() => RoleOrmEntity, (role) => role.usuarios, { eager: true, nullable: true })
  @JoinColumn({ name: 'role_id' })
  rol?: RoleOrmEntity | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
