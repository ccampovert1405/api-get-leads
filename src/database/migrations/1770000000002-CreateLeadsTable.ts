import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateLeadsTable1770000000002 implements MigrationInterface {
  name = 'CreateLeadsTable1770000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'leads',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'source',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'source_lead_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'source_campaign_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'form_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'full_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'raw_payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'received_at',
            type: 'timestamptz',
            isNullable: false,
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

    await queryRunner.createUniqueConstraint(
      'leads',
      new TableUnique({
        name: 'UQ_LEADS_SOURCE_SOURCE_LEAD_ID',
        columnNames: ['source', 'source_lead_id'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({ name: 'IDX_LEADS_SOURCE', columnNames: ['source'] }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({ name: 'IDX_LEADS_SOURCE_CAMPAIGN_ID', columnNames: ['source_campaign_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('leads');
  }
}
