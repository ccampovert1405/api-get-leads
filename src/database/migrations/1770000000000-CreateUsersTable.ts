import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1770000000000 implements MigrationInterface {
  name = 'CreateUsersTable1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            default: `'ANALYST'`,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_USERNAME',
        columnNames: ['username'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
