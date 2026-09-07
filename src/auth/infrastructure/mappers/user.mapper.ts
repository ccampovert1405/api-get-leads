import { User } from '../../domain/entities/user.entity';
import { UserOrmEntity } from '../persistence/entities/user.orm-entity';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    const roleName = orm.rol?.nombreRol || orm.role || 'Analista';
    const permissions = orm.rol?.permisos?.map((p) => p.identificadorAccion) || [];

    return new User(
      orm.id,
      orm.username,
      orm.passwordHash,
      roleName,
      orm.isActive,
      orm.createdAt,
      permissions,
    );
  }

  static toOrm(domain: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = domain.id;
    orm.username = domain.username;
    orm.passwordHash = domain.passwordHash;
    orm.role = domain.role;
    orm.isActive = domain.isActive;
    return orm;
  }
}
