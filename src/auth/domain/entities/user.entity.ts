export enum UserRole {
  SUPER_ADMIN = 'Super Administrador',
  ADMIN = 'Administrador',
  ANALYST = 'Analista',
}

/**
 * Entidad de dominio pura. No conoce TypeORM, bcrypt ni JWT.
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly passwordHash: string,
    public readonly role: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly permissions: string[] = [],
  ) {}

  canAuthenticate(): boolean {
    return this.isActive;
  }
}
