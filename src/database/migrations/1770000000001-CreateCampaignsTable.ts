import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCampaignsTable1770000000001 implements MigrationInterface {
  name = 'CreateCampaignsTable1770000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'meta_campaign_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'objective',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'daily_budget',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'insights',
            type: 'jsonb',
            isNullable: true,
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
      'campaigns',
      new TableIndex({
        name: 'IDX_CAMPAIGNS_META_CAMPAIGN_ID',
        columnNames: ['meta_campaign_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('campaigns');
  }
}
