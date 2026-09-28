import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinciaOrmEntity } from '../entities/provincia.orm-entity';
import { CantonOrmEntity } from '../entities/canton.orm-entity';

export interface ResolvedLocation {
  cantonId: number | null;
  provinciaId: number | null;
  cantonNombre: string | null;
  provinciaNombre: string | null;
}

@Injectable()
export class GeoResolverService implements OnModuleInit {
  private readonly logger = new Logger(GeoResolverService.name);
  private provincias: Array<{ id: number; name: string; normalized: string }> = [];
  private cantones: Array<{ id: number; name: string; idProvincia: number; normalized: string }> = [];

  constructor(
    @InjectRepository(ProvinciaOrmEntity)
    private readonly provinciaRepo: Repository<ProvinciaOrmEntity>,
    @InjectRepository(CantonOrmEntity)
    private readonly cantonRepo: Repository<CantonOrmEntity>,
  ) {}

  async onModuleInit() {
    await this.loadCatalog();
  }

  async loadCatalog() {
    try {
      const provs = await this.provinciaRepo.find();
      this.provincias = provs.map((p) => ({
        id: Number(p.id),
        name: p.provincia,
        normalized: this.normalizeText(p.provincia),
      }));

      const cants = await this.cantonRepo.find();
      this.cantones = cants.map((c) => ({
        id: Number(c.id),
        name: c.canton,
        idProvincia: Number(c.idProvincia),
        normalized: this.normalizeText(c.canton),
      }));

      this.logger.log(
        `Catálogo geográfico cargado: ${this.provincias.length} provincias, ${this.cantones.length} cantones.`,
      );
    } catch (err: any) {
      this.logger.warn(`No se pudo precargar el catálogo geográfico: ${err?.message || err}`);
    }
  }

  /**
   * Resuelve el cantón y provincia a partir del texto ingresado por el prospecto
   * (ej. 'cotopaxi', 'latacunga', 'quito', 'guayaquil', etc.)
   */
  async resolveLocation(input: string | null | undefined): Promise<ResolvedLocation> {
    if (!input || typeof input !== 'string') {
      return { cantonId: null, provinciaId: null, cantonNombre: null, provinciaNombre: null };
    }

    if (this.provincias.length === 0 || this.cantones.length === 0) {
      await this.loadCatalog();
    }

    const cleanInput = this.normalizeText(input);
    if (!cleanInput) {
      return { cantonId: null, provinciaId: null, cantonNombre: null, provinciaNombre: null };
    }

    // 1. Intentar coincidencia exacta o contenida con Cantón
    // Primero coincidencia exacta
    let matchedCanton = this.cantones.find((c) => c.normalized === cleanInput);
    if (!matchedCanton) {
      // Buscar si el texto del input contiene el nombre del cantón o viceversa
      matchedCanton = this.cantones.find(
        (c) => cleanInput.includes(c.normalized) || (c.normalized.length >= 4 && c.normalized.includes(cleanInput)),
      );
    }

    if (matchedCanton) {
      const prov = this.provincias.find((p) => p.id === matchedCanton!.idProvincia);
      return {
        cantonId: matchedCanton.id,
        provinciaId: matchedCanton.idProvincia,
        cantonNombre: matchedCanton.name,
        provinciaNombre: prov?.name ?? null,
      };
    }

    // 2. Intentar coincidencia con Provincia
    let matchedProv = this.provincias.find((p) => p.normalized === cleanInput);
    if (!matchedProv) {
      matchedProv = this.provincias.find(
        (p) => cleanInput.includes(p.normalized) || (p.normalized.length >= 4 && p.normalized.includes(cleanInput)),
      );
    }

    if (matchedProv) {
      return {
        cantonId: null,
        provinciaId: matchedProv.id,
        cantonNombre: null,
        provinciaNombre: matchedProv.name,
      };
    }

    return {
      cantonId: null,
      provinciaId: null,
      cantonNombre: null,
      provinciaNombre: null,
    };
  }

  private normalizeText(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
