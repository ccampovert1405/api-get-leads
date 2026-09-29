import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class CreateWebhookConfigsAndDeliveryLogs1770000000011 implements MigrationInterface {
  name = 'CreateWebhookConfigsAndDeliveryLogs1770000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla webhook_configs
    await queryRunner.createTable(
      new Table({
        name: 'webhook_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'secret',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'auth_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_enabled',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'delivery_format',
            type: 'varchar',
            length: '20',
            default: "'INDIVIDUAL'",
            isNullable: false,
          },
          {
            name: 'trigger_only_when_leads_found',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'retry_attempts',
            type: 'integer',
            default: 3,
            isNullable: false,
          },
          {
            name: 'timeout_ms',
            type: 'integer',
            default: 10000,
            isNullable: false,
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

    // 2. Crear tabla webhook_delivery_logs
    await queryRunner.createTable(
      new Table({
        name: 'webhook_delivery_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'sync_log_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'delivery_format',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'leads_count',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'http_status',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'duration_ms',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'request_payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'response_body',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attempts',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // FK de webhook_delivery_logs a sync_execution_logs
    await queryRunner.createForeignKey(
      'webhook_delivery_logs',
      new TableForeignKey({
        name: 'FK_webhook_delivery_logs_sync_log',
        columnNames: ['sync_log_id'],
        referencedTableName: 'sync_execution_logs',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Índice en webhook_delivery_logs por created_at
    await queryRunner.createIndex(
      'webhook_delivery_logs',
      new TableIndex({
        name: 'IDX_webhook_delivery_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    // 3. Agregar columna tiktok_leads_synced a sync_execution_logs si no existe
    const hasTiktokLeadsCol = await queryRunner.hasColumn('sync_execution_logs', 'tiktok_leads_synced');
    if (!hasTiktokLeadsCol) {
      await queryRunner.addColumn(
        'sync_execution_logs',
        new TableColumn({
          name: 'tiktok_leads_synced',
          type: 'integer',
          default: 0,
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTiktokLeadsCol = await queryRunner.hasColumn('sync_execution_logs', 'tiktok_leads_synced');
    if (hasTiktokLeadsCol) {
      await queryRunner.dropColumn('sync_execution_logs', 'tiktok_leads_synced');
    }

    if (await queryRunner.hasTable('webhook_delivery_logs')) {
      await queryRunner.dropTable('webhook_delivery_logs');
    }

    if (await queryRunner.hasTable('webhook_configs')) {
      await queryRunner.dropTable('webhook_configs');
    }
  }
}
