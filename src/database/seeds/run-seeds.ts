import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../data-source';
import { seedAdminUser } from './admin-user.seed';

async function runSeeds(): Promise<void> {
  const dataSource = await AppDataSource.initialize();

  try {
    console.log('[seed] Iniciando seeders...');
    await seedAdminUser(dataSource);
    console.log('[seed] Seeders finalizados correctamente.');
  } catch (error) {
    console.error('[seed] Error ejecutando seeders:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
