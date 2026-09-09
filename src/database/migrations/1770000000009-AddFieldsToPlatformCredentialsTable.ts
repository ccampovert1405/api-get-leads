import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFieldsToPlatformCredentialsTable1770000000009 implements MigrationInterface {
  name = 'AddFieldsToPlatformCredentialsTable1770000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('platform_credentials', [
      new TableColumn({
        name: 'app_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'app_secret',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'account_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'api_url',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('platform_credentials', 'is_active');
    await queryRunner.dropColumn('platform_credentials', 'api_url');
    await queryRunner.dropColumn('platform_credentials', 'account_id');
    await queryRunner.dropColumn('platform_credentials', 'app_secret');
    await queryRunner.dropColumn('platform_credentials', 'app_id');
  }
}
