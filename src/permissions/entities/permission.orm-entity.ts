import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToMany } from 'typeorm';
import { RoleOrmEntity } from '../../roles/entities/role.orm-entity';

@Entity('permissions')
export class PermissionOrmEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'permiso_id' })
  permisoId: string;

  @Column({ name: 'nombre_accion', length: 150 })
  nombreAccion: string;

  @Index({ unique: true })
  @Column({ name: 'identificador_accion', length: 100 })
  identificadorAccion: string;

  @ManyToMany(() => RoleOrmEntity, (role) => role.permisos)
  roles: RoleOrmEntity[];
}
