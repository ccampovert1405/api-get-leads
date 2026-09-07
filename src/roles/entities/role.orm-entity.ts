import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { PermissionOrmEntity } from '../../permissions/entities/permission.orm-entity';
import { UserOrmEntity } from '../../auth/infrastructure/persistence/entities/user.orm-entity';
import { MenuOrmEntity } from '../../menus/entities/menu.orm-entity';

@Entity('roles')
export class RoleOrmEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'rol_id' })
  rolId: string;

  @Column({ name: 'nombre_rol', unique: true, length: 100 })
  nombreRol: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @ManyToMany(() => PermissionOrmEntity, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'rolId' },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'permisoId',
    },
  })
  permisos: PermissionOrmEntity[];

  @ManyToMany(() => MenuOrmEntity, (menu) => menu.roles)
  @JoinTable({
    name: 'role_menus',
    joinColumn: { name: 'role_id', referencedColumnName: 'rolId' },
    inverseJoinColumn: { name: 'menu_id', referencedColumnName: 'id' },
  })
  menus: MenuOrmEntity[];

  @OneToMany(() => UserOrmEntity, (user) => user.rol)
  usuarios: UserOrmEntity[];
}

