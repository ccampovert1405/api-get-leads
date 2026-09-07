import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddLeadsReceivedAtIndex1770000000006 implements MigrationInterface {
  name = 'AddLeadsReceivedAtIndex1770000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_LEADS_RECEIVED_AT',
        columnNames: ['received_at'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_LEADS_SOURCE_RECEIVED_AT',
        columnNames: ['source', 'received_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('leads', 'IDX_LEADS_SOURCE_RECEIVED_AT');
    await queryRunner.dropIndex('leads', 'IDX_LEADS_RECEIVED_AT');
  }
}
