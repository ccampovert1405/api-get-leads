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
    const leadId = record['Lead ID'] ?? record['lead_id'] ?? record['id'];

    return {
      sourceLeadId: leadId,
      campaignId: record['Campaign ID'] ?? record['campaign_id'] ?? null,
      formName: record['Form Name'] ?? record['form_name'] ?? null,
      fullName: record['Name'] ?? record['full_name'] ?? null,
      email: record['Email'] ?? record['email'] ?? null,
      phone: record['Phone Number'] ?? record['phone_number'] ?? record['phone'] ?? null,
      receivedAt: this.parseDate(record['Created Time'] ?? record['created_time']),
      rawPayload: record,
    };
  }

  private static parseDate(value: string | undefined): Date {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
