import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateMenusAndRoleMenusTables1770000000008 implements MigrationInterface {
  name = 'CreateMenusAndRoleMenusTables1770000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla menus
    await queryRunner.createTable(
      new Table({
        name: 'menus',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'label',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'ruta',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'icono',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'orden',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'tipo',
            type: 'varchar',
            length: '50',
            default: "'Principal'",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'menus',
      new TableIndex({
        name: 'IDX_MENUS_RUTA',
        columnNames: ['ruta'],
      }),
    );

    // 2. Tabla intermedia role_menus
    await queryRunner.createTable(
      new Table({
        name: 'role_menus',
        columns: [
          {
            name: 'role_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'menu_id',
            type: 'uuid',
            isPrimary: true,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['rol_id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['menu_id'],
            referencedTableName: 'menus',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_menus', true);
    await queryRunner.dropTable('menus', true);
  }
}
