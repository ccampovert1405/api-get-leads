import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ProvinciaOrmEntity } from './provincia.orm-entity';

@Entity('tbl_canton')
export class CantonOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  canton: string;

  @Index('IDX_TBL_CANTON_ID_PROVINCIA')
  @Column({ name: 'id_provincia', type: 'bigint' })
  idProvincia: number;

  @ManyToOne(() => ProvinciaOrmEntity, (provincia) => provincia.cantones)
  @JoinColumn({ name: 'id_provincia' })
  provincia: ProvinciaOrmEntity;
}
