import { RawMetaLead } from '../../application/ports/meta-graph-api.port';

export class MetaLeadMapper {
  static toRawMetaLead(rawItem: any, fallbackCampaignId?: string, fallbackFormName?: string): RawMetaLead {
    const fieldData = Array.isArray(rawItem.field_data) ? rawItem.field_data : [];
    const fieldsMap: Record<string, string> = {};
    const normalizedMap: Record<string, string> = {};

    for (const f of fieldData) {
      if (f.name && Array.isArray(f.values) && f.values.length > 0) {
        const val = f.values[0];
        fieldsMap[f.name.toLowerCase().trim()] = val;
        const normKey = f.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        normalizedMap[normKey] = val;
      }
    }

    const fullName =
      fieldsMap['full_name'] ??
      normalizedMap['fullname'] ??
      [fieldsMap['first_name'], fieldsMap['last_name']].filter(Boolean).join(' ') ??
      fieldsMap['name'] ??
      null;

    const email = fieldsMap['email'] ?? fieldsMap['work_email'] ?? normalizedMap['email'] ?? null;
    const phone =
      fieldsMap['phone_number'] ??
      fieldsMap['phone'] ??
      fieldsMap['mobile_phone'] ??
      normalizedMap['phonenumber'] ??
      normalizedMap['phone'] ??
      null;

    // Extraer cédula / CI
    let rawCedula =
      normalizedMap['ciecuador'] ??
      normalizedMap['ci'] ??
      normalizedMap['cedula'] ??
      normalizedMap['identificacion'] ??
      normalizedMap['ceduladeidentidad'] ??
      fieldsMap['ci_(ecuador)'] ??
      fieldsMap['ci'] ??
      fieldsMap['cedula'] ??
      fieldsMap['cédula'] ??
      null;

    // Buscar también dinámicamente si alguna clave contiene "ci" o "cedula"
    if (!rawCedula) {
      for (const [normKey, val] of Object.entries(normalizedMap)) {
        if (normKey.includes('ci') || normKey.includes('cedula') || normKey.includes('identifica')) {
          rawCedula = val;
          break;
        }
      }
    }

    // Si aún no hay cédula, buscar algún campo con exactamente 10 dígitos (típica cédula ecuatoriana)
    if (!rawCedula) {
      for (const [normKey, val] of Object.entries(normalizedMap)) {
        if (!normKey.includes('phone') && !normKey.includes('tel') && typeof val === 'string' && /^\d{10}$/.test(val.trim())) {
          rawCedula = val;
          break;
        }
      }
    }

    const cleanCedula = rawCedula ? String(rawCedula).replace(/[^0-9a-zA-Z]/g, '').trim() : null;

    // Extraer ciudad declarada / ¿En dónde quieres ser atendido? / Provincia
    let rawCiudad =
      normalizedMap['endondequieresseratendido'] ??
      normalizedMap['dondequieresseratendido'] ??
      normalizedMap['enqueciudadquieresseratendido'] ??
      normalizedMap['enqueprovinciaquieresseratendido'] ??
      normalizedMap['provincia'] ??
      normalizedMap['ciudad'] ??
      normalizedMap['canton'] ??
      normalizedMap['ubicacion'] ??
      fieldsMap['¿en_dónde_quieres_ser_atendido?'] ??
      fieldsMap['en_donde_quieres_ser_atendido'] ??
      fieldsMap['donde_quieres_ser_atendido'] ??
      fieldsMap['provincia'] ??
      fieldsMap['ciudad'] ??
      null;

    // Búsqueda difusa en normalizedMap
    if (!rawCiudad) {
      for (const [normKey, val] of Object.entries(normalizedMap)) {
        if (
          normKey.includes('donde') ||
          normKey.includes('atendido') ||
          normKey.includes('provincia') ||
          normKey.includes('ciudad') ||
          normKey.includes('canton') ||
          normKey.includes('ubicacion') ||
          normKey.includes('localidad') ||
          normKey.includes('sucursal') ||
          normKey.includes('agencia')
        ) {
          rawCiudad = val;
          break;
        }
      }
    }

    // Fallback: Si no viene en field_data, verificar si el nombre del formulario contiene la provincia/ciudad
    if (!rawCiudad && fallbackFormName) {
      rawCiudad = fallbackFormName;
    }

    // Extraer preferencia de contacto
    let rawContactPref =
      normalizedMap['comoquieresquetecontactemos'] ??
      normalizedMap['mediocontacto'] ??
      normalizedMap['canalcontacto'] ??
      normalizedMap['contactpreference'] ??
      fieldsMap['¿cómo_quieres_que_te_contactemos?'] ??
      fieldsMap['como_quieres_que_te_contactemos'] ??
      null;

    if (!rawContactPref) {
      for (const [normKey, val] of Object.entries(normalizedMap)) {
        if (normKey.includes('contact') || normKey.includes('canal') || normKey.includes('medio') || normKey.includes('whatsapp')) {
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
      ciudadDeclarada: rawCiudad
        ? String(rawCiudad)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, ' ')
        : null,
      contactPreference: rawContactPref ? String(rawContactPref).toLowerCase().trim() : null,
      email: email || null,
      phone: phone || null,
      receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
      rawPayload: rawItem,
    };
  }
}
