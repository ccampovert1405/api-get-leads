import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCiudadDeclaradaFromProvincias1770000000014 implements MigrationInterface {
  name = 'BackfillCiudadDeclaradaFromProvincias1770000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Obtener catálogo oficial de provincias
    const provincias: Array<{ id: string | number; provincia: string }> = await queryRunner.query(
      'SELECT id, provincia FROM tbl_provincia',
    );

    const normalizedProvincias = provincias.map((p) => ({
      id: Number(p.id),
      name: p.provincia,
      normalized: this.normalizeText(p.provincia),
    }));

    // 2. Actualizar leads que ya tienen id_provincia pero ciudad_declarada es NULL o vacía
    for (const prov of normalizedProvincias) {
      await queryRunner.query(
        `UPDATE leads
         SET ciudad_declarada = $1
         WHERE id_provincia = $2
           AND (ciudad_declarada IS NULL OR TRIM(ciudad_declarada) = '')`,
        [prov.normalized, prov.id],
      );
    }

    // 3. Para leads que tienen id_canton pero no id_provincia o no ciudad_declarada
    const cantones: Array<{ id: string | number; canton: string; id_provincia: string | number }> =
      await queryRunner.query('SELECT id, canton, id_provincia FROM tbl_canton');

    for (const cant of cantones) {
      const prov = normalizedProvincias.find((p) => p.id === Number(cant.id_provincia));
      if (prov) {
        await queryRunner.query(
          `UPDATE leads
           SET id_provincia = $1, ciudad_declarada = $2
           WHERE id_canton = $3
             AND (ciudad_declarada IS NULL OR TRIM(ciudad_declarada) = '')`,
          [prov.id, prov.normalized, Number(cant.id)],
        );
      }
    }

    // 4. Para leads restantes sin id_provincia ni ciudad_declarada:
    // Analizar el raw_payload (field_data) y el form_name para resolver contra tbl_provincia
    const pendingLeads: Array<{ id: string; form_name: string | null; raw_payload: any }> = await queryRunner.query(
      `SELECT id, form_name, raw_payload
       FROM leads
       WHERE (ciudad_declarada IS NULL OR TRIM(ciudad_declarada) = '')
         AND raw_payload IS NOT NULL`,
    );

    for (const lead of pendingLeads) {
      let rawLocation: string | null = null;

      // Extraer desde field_data de raw_payload
      if (lead.raw_payload && Array.isArray(lead.raw_payload.field_data)) {
        for (const f of lead.raw_payload.field_data) {
          if (f.name && Array.isArray(f.values) && f.values.length > 0) {
            const cleanKey = this.normalizeKey(f.name);
            if (
              cleanKey.includes('donde') ||
              cleanKey.includes('atendido') ||
              cleanKey.includes('provincia') ||
              cleanKey.includes('ciudad') ||
              cleanKey.includes('canton') ||
              cleanKey.includes('ubicacion')
            ) {
              rawLocation = f.values[0];
              break;
            }
          }
        }
      }

      // Fallback a form_name si no hubo campo
      if (!rawLocation && lead.form_name) {
        rawLocation = lead.form_name;
      }

      if (rawLocation) {
        const cleanInput = this.normalizeText(rawLocation);
        let matchedProv = normalizedProvincias.find((p) => p.normalized === cleanInput);
        if (!matchedProv) {
          matchedProv = normalizedProvincias.find(
            (p) => cleanInput.includes(p.normalized) || (p.normalized.length >= 4 && p.normalized.includes(cleanInput)),
          );
        }

        if (matchedProv) {
          await queryRunner.query(
            `UPDATE leads
             SET id_provincia = COALESCE(id_provincia, $1),
                 ciudad_declarada = $2
             WHERE id = $3`,
            [matchedProv.id, matchedProv.normalized, lead.id],
          );
        }
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Backfill no destructivo: no se requiere revertir datos recuperados
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

  private normalizeKey(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
}
