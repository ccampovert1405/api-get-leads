import { RawMetaLead } from '../../application/ports/meta-graph-api.port';

export class MetaLeadMapper {
  static toRawMetaLead(rawItem: any, fallbackCampaignId?: string): RawMetaLead {
    const fieldData = Array.isArray(rawItem.field_data) ? rawItem.field_data : [];
    const fieldsMap: Record<string, string> = {};

    for (const f of fieldData) {
      if (f.name && Array.isArray(f.values) && f.values.length > 0) {
        fieldsMap[f.name.toLowerCase()] = f.values[0];
      }
    }

    const fullName =
      fieldsMap['full_name'] ??
      [fieldsMap['first_name'], fieldsMap['last_name']].filter(Boolean).join(' ') ??
      fieldsMap['name'] ??
      null;

    const email = fieldsMap['email'] ?? fieldsMap['work_email'] ?? null;
    const phone = fieldsMap['phone_number'] ?? fieldsMap['phone'] ?? fieldsMap['mobile_phone'] ?? null;

    const receivedAt = rawItem.created_time ? new Date(rawItem.created_time) : new Date();

    return {
      sourceLeadId: rawItem.id,
      campaignId: rawItem.campaign_id ?? fallbackCampaignId ?? null,
      formId: rawItem.form_id ?? null,
      formName: rawItem.form_id ? `Form ${rawItem.form_id}` : null,
      fullName: fullName || null,
      email: email || null,
      phone: phone || null,
      receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
      rawPayload: rawItem,
    };
  }
}
