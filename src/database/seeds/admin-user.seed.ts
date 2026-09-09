import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../../auth/infrastructure/persistence/entities/user.orm-entity';
import { RoleOrmEntity } from '../../roles/entities/role.orm-entity';
import { MenuOrmEntity } from '../../menus/entities/menu.orm-entity';
import { SyncScheduleOrmEntity } from '../../sync-schedules/infrastructure/persistence/entities/sync-schedule.orm-entity';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

const INITIAL_MENUS = [
  { label: 'Vista Ejecutiva C-Suite', ruta: 'dashboard', icono: 'monitoring', orden: 1, tipo: 'Principal' },
  { label: 'Vista Táctica Meta vs TikTok', ruta: 'tactical', icono: 'compare_arrows', orden: 2, tipo: 'Principal' },
  { label: 'Creativos & Audiencias', ruta: 'creatives', icono: 'campaign', orden: 3, tipo: 'Principal' },
  { label: 'Matriz de Decisiones', ruta: 'matrix', icono: 'rule', orden: 4, tipo: 'Principal' },
  { label: 'Leads Unificados', ruta: 'leads', icono: 'contacts', orden: 5, tipo: 'Operaciones' },
  { label: 'Campañas Publicitarias', ruta: 'campaigns', icono: 'ads_click', orden: 6, tipo: 'Operaciones' },
  { label: 'Programación Crontab', ruta: 'scheduler', icono: 'schedule', orden: 7, tipo: 'Operaciones' },
  { label: 'APIs Asignadas (Swagger RBAC)', ruta: 'swagger', icono: 'api', orden: 8, tipo: 'Plataforma' },
  { label: 'Tutorial para Obtener Variables', ruta: 'tutorial', icono: 'menu_book', orden: 9, tipo: 'Plataforma' },
  { label: 'Gestión de Usuarios', ruta: 'users', icono: 'manage_accounts', orden: 10, tipo: 'Administracion' },
  { label: 'Roles & Autorizaciones', ruta: 'roles', icono: 'admin_panel_settings', orden: 11, tipo: 'Administracion' },
  { label: 'Catálogo de Permisos', ruta: 'permissions', icono: 'key', orden: 12, tipo: 'Administracion' },
  { label: 'Gestión de Menús', ruta: 'menus', icono: 'menu_open', orden: 13, tipo: 'Administracion' },
  { label: 'Variables Meta & TikTok', ruta: 'variables', icono: 'tune', orden: 14, tipo: 'Variables' },
];

/**
 * Seeder 100% No Destructivo e Idempotente:
 * - NO sobreescribe datos ya existentes en la base de datos (mantiene contraseñas, roles y configuraciones).
 * - Solo inserta los registros nuevos que no existan previamente.
 */
export async function seedAdminUser(dataSource: DataSource): Promise<void> {
  const roleRepo = dataSource.getRepository(RoleOrmEntity);
  const userRepo = dataSource.getRepository(UserOrmEntity);
  const menuRepo = dataSource.getRepository(MenuOrmEntity);
  const syncScheduleRepo = dataSource.getRepository(SyncScheduleOrmEntity);

  // 1. Asegurar catálogo de Menús base
  const allMenus: MenuOrmEntity[] = [];
  for (const m of INITIAL_MENUS) {
    let existingMenu = await menuRepo.findOne({ where: { ruta: m.ruta } });
    if (!existingMenu) {
      existingMenu = await menuRepo.save(menuRepo.create(m));
      console.log(`[seed] Menú creado: "${m.label}" (${m.ruta})`);
    }
    allMenus.push(existingMenu);
  }

  const username = process.env.SEED_ADMIN_USERNAME ?? 'administrator';
  const plainPassword = process.env.SEED_ADMIN_PASSWORD ?? '4dmin2026&&';

  // 2. Asegurar rol "Super Administrador" con todos los menús
  let superRole = await roleRepo.findOne({
    where: { nombreRol: 'Super Administrador' },
    relations: { menus: true },
  });
  if (!superRole) {
    superRole = await roleRepo.save(
      roleRepo.create({
        nombreRol: 'Super Administrador',
        descripcion: 'Acceso total y sin restricciones a todos los recursos del sistema',
        menus: allMenus,
      }),
    );
    console.log('[seed] Rol "Super Administrador" creado con menús completos.');
  } else {
    // Vincular cualquier menú nuevo no asignado
    const existingMenuIds = new Set(superRole.menus?.map((m) => m.id) || []);
    const missingMenus = allMenus.filter((m) => !existingMenuIds.has(m.id));
    if (missingMenus.length > 0) {
      superRole.menus = [...(superRole.menus || []), ...missingMenus];
      await roleRepo.save(superRole);
      console.log(`[seed] Se asociaron ${missingMenus.length} nuevos menús a "Super Administrador".`);
    }
    console.log('[seed] Rol "Super Administrador" ya existe. Se mantiene sin modificaciones.');
  }

  // 3. Asegurar rol "Analista" con menús operacionales y de consulta
  let analystRole = await roleRepo.findOne({
    where: { nombreRol: 'Analista' },
    relations: { menus: true },
  });
  const analystAllowedRoutes = new Set(['dashboard', 'tactical', 'creatives', 'matrix', 'leads', 'campaigns', 'tutorial']);
  const analystMenus = allMenus.filter((m) => analystAllowedRoutes.has(m.ruta));

  if (!analystRole) {
    await roleRepo.save(
      roleRepo.create({
        nombreRol: 'Analista',
        descripcion: 'Acceso de solo lectura a consultas y reportes de campañas y leads',
        menus: analystMenus,
      }),
    );
    console.log('[seed] Rol "Analista" creado con menús asignados.');
  } else {
    if (!analystRole.menus || analystRole.menus.length === 0) {
      analystRole.menus = analystMenus;
      await roleRepo.save(analystRole);
      console.log('[seed] Se asociaron menús de consulta al rol "Analista".');
    }
    console.log('[seed] Rol "Analista" ya existe. Se mantiene sin modificaciones.');
  }

  // 3. Crear o verificar usuario administrador (NO sobreescribe datos si ya existe)
  const existingUser = await userRepo.findOne({
    where: { username },
    relations: { rol: true },
  });

  if (existingUser) {
    console.log(`[seed] Usuario "${username}" ya existe en BD. Se respeta su contraseña actual sin modificar.`);
    if (!existingUser.rol) {
      existingUser.rol = superRole;
      existingUser.role = 'Super Administrador';
      await userRepo.save(existingUser);
      console.log(`[seed] Se vinculó el rol "Super Administrador" al usuario existente "${username}".`);
    }
  } else {
    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const newAdmin = userRepo.create({
      username,
      passwordHash,
      role: 'Super Administrador',
      rol: superRole,
      isActive: true,
    });
    await userRepo.save(newAdmin);
    console.log(`[seed] Usuario "${username}" creado exitosamente con rol "Super Administrador".`);
  }

  // 4. Configuración inicial de Crontab (solo si no existe)
  const existingSchedule = await syncScheduleRepo.findOne({
    where: { name: 'sincronizacion-campanas-predeterminada' },
  });
  if (!existingSchedule) {
    await syncScheduleRepo.save(
      syncScheduleRepo.create({
        name: 'sincronizacion-campanas-predeterminada',
        description: 'Sincronización automática de campañas y leads de Meta Ads y TikTok Ads',
        isEnabled: true,
        daysOfWeek: [1, 2, 3, 4, 5],
        hour: 8,
        minute: 0,
        timezone: 'America/Guayaquil',
        syncMeta: true,
        syncTikTok: true,
        syncLeads: true,
      }),
    );
    console.log('[seed] Programación Crontab predeterminada creada (nuevo: L-V a las 08:00 AM).');
  } else {
    console.log('[seed] Programación Crontab ya existe. Se respetan los parámetros configurados por el usuario.');
  }
}
