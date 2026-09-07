import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { RoleOrmEntity } from '../../roles/entities/role.orm-entity';

export enum MenuTipo {
  PRINCIPAL = 'Principal',
  OPERACIONES = 'Operaciones',
  ADMINISTRACION = 'Administracion',
  PLATAFORMA = 'Plataforma',
}

@Entity('menus')
export class MenuOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  label: string;

  @Column({ length: 150 })
  ruta: string;

  @Column({ length: 100, nullable: true })
  icono: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ length: 50, default: 'Principal' })
  tipo: string;

  @ManyToMany(() => RoleOrmEntity, (role) => role.menus)
  roles: RoleOrmEntity[];
}
