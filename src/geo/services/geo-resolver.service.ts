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
  ciudadDeclarada: string | null;
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
   * Resuelve la provincia y cantón a partir del texto ingresado por el prospecto
   * Prioriza coincidencia contra tbl_provincia y retorna el nombre de provincia normalizado
   * (sin caracteres especiales y en minúsculas) para ciudadDeclarada.
   */
  async resolveLocation(input: string | null | undefined): Promise<ResolvedLocation> {
    if (!input || typeof input !== 'string') {
      return { cantonId: null, provinciaId: null, cantonNombre: null, provinciaNombre: null, ciudadDeclarada: null };
    }

    if (this.provincias.length === 0 || this.cantones.length === 0) {
      await this.loadCatalog();
    }

    const cleanInput = this.normalizeText(input);
    if (!cleanInput) {
      return { cantonId: null, provinciaId: null, cantonNombre: null, provinciaNombre: null, ciudadDeclarada: null };
    }

    // 1. Prioridad: Buscar coincidencia en tbl_provincia (exacta o tipo LIKE contenida)
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
        ciudadDeclarada: matchedProv.normalized, // Nombre de la provincia en minúsculas y sin acentos
      };
    }

    // 2. Fallback: Buscar coincidencia en tbl_canton si ingresaron un cantón
    let matchedCanton = this.cantones.find((c) => c.normalized === cleanInput);
    if (!matchedCanton) {
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
        ciudadDeclarada: prov ? prov.normalized : matchedCanton.normalized,
      };
    }

    return {
      cantonId: null,
      provinciaId: null,
      cantonNombre: null,
      provinciaNombre: null,
      ciudadDeclarada: cleanInput,
    };
  }

  private normalizeText(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
