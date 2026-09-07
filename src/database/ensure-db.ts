import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

export async function ensureDatabase(): Promise<void> {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = Number(process.env.DB_PORT ?? 5432);
  const user = process.env.DB_USER ?? 'postgres';
  const password = process.env.DB_PASSWORD ?? 'postgres';
  const targetDb = process.env.DB_NAME ?? 'meta_ads_db';
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
  const maintenanceDb = process.env.DB_MAINTENANCE_DB ?? 'postgres';

  console.log(`🔍 [database] Verificando existencia de base de datos "${targetDb}" en ${host}:${port}...`);

  if (targetDb.toLowerCase() === maintenanceDb.toLowerCase()) {
    console.log(`ℹ️ [database] La base de datos objetivo coincide con la de mantenimiento ("${maintenanceDb}"). No requiere creación.`);
    return;
  }

  const client = new Client({
    host,
    port,
    user,
    password,
    database: maintenanceDb,
    ssl,
  });

  try {
    await client.connect();

    const checkRes = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb],
    );

    if (checkRes.rowCount && checkRes.rowCount > 0) {
      console.log(`✅ [database] Base de datos "${targetDb}" ya existe.`);
    } else {
      console.log(`⚠️  [database] Base de datos "${targetDb}" no existe. Procediendo a crearla...`);
      const safeDbName = targetDb.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${safeDbName}"`);
      console.log(`✨ [database] Base de datos "${targetDb}" creada exitosamente.`);
    }
  } catch (error: any) {
    console.error(`❌ [database] Error al conectar o crear la base de datos "${targetDb}":`, error.message ?? error);
    throw error;
  } finally {
    try {
      await client.end();
    } catch {
      // Ignorar error al cerrar conexión
    }
  }
}

if (require.main === module) {
  ensureDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
