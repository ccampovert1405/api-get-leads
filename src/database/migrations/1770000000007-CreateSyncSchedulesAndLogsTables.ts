import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSyncSchedulesAndLogsTables1770000000007 implements MigrationInterface {
  name = 'CreateSyncSchedulesAndLogsTables1770000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla sync_schedules
    await queryRunner.createTable(
      new Table({
        name: 'sync_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_enabled',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'days_of_week',
            type: 'jsonb',
            default: "'[1, 2, 3, 4, 5]'",
            isNullable: false,
          },
          {
            name: 'hour',
            type: 'smallint',
            default: 8,
            isNullable: false,
          },
          {
            name: 'minute',
            type: 'smallint',
            default: 0,
            isNullable: false,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            default: "'America/Guayaquil'",
            isNullable: false,
          },
          {
            name: 'sync_meta',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'sync_tiktok',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'sync_leads',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'last_run_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'last_run_status',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'last_run_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 2. Tabla sync_execution_logs
    await queryRunner.createTable(
      new Table({
        name: 'sync_execution_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'schedule_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'trigger_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'finished_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'meta_campaigns_synced',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'meta_leads_synced',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'tiktok_campaigns_synced',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['schedule_id'],
            referencedTableName: 'sync_schedules',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sync_execution_logs',
      new TableIndex({
        name: 'IDX_SYNC_EXECUTION_LOGS_STARTED_AT',
        columnNames: ['started_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sync_execution_logs', true);
    await queryRunner.dropTable('sync_schedules', true);
  }
}
