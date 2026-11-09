// Client Memory, Auto-fill, and Technical Property Dossier (Ficha Técnica) management
const STORAGE_KEY = 'wg_client_memory';

// Default presets for high-frequency or newly added clients (includes default Ficha Técnica fields)
const KNOWN_CLIENT_PRESETS = {
  'mohammed': {
    cobro: 220,
    tipo: 'Limpieza',
    horas: 3,
    address: '88 Blue Jays Way, Penthouse 4201, Toronto, ON',
    accessCode: 'Smart Lock: #4820* (Concierge piso PB)',
    wifiInfo: 'Red: Bell_PH4201 | Pass: WhiteGlove2026',
    parkingInfo: 'Visitor Parking P1 (Solicitar pase en recepción)',
    suppliesLocation: 'Closet de lavado junto a cocina; blancos limpios en armario principal',
    petAndAllergyNotes: 'Sin mascotas. Pisos de mármol y madera noble (usar limpiador neutro).',
    specialInstructions: 'Priorizar ventanales de sala, cocina gourmet y doblado tipo hotel en recámara principal.',
  },
  'phillys': {
    cobro: 180,
    tipo: 'Limpieza',
    horas: 2.5,
    address: '214 St George St, Suite 904, Toronto, ON',
    accessCode: 'Lockbox lateral: 1955',
    wifiInfo: 'Red: Rogers_904 | Pass: StGeorge904',
    parkingInfo: 'Estacionamiento en calle con parquímetro o entrada trasera',
    suppliesLocation: 'Debajo de tarja de cocina y closet del pasillo',
    petAndAllergyNotes: '1 gato tranquilo (no dejar puerta principal abierta).',
    specialInstructions: 'Desinfectar baños a detalle y aspirar alfombras con filtro HEPA.',
  },
  'phillis': {
    cobro: 180,
    tipo: 'Limpieza',
    horas: 2.5,
    address: '214 St George St, Suite 904, Toronto, ON',
    accessCode: 'Lockbox lateral: 1955',
    wifiInfo: 'Red: Rogers_904 | Pass: StGeorge904',
    parkingInfo: 'Estacionamiento en calle con parquímetro o entrada trasera',
    suppliesLocation: 'Debajo de tarja de cocina y closet del pasillo',
    petAndAllergyNotes: '1 gato tranquilo (no dejar puerta principal abierta).',
    specialInstructions: 'Desinfectar baños a detalle y aspirar alfombras con filtro HEPA.',
  },
  'chand': {
    cobro: 185,
    tipo: 'Limpieza',
    horas: 2.5,
    address: '120 Bayview Ave, Residence 14B, Toronto, ON',
    accessCode: 'Teclado puerta: 7391#',
    wifiInfo: 'Red: Chand_Home5G | Pass: Bayview14B',
    parkingInfo: 'Driveway frontal disponible durante la limpieza',
    suppliesLocation: 'Cuarto de servicio en planta baja',
    petAndAllergyNotes: 'Usar productos hipoalergénicos sin fragancia fuerte.',
    specialInstructions: 'Limpieza detallada de cocina, campana extractora y cristales interiores.',
  },
  'rohan unit a': {
    cobro: 195,
    tipo: 'Limpieza',
    horas: 2,
    address: '455 King St W, Unit A (Airbnb Executive), Toronto, ON',
    accessCode: 'August Smart Lock: 3389',
    wifiInfo: 'Red: Rohan_Guest_A | Pass: WelcomeToronto',
    parkingInfo: 'Loading Zone por Spadina Ave (15 min descarga)',
    suppliesLocation: 'Owner Locker en baño secundario (Código candado: 042)',
    petAndAllergyNotes: 'Unidad libre de humo y mascotas (reportar cualquier olor de inmediato).',
    specialInstructions: 'Turnover Airbnb: cambiar sábanas, dejar 2 cápsulas Nespresso, 2 rollos de papel y tomar foto final.',
  },
  'rohan unit b': {
    cobro: 195,
    tipo: 'Limpieza',
    horas: 2,
    address: '455 King St W, Unit B (Airbnb Executive), Toronto, ON',
    accessCode: 'August Smart Lock: 3390',
    wifiInfo: 'Red: Rohan_Guest_B | Pass: WelcomeToronto',
    parkingInfo: 'Loading Zone por Spadina Ave',
    suppliesLocation: 'Owner Locker en pasillo de entrada (Código candado: 042)',
    petAndAllergyNotes: 'Unidad libre de humo y mascotas.',
    specialInstructions: 'Turnover Airbnb: verificar interior de refrigerador, microondas y amenidades de baño.',
  },
  'ocean villa 4': {
    cobro: 240,
    tipo: 'Limpieza',
    horas: 3,
    address: '180 Lakeshore Rd E, Villa 4, Oakville / GTA, ON',
    accessCode: 'Caseta de seguridad + Código puerta: 9012*',
    wifiInfo: 'Red: LakeshoreVilla4 | Pass: VillaLuxury4',
    parkingInfo: 'Cochera privada espacio #4',
    suppliesLocation: 'Cuarto de lavado en segundo nivel',
    petAndAllergyNotes: 'Superficies de cuarzo blanco en cocina (no usar abrasivos).',
    specialInstructions: 'Revisar terraza, ventanales panorámicos y acomodo de toallas tipo spa.',
  },
  'georgia': {
    cobro: 210,
    tipo: 'Limpieza',
    horas: 3,
    address: '310 Avenue Rd, Yorkville Residence, Toronto, ON',
    accessCode: 'Recepción autoriza acceso a equipo WhiteGlove',
    wifiInfo: 'Red: Yorkville_310 | Pass: Georgia310',
    parkingInfo: 'Estacionamiento subterráneo visitas B1',
    suppliesLocation: 'Closet de blancos frente a baño principal',
    petAndAllergyNotes: 'Cuidado especial con grifería dorada y espejos.',
    specialInstructions: 'Limpieza residencial completa y cambio de ropa de cama en 2 recámaras.',
  },
};

/**
 * Read the client memory dictionary from localStorage
 */
export function getSavedClientMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading client memory from localStorage:', err);
    return {};
  }
}

/**
 * Resolves the Technical Dossier (Ficha Técnica) for a given client/unit
 */
export function getClientDossier(unitName, liveMemory = null) {
  if (!unitName || typeof unitName !== 'string') return null;
  const trimmed = unitName.trim();
  const lower = trimmed.toLowerCase();

  const saved =
    liveMemory && typeof liveMemory === 'object' && Object.keys(liveMemory).length > 0
      ? liveMemory
      : getSavedClientMemory();

  let localData = saved[trimmed] || null;
  if (!localData) {
    const foundKey = Object.keys(saved).find((k) => k.trim().toLowerCase() === lower);
    if (foundKey) localData = saved[foundKey];
  }

  const preset = KNOWN_CLIENT_PRESETS[lower] || {};

  const address = localData?.address ?? preset.address ?? '';
  const accessCode = localData?.accessCode ?? preset.accessCode ?? '';
  const wifiInfo = localData?.wifiInfo ?? preset.wifiInfo ?? '';
  const parkingInfo = localData?.parkingInfo ?? preset.parkingInfo ?? '';
  const suppliesLocation = localData?.suppliesLocation ?? preset.suppliesLocation ?? '';
  const petAndAllergyNotes = localData?.petAndAllergyNotes ?? preset.petAndAllergyNotes ?? '';
  const specialInstructions =
    localData?.specialInstructions ?? localData?.notes ?? preset.specialInstructions ?? '';
  const contactPhone = localData?.contactPhone ?? preset.contactPhone ?? '';
  const updatedBy = localData?.updatedBy || 'Administración WhiteGlove';
  const updatedAt = localData?.updatedAt || null;

  const hasContent = Boolean(
    address ||
      accessCode ||
      wifiInfo ||
      parkingInfo ||
      suppliesLocation ||
      petAndAllergyNotes ||
      specialInstructions
  );

  return {
    unitName: trimmed,
    address,
    accessCode,
    wifiInfo,
    parkingInfo,
    suppliesLocation,
    petAndAllergyNotes,
    specialInstructions,
    contactPhone,
    updatedBy,
    updatedAt,
    hasContent,
  };
}

import { saveSettingToFirestore } from './firebase';

/**
 * Save or update memory for a specific client or unit.
 * Automatically persists to localStorage and Firestore so it is remembered across all devices.
 */
export function saveClientMemory(unitName, data = {}) {
  if (!unitName || typeof unitName !== 'string') return null;
  const trimmed = unitName.trim();
  if (!trimmed) return null;

  try {
    const current = getSavedClientMemory();
    const updated = {
      ...current,
      [trimmed]: {
        ...(current[trimmed] || {}),
        ...data,
        unidad: trimmed,
        updatedAt: new Date().toISOString(),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    saveSettingToFirestore('client_memory', updated).catch(() => {});
    return updated[trimmed];
  } catch (err) {
    console.error('Error saving client memory to localStorage:', err);
    return null;
  }
}

/**
 * Resolves the remembered client information (charge, duration, type, team pay, cleaners)
 * by checking:
 * 1. Saved localStorage memory
 * 2. Historical services (most recent non-cancelled service for this unit with cobro > 0)
 * 3. Standard built-in presets (e.g. Mohammed: 220, Phillys: 180)
 */
export function resolveClientMemory(unitName, services = [], liveMemory = null, schedule = []) {
  if (!unitName || typeof unitName !== 'string') return null;
  const trimmed = unitName.trim();
  const lower = trimmed.toLowerCase();

  // 1. Search in live memory (if passed from React state) or saved localStorage memory
  const saved = (liveMemory && typeof liveMemory === 'object' && Object.keys(liveMemory).length > 0)
    ? liveMemory
    : getSavedClientMemory();

  let localData = saved[trimmed] || null;
  if (!localData) {
    const foundKey = Object.keys(saved).find((k) => k.trim().toLowerCase() === lower);
    if (foundKey) localData = saved[foundKey];
  }

  // 2. Search in services history (most recent non-cancelled service first)
  const unitServices = (services || []).filter(
    (s) => s.unidad && s.unidad.trim().toLowerCase() === lower && s.status !== 'cancelado'
  );
  // Sort descending by date and id so unitServices[0] is strictly the last service performed
  unitServices.sort(
    (a, b) =>
      (b.fecha || '').localeCompare(a.fecha || '') ||
      String(b.id || '').localeCompare(String(a.id || ''))
  );

  const latestService = unitServices[0] || null;
  const recentWithCobro = unitServices.find((s) => s.cobro != null && Number(s.cobro) > 0);
  const totalServices = unitServices.length;

  // Also check schedule history for start time / notes / fallback cleaner
  const unitSchedule = (schedule || []).filter(
    (s) =>
      s.unidad &&
      s.unidad.trim().toLowerCase() === lower &&
      s.status !== 'cancelled' &&
      s.estado !== 'cancelado'
  );
  unitSchedule.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const latestScheduleItem = unitSchedule[0] || null;

  // 3. Built-in presets
  const preset = KNOWN_CLIENT_PRESETS[lower];

  // Prioritize the actual last service performed with the client, then saved memory, then preset
  const cobro =
    latestService?.cobro != null && Number(latestService.cobro) > 0
      ? Number(latestService.cobro)
      : recentWithCobro && Number(recentWithCobro.cobro) > 0
      ? Number(recentWithCobro.cobro)
      : localData?.cobro != null && Number(localData.cobro) > 0
      ? Number(localData.cobro)
      : preset?.cobro || null;

  const tipo =
    latestService?.tipo ||
    localData?.tipo ||
    latestScheduleItem?.tipo ||
    preset?.tipo ||
    'Limpieza';

  const horas =
    latestService?.horas != null && Number(latestService.horas) > 0
      ? Number(latestService.horas)
      : localData?.horas != null && Number(localData.horas) > 0
      ? Number(localData.horas)
      : latestScheduleItem?.horas != null && Number(latestScheduleItem.horas) > 0
      ? Number(latestScheduleItem.horas)
      : preset?.horas || 2;

  const horasPorCleaner =
    (latestService?.horasPorCleaner && Object.keys(latestService.horasPorCleaner).length > 0
      ? latestService.horasPorCleaner
      : null) ||
    (localData?.horasPorCleaner && Object.keys(localData.horasPorCleaner).length > 0
      ? localData.horasPorCleaner
      : null);

  const ratesPorCleaner =
    (latestService?.ratesPorCleaner && Object.keys(latestService.ratesPorCleaner).length > 0
      ? latestService.ratesPorCleaner
      : null) ||
    (localData?.ratesPorCleaner && Object.keys(localData.ratesPorCleaner).length > 0
      ? localData.ratesPorCleaner
      : null);

  const pagosPorCleaner =
    (latestService?.pagosPorCleaner && Object.keys(latestService.pagosPorCleaner).length > 0
      ? latestService.pagosPorCleaner
      : null) ||
    (localData?.pagosPorCleaner && Object.keys(localData.pagosPorCleaner).length > 0
      ? localData.pagosPorCleaner
      : null);

  const pagoCleaner =
    latestService?.pagoCleaner != null && Number(latestService.pagoCleaner) > 0
      ? Number(latestService.pagoCleaner)
      : localData?.pagoCleaner != null && Number(localData.pagoCleaner) > 0
      ? Number(localData.pagoCleaner)
      : null;

  const pagoCleaningTeam =
    latestService?.pagoCleaningTeam != null
      ? Number(latestService.pagoCleaningTeam)
      : localData?.pagoCleaningTeam != null
      ? Number(localData.pagoCleaningTeam)
      : 0;

  const cleaners =
    latestService?.cleaners && latestService.cleaners.length > 0
      ? latestService.cleaners
      : latestService?.cleaner
      ? [latestService.cleaner]
      : localData?.cleaners && localData.cleaners.length > 0
      ? localData.cleaners
      : recentWithCobro?.cleaners && recentWithCobro.cleaners.length > 0
      ? recentWithCobro.cleaners
      : recentWithCobro?.cleaner
      ? [recentWithCobro.cleaner]
      : latestScheduleItem?.cleaners && latestScheduleItem.cleaners.length > 0
      ? latestScheduleItem.cleaners
      : latestScheduleItem?.cleaner
      ? [latestScheduleItem.cleaner]
      : [];

  const hora =
    latestService?.hora ||
    latestScheduleItem?.hora ||
    localData?.hora ||
    '09:00';

  const rawNotes = latestScheduleItem?.notas || localData?.notes || localData?.notas || '';
  const cleanNotes = String(rawNotes).replace(/^\[Duración:[^\]]+\]\s*/i, '').trim();

  const isRecurring = totalServices >= 1 || !!localData || !!preset || unitSchedule.length >= 1;

  return {
    unitName: trimmed,
    cobro: cobro != null ? Number(cobro) : null,
    tipo,
    horas: Number(horas) || 2,
    horasPorCleaner,
    ratesPorCleaner,
    pagosPorCleaner,
    pagoCleaner,
    pagoCleaningTeam: Number(pagoCleaningTeam) || 0,
    cleaners,
    cleaner: cleaners[0] || null,
    hora,
    notes: cleanNotes,
    totalServices,
    isRecurring,
    lastService: latestService || null,
    lastServiceDate: latestService?.fecha || recentWithCobro?.fecha || latestScheduleItem?.fecha || null,
    source: latestService
      ? 'Último Servicio'
      : localData?.cobro
      ? 'Memoria Guardada'
      : preset
      ? 'Tarifa Predefinida'
      : null,
  };
}

/**
 * Get map of all client recurrence counts and latest charges from services history
 */
export function getRecurringClientsSummary(services = []) {
  const summary = {};
  const saved = getSavedClientMemory();

  (services || []).forEach((s) => {
    if (!s.unidad || s.status === 'cancelado') return;
    const name = s.unidad.trim();
    if (!summary[name]) {
      summary[name] = {
        name,
        count: 0,
        latestCobro: null,
        latestDate: null,
      };
    }
    summary[name].count += 1;
    if (s.cobro != null && Number(s.cobro) > 0 && !summary[name].latestCobro) {
      summary[name].latestCobro = Number(s.cobro);
      summary[name].latestDate = s.fecha;
    }
  });

  // Merge with localStorage overrides
  Object.keys(saved).forEach((name) => {
    if (!summary[name]) {
      summary[name] = {
        name,
        count: 1,
        latestCobro: Number(saved[name].cobro) || null,
        latestDate: null,
      };
    } else if (saved[name].cobro != null) {
      summary[name].latestCobro = Number(saved[name].cobro);
    }
  });

  return summary;
}
