import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddWebhookTrackingToLeadsAndDeliveryLogs1770000000013 implements MigrationInterface {
  name = 'AddWebhookTrackingToLeadsAndDeliveryLogs1770000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columnas de tracking de webhook a la tabla 'leads'
    if (!(await queryRunner.hasColumn('leads', 'webhook_status'))) {
      await queryRunner.addColumn(
        'leads',
        new TableColumn({
          name: 'webhook_status',
          type: 'varchar',
          length: '20',
          default: "'PENDING'",
          isNullable: false,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('leads', 'webhook_sent_at'))) {
      await queryRunner.addColumn(
        'leads',
        new TableColumn({
          name: 'webhook_sent_at',
          type: 'timestamp with time zone',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('leads', 'webhook_error'))) {
      await queryRunner.addColumn(
        'leads',
        new TableColumn({
          name: 'webhook_error',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('leads', 'last_webhook_log_id'))) {
      await queryRunner.addColumn(
        'leads',
        new TableColumn({
          name: 'last_webhook_log_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('leads', 'last_webhook_payload'))) {
      await queryRunner.addColumn(
        'leads',
        new TableColumn({
          name: 'last_webhook_payload',
          type: 'jsonb',
          isNullable: true,
        }),
      );
    }

    // Índice por webhook_status en la tabla 'leads'
    const hasStatusIndex = await queryRunner.getTable('leads').then((t) =>
      t?.indices.some((idx) => idx.name === 'IDX_LEADS_WEBHOOK_STATUS'),
    );
    if (!hasStatusIndex) {
      await queryRunner.createIndex(
        'leads',
        new TableIndex({
          name: 'IDX_LEADS_WEBHOOK_STATUS',
          columnNames: ['webhook_status'],
        }),
      );
    }

    // FK de leads(last_webhook_log_id) -> webhook_delivery_logs(id)
    if (await queryRunner.hasTable('webhook_delivery_logs')) {
      const hasFk = await queryRunner.getTable('leads').then((t) =>
        t?.foreignKeys.some((fk) => fk.name === 'FK_leads_last_webhook_log'),
      );
      if (!hasFk) {
        await queryRunner.createForeignKey(
          'leads',
          new TableForeignKey({
            name: 'FK_leads_last_webhook_log',
            columnNames: ['last_webhook_log_id'],
            referencedTableName: 'webhook_delivery_logs',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }
    }

    // 2. Agregar columnas de leads despachados a 'webhook_delivery_logs'
    if (await queryRunner.hasTable('webhook_delivery_logs')) {
      if (!(await queryRunner.hasColumn('webhook_delivery_logs', 'dispatched_lead_ids'))) {
        await queryRunner.addColumn(
          'webhook_delivery_logs',
          new TableColumn({
            name: 'dispatched_lead_ids',
            type: 'jsonb',
            isNullable: true,
          }),
        );
      }

      if (!(await queryRunner.hasColumn('webhook_delivery_logs', 'dispatched_leads_summary'))) {
        await queryRunner.addColumn(
          'webhook_delivery_logs',
          new TableColumn({
            name: 'dispatched_leads_summary',
            type: 'jsonb',
            isNullable: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Revertir columnas de webhook_delivery_logs
    if (await queryRunner.hasTable('webhook_delivery_logs')) {
      if (await queryRunner.hasColumn('webhook_delivery_logs', 'dispatched_leads_summary')) {
        await queryRunner.dropColumn('webhook_delivery_logs', 'dispatched_leads_summary');
      }
      if (await queryRunner.hasColumn('webhook_delivery_logs', 'dispatched_lead_ids')) {
        await queryRunner.dropColumn('webhook_delivery_logs', 'dispatched_lead_ids');
      }
    }

    // 2. Revertir FK e índice de leads
    const leadsTable = await queryRunner.getTable('leads');
    if (leadsTable) {
      const fk = leadsTable.foreignKeys.find((f) => f.name === 'FK_leads_last_webhook_log');
      if (fk) {
        await queryRunner.dropForeignKey('leads', fk);
      }

      const idx = leadsTable.indices.find((i) => i.name === 'IDX_LEADS_WEBHOOK_STATUS');
      if (idx) {
        await queryRunner.dropIndex('leads', idx);
      }

      // Revertir columnas de leads
      if (await queryRunner.hasColumn('leads', 'last_webhook_payload')) {
        await queryRunner.dropColumn('leads', 'last_webhook_payload');
      }
      if (await queryRunner.hasColumn('leads', 'last_webhook_log_id')) {
        await queryRunner.dropColumn('leads', 'last_webhook_log_id');
      }
      if (await queryRunner.hasColumn('leads', 'webhook_error')) {
        await queryRunner.dropColumn('leads', 'webhook_error');
      }
      if (await queryRunner.hasColumn('leads', 'webhook_sent_at')) {
        await queryRunner.dropColumn('leads', 'webhook_sent_at');
      }
      if (await queryRunner.hasColumn('leads', 'webhook_status')) {
        await queryRunner.dropColumn('leads', 'webhook_status');
      }
    }
  }
}
