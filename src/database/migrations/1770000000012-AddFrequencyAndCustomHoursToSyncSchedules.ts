import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFrequencyAndCustomHoursToSyncSchedules1770000000012 implements MigrationInterface {
  name = 'AddFrequencyAndCustomHoursToSyncSchedules1770000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sync_schedules',
      new TableColumn({
        name: 'schedule_mode',
        type: 'varchar',
        length: '30',
        default: "'EXACT_TIME'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'sync_schedules',
      new TableColumn({
        name: 'interval_hours',
        type: 'smallint',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'sync_schedules',
      new TableColumn({
        name: 'custom_hours',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'sync_schedules',
      new TableColumn({
        name: 'times_per_day',
        type: 'smallint',
        default: 1,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('sync_schedules', 'times_per_day');
    await queryRunner.dropColumn('sync_schedules', 'custom_hours');
    await queryRunner.dropColumn('sync_schedules', 'interval_hours');
    await queryRunner.dropColumn('sync_schedules', 'schedule_mode');
  }
}
