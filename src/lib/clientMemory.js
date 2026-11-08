// Client Memory and Auto-fill management for recurring clients
const STORAGE_KEY = 'wg_client_memory';

// Default presets for high-frequency or newly added clients
const KNOWN_CLIENT_PRESETS = {
  'mohammed': { cobro: 220, tipo: 'Limpieza', horas: 3 },
  'phillys': { cobro: 180, tipo: 'Limpieza', horas: 2.5 },
  'phillis': { cobro: 180, tipo: 'Limpieza', horas: 2.5 },
  'chand': { cobro: 185, tipo: 'Limpieza', horas: 2.5 },
  'rohan unit a': { cobro: 195, tipo: 'Limpieza', horas: 2 },
  'rohan unit b': { cobro: 195, tipo: 'Limpieza', horas: 2 },
  'ocean villa 4': { cobro: 240, tipo: 'Limpieza', horas: 3 },
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
    lastService,
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
