import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTikTokCampaignsTable1770000000003 implements MigrationInterface {
  name = 'CreateTikTokCampaignsTable1770000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tiktok_campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'tiktok_campaign_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'advertiser_id',
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
            name: 'budget',
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
      'tiktok_campaigns',
      new TableIndex({
        name: 'IDX_TIKTOK_CAMPAIGNS_TIKTOK_CAMPAIGN_ID',
        columnNames: ['tiktok_campaign_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tiktok_campaigns');
  }
}
