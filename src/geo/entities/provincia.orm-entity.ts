import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { CantonOrmEntity } from './canton.orm-entity';

@Entity('tbl_provincia')
export class ProvinciaOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  provincia: string;

  @OneToMany(() => CantonOrmEntity, (canton) => canton.provincia)
  cantones: CantonOrmEntity[];
}
