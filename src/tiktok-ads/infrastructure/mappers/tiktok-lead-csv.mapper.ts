import { parse } from 'csv-parse/sync';
import { RawLeadRow } from '../../application/ports/tiktok-api.port';

/**
 * TikTok exporta los leads de Instant Form como CSV con columnas variables
 * según los campos configurados en el formulario. Mapeamos las columnas
 * estándar más comunes y preservamos todo lo demás en rawPayload.
 */
export class TikTokLeadCsvMapper {
  static parse(csvContent: string): RawLeadRow[] {
    const records: Record<string, string>[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((record) => this.toRawLeadRow(record));
  }

  private static toRawLeadRow(record: Record<string, string>): RawLeadRow {
    const leadId = record['Lead ID'] ?? record['lead_id'] ?? record['id'] ?? record['ID'];

    // Normalizar claves a minúsculas sin acentos para búsqueda insensible
    const normalizedMap: Record<string, string> = {};
    for (const [key, val] of Object.entries(record)) {
      if (key && val !== undefined && val !== null) {
        const normKey = key
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]/g, '_')
          .trim();
        normalizedMap[normKey] = String(val).trim();
      }
    }

    // Nombre completo
    const fullName =
      record['Name'] ??
      record['full_name'] ??
      record['Full Name'] ??
      normalizedMap['name'] ??
      normalizedMap['full_name'] ??
      [record['First Name'], record['Last Name']].filter(Boolean).join(' ') ??
      null;

    // Email y teléfono
    const email = record['Email'] ?? record['email'] ?? normalizedMap['email'] ?? null;
    const phone =
      record['Phone Number'] ??
      record['phone_number'] ??
      record['phone'] ??
      record['Phone'] ??
      normalizedMap['phone_number'] ??
      normalizedMap['phone'] ??
      null;

    // Extracción heurística de Cédula / Identificación
    let rawCedula: string | null = null;
    for (const [normKey, val] of Object.entries(normalizedMap)) {
      if (
        normKey.includes('cedula') ||
        normKey.includes('ci_') ||
        normKey === 'ci' ||
        normKey.includes('identificacion') ||
        normKey.includes('dni') ||
        normKey.includes('documento')
      ) {
        rawCedula = val;
        break;
      }
    }

    // Si no encontró por clave, revisar si algún campo tiene exactamente 10 dígitos (cédula ecuatoriana típica)
    if (!rawCedula) {
      for (const [normKey, val] of Object.entries(normalizedMap)) {
        if (!normKey.includes('phone') && !normKey.includes('tel') && /^\d{10}$/.test(val)) {
          rawCedula = val;
          break;
        }
      }
    }

    const cleanCedula = rawCedula ? rawCedula.replace(/[^0-9a-zA-Z]/g, '').trim() : null;

    // Extracción de Ciudad / Cantón / Provincia / ¿En dónde quieres ser atendido?
    let rawCiudad: string | null = null;
    for (const [normKey, val] of Object.entries(normalizedMap)) {
      if (
        normKey.includes('donde') ||
        normKey.includes('atendido') ||
        normKey.includes('ciudad') ||
        normKey.includes('canton') ||
        normKey.includes('provincia') ||
        normKey.includes('ubicacion') ||
        normKey.includes('localidad')
      ) {
        rawCiudad = val;
        break;
      }
    }

    // Extracción de preferencia de contacto
    let rawContactPref: string | null = null;
    for (const [normKey, val] of Object.entries(normalizedMap)) {
      if (
        normKey.includes('contact') ||
        normKey.includes('canal') ||
        normKey.includes('medio') ||
        normKey.includes('whatsapp')
      ) {
        rawContactPref = val;
        break;
      }
    }

    return {
      sourceLeadId: leadId,
      campaignId: record['Campaign ID'] ?? record['campaign_id'] ?? normalizedMap['campaign_id'] ?? null,
      formName: record['Form Name'] ?? record['form_name'] ?? normalizedMap['form_name'] ?? null,
      fullName: fullName || null,
      email: email || null,
      phone: phone || null,
      receivedAt: this.parseDate(record['Created Time'] ?? record['created_time'] ?? normalizedMap['created_time']),
      cedula: cleanCedula || null,
      ciudadDeclarada: rawCiudad ? String(rawCiudad).trim() : null,
      contactPreference: rawContactPref ? String(rawContactPref).toLowerCase().trim() : null,
      rawPayload: record,
    };
  }

  private static parseDate(value: string | undefined): Date {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
