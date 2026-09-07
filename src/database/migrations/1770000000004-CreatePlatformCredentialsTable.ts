import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePlatformCredentialsTable1770000000004 implements MigrationInterface {
  name = 'CreatePlatformCredentialsTable1770000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_credentials',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'platform',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'access_token',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'last_renewed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'last_renewal_status',
            type: 'varchar',
            length: '20',
            default: `'NEVER_RENEWED'`,
          },
          {
            name: 'last_renewal_error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'platform_credentials',
      new TableIndex({
        name: 'IDX_PLATFORM_CREDENTIALS_PLATFORM',
        columnNames: ['platform'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('platform_credentials');
  }
}
