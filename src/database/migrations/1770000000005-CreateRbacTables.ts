import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateRbacTables1770000000005 implements MigrationInterface {
  name = 'CreateRbacTables1770000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla roles
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'rol_id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'nombre_rol',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'descripcion',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 2. Tabla permissions (Catálogo único)
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'permiso_id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'nombre_accion',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'identificador_accion',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_PERMISSIONS_IDENTIFICADOR',
        columnNames: ['identificador_accion'],
        isUnique: true,
      }),
    );

    // 3. Tabla intermedia role_permissions
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'role_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'permission_id',
            type: 'uuid',
            isPrimary: true,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['rol_id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['permission_id'],
            referencedTableName: 'permissions',
            referencedColumnNames: ['permiso_id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // 4. Agregar columna role_id a users
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("rol_id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_role_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role_id"`);
    await queryRunner.dropTable('role_permissions', true);
    await queryRunner.dropTable('permissions', true);
    await queryRunner.dropTable('roles', true);
  }
}
