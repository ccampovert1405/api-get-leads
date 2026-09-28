import { RawMetaLead } from '../../application/ports/meta-graph-api.port';

export class MetaLeadMapper {
  static toRawMetaLead(rawItem: any, fallbackCampaignId?: string, fallbackFormName?: string): RawMetaLead {
    const fieldData = Array.isArray(rawItem.field_data) ? rawItem.field_data : [];
    const fieldsMap: Record<string, string> = {};

    for (const f of fieldData) {
      if (f.name && Array.isArray(f.values) && f.values.length > 0) {
        fieldsMap[f.name.toLowerCase().trim()] = f.values[0];
      }
    }

    const fullName =
      fieldsMap['full_name'] ??
      [fieldsMap['first_name'], fieldsMap['last_name']].filter(Boolean).join(' ') ??
      fieldsMap['name'] ??
      null;

    const email = fieldsMap['email'] ?? fieldsMap['work_email'] ?? null;
    const phone = fieldsMap['phone_number'] ?? fieldsMap['phone'] ?? fieldsMap['mobile_phone'] ?? null;

    // Extraer cédula / CI
    let rawCedula =
      fieldsMap['ci_(ecuador)'] ??
      fieldsMap['ci'] ??
      fieldsMap['cedula'] ??
      fieldsMap['cédula'] ??
      fieldsMap['identificacion'] ??
      fieldsMap['identificación'] ??
      fieldsMap['cedula_de_identidad'] ??
      fieldsMap['ci_ecuador'] ??
      null;

    // Buscar también dinámicamente si alguna clave contiene "ci" o "cedula"
    if (!rawCedula) {
      for (const [key, val] of Object.entries(fieldsMap)) {
        if (key.includes('ci_') || key.includes('cedula') || key.includes('cédula')) {
          rawCedula = val;
          break;
        }
      }
    }

    const cleanCedula = rawCedula ? rawCedula.replace(/[^0-9a-zA-Z]/g, '').trim() : null;

    // Extraer ciudad declarada / ¿en dónde quieres ser atendido?
    let rawCiudad =
      fieldsMap['¿en_dónde_quieres_ser_atendido?'] ??
      fieldsMap['en_donde_quieres_ser_atendido'] ??
      fieldsMap['donde_quieres_ser_atendido'] ??
      fieldsMap['ciudad'] ??
      fieldsMap['canton'] ??
      fieldsMap['cantón'] ??
      fieldsMap['provincia'] ??
      fieldsMap['ubicacion'] ??
      fieldsMap['ubicación'] ??
      null;

    if (!rawCiudad) {
      for (const [key, val] of Object.entries(fieldsMap)) {
        if (key.includes('donde') || key.includes('dónde') || key.includes('atendido') || key.includes('ciudad') || key.includes('canton')) {
          rawCiudad = val;
          break;
        }
      }
    }

    // Extraer preferencia de contacto
    let rawContactPref =
      fieldsMap['¿cómo_quieres_que_te_contactemos?'] ??
      fieldsMap['como_quieres_que_te_contactemos'] ??
      fieldsMap['medio_contacto'] ??
      fieldsMap['canal_contacto'] ??
      fieldsMap['contact_preference'] ??
      null;

    if (!rawContactPref) {
      for (const [key, val] of Object.entries(fieldsMap)) {
        if (key.includes('contactemos') || key.includes('canal') || key.includes('medio')) {
          rawContactPref = val;
          break;
        }
      }
    }

    const receivedAt = rawItem.created_time ? new Date(rawItem.created_time) : new Date();

    return {
      sourceLeadId: rawItem.id,
      campaignId: rawItem.campaign_id ?? fallbackCampaignId ?? null,
      formId: rawItem.form_id ?? null,
      formName: fallbackFormName ?? (rawItem.form_id ? `Form ${rawItem.form_id}` : null),
      fullName: fullName || null,
      cedula: cleanCedula || null,
      ciudadDeclarada: rawCiudad ? String(rawCiudad).trim() : null,
      contactPreference: rawContactPref ? String(rawContactPref).toLowerCase().trim() : null,
      email: email || null,
      phone: phone || null,
      receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
      rawPayload: rawItem,
    };
  }
}
