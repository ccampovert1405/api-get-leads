import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProvinciaOrmEntity } from '../../../../geo/entities/provincia.orm-entity';
import { CantonOrmEntity } from '../../../../geo/entities/canton.orm-entity';

export enum DependenciaEstado {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

@Entity('tbl_dependencia')
export class DependenciaOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Index('IDX_TBL_DEPENDENCIA_CODIGO', { unique: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo: string | null;

  @Index('IDX_TBL_DEPENDENCIA_ID_PROVINCIA')
  @Column({ name: 'id_provincia', type: 'bigint' })
  idProvincia: number;

  @ManyToOne(() => ProvinciaOrmEntity, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'id_provincia' })
  provincia: ProvinciaOrmEntity;

  @Index('IDX_TBL_DEPENDENCIA_ID_CANTON')
  @Column({ name: 'id_canton', type: 'bigint', nullable: true })
  idCanton: number | null;

  @ManyToOne(() => CantonOrmEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'id_canton' })
  canton: CantonOrmEntity | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  correo: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: DependenciaEstado.ACTIVO,
  })
  estado: DependenciaEstado;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
