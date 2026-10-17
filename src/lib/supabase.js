import { createClient } from '@supabase/supabase-js';

// Base credentials with environment variable override
const RAW_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://mijeqjelqxdyrdfysndb.supabase.co').trim();
export const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pamVxamVscXhkeXJkZnlzbmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODk3ODEsImV4cCI6MjEwNTA2NTc4MX0.-uDDOD8Z8XxTYY3H8W4woGHHxq-mu2kiPGcFIXrHsA4').trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export const BASE_UNITS = [
  'Mohammed', 'Phillys',
  'Rohan Unit A', 'Rohan Unit B', 'Rohan Unit C', 'Alexei', 'Larisse N',
  'Anine Bing YV', 'Anine Bing YD', 'Mandy D', 'Saadman', 'Mayeesha',
  'Max - Hamilton', 'Veradek', 'Abi', 'KENNY SPADINA', 'Georgia Ancaster'
];

export const BASE_CLEANERS = ['Jazz', 'Karen', 'Kary', 'Ruben', 'Mafer', 'Maria', 'Nancy', 'Mariana'];

export const TYPES = ['Limpieza', 'Extra Task'];

export const DEFAULT_RATES = {
  'Limpieza':   { mode: 'hourly', amount: 18 },
  'Extra Task': { mode: 'hourly', amount: 25 },
};

export const UNIT_STOCK_TEMPLATE = [
  { cat: 'Químicos',     prod: 'Multiusos',              unit: 'botellas', qty: 2, min: 1 },
  { cat: 'Químicos',     prod: 'Desinfectante baños',    unit: 'botellas', qty: 1, min: 1 },
  { cat: 'Químicos',     prod: 'Limpiavidrios',          unit: 'botellas', qty: 1, min: 1 },
  { cat: 'Químicos',     prod: 'Cloro',                  unit: 'litros',   qty: 1, min: 1 },
  { cat: 'Consumibles',  prod: 'Papel higiénico',        unit: 'rollos',   qty: 4, min: 2 },
  { cat: 'Consumibles',  prod: 'Papel de cocina',        unit: 'rollos',   qty: 2, min: 1 },
  { cat: 'Consumibles',  prod: 'Bolsas basura chicas',   unit: 'paquetes', qty: 1, min: 1 },
  { cat: 'Consumibles',  prod: 'Bolsas basura grandes',  unit: 'paquetes', qty: 1, min: 1 },
  { cat: 'Blancos',      prod: 'Toallas de manos',       unit: 'piezas',   qty: 2, min: 2 },
  { cat: 'Blancos',      prod: 'Trapos microfibra',      unit: 'piezas',   qty: 3, min: 2 },
  { cat: 'Herramientas', prod: 'Esponjas',               unit: 'piezas',   qty: 2, min: 1 },
  { cat: 'Herramientas', prod: 'Guantes',                unit: 'pares',    qty: 2, min: 1 },
];

export const INITIAL_STOCK_STORAGE = [
  { id: 1,  cat: 'Químicos',    prod: 'Multiusos (galón)',       unit: 'galones', qty: 2,  min: 1 },
  { id: 2,  cat: 'Químicos',    prod: 'Desinfectante (galón)',   unit: 'galones', qty: 1,  min: 1 },
  { id: 3,  cat: 'Químicos',    prod: 'Cloro (galón)',           unit: 'galones', qty: 2,  min: 1 },
  { id: 4,  cat: 'Consumibles', prod: 'Papel higiénico (caja)',  unit: 'cajas',   qty: 1,  min: 1 },
  { id: 5,  cat: 'Consumibles', prod: 'Papel de cocina (caja)',  unit: 'cajas',   qty: 1,  min: 1 },
  { id: 6,  cat: 'Consumibles', prod: 'Bolsas basura (caja)',    unit: 'cajas',   qty: 2,  min: 1 },
  { id: 7,  cat: 'Blancos',     prod: 'Toallas manos (paquete)', unit: 'paquetes',qty: 2,  min: 1 },
  { id: 8,  cat: 'Blancos',     prod: 'Trapos microfibra (pack)',unit: 'paquetes',qty: 3,  min: 1 },
  { id: 9,  cat: 'Herramientas',prod: 'Guantes (caja)',          unit: 'cajas',   qty: 2,  min: 1 },
  { id: 10, cat: 'Herramientas',prod: 'Esponjas (paquete)',      unit: 'paquetes',qty: 2,  min: 1 },
];

export const svcFromDb = (r) => {
  const capt = r.capturista || '';
  const isCancelled = capt.startsWith('[CANCELADO]') || r.tipo === 'Cancelado' || (r.tipo || '').includes('(Cancelado)');
  const cleanCapt = capt.replace(/^\[CANCELADO\]\s*/, '').trim();

  return {
    id: Number(r.id),
    fecha: r.fecha,
    unidad: r.unidad,
    cleaners: r.cleaners || [],
    cleaner: (r.cleaners || [])[0] || '',
    horas: Number(r.horas),
    tipo: isCancelled && r.tipo === 'Cancelado' ? 'Limpieza' : (r.tipo || 'Limpieza'),
    cobro: r.cobro !== null && r.cobro !== undefined ? Number(r.cobro) : null,
    pagoCleaner: r.pago_cleaner !== null && r.pago_cleaner !== undefined ? Number(r.pago_cleaner) : null,
    pagosPorCleaner: r.pagos_por_cleaner || null,
    ratesPorCleaner: r.rates_por_cleaner || null,
    pagoCleaningTeam: r.pago_cleaning_team !== null && r.pago_cleaning_team !== undefined ? Number(r.pago_cleaning_team) : null,
    tip: r.tip !== null && r.tip !== undefined ? Number(r.tip) : null,
    capturista: cleanCapt,
    status: isCancelled ? 'cancelado' : 'activo',
  };
};

export const svcToDb = (s) => {
  let capt = (s.capturista || '').replace(/^\[CANCELADO\]\s*/, '').trim();
  if (s.status === 'cancelado') {
    capt = `[CANCELADO] ${capt}`.trim();
  }

  return {
    id: s.id,
    fecha: s.fecha,
    unidad: s.unidad,
    cleaners: s.cleaners && s.cleaners.length ? s.cleaners : (s.cleaner ? [s.cleaner] : []),
    horas: Number(s.horas),
    tipo: s.tipo,
    cobro: s.cobro != null ? Number(s.cobro) : null,
    pago_cleaner: s.pagoCleaner != null ? Number(s.pagoCleaner) : null,
    pagos_por_cleaner: s.pagosPorCleaner || null,
    rates_por_cleaner: s.ratesPorCleaner || null,
    pago_cleaning_team: s.pagoCleaningTeam != null ? Number(s.pagoCleaningTeam) : null,
    tip: s.tip != null ? Number(s.tip) : null,
    capturista: capt || null,
  };
};

export const stockUnitFromDb = (r) => ({
  id: r.id, cat: r.categoria, prod: r.producto, unit: r.unidad_medida,
  qty: Number(r.qty), min: Number(r.min_qty),
});

export const stockStorageFromDb = (r) => ({
  id: Number(r.id), cat: r.categoria, prod: r.producto, unit: r.unidad_medida,
  qty: Number(r.qty), min: Number(r.min_qty),
});

export async function fetchAllServices() {
  try {
    const { data, error } = await supabase.from('services').select('*').order('fecha', { ascending: false });
    if (error) { console.error('fetch services', error); return []; }
    return (data || []).map(svcFromDb);
  } catch (err) {
    console.error('fetch services err', err);
    return [];
  }
}

export async function fetchStockByUnit(unitsList, template) {
  try {
    const { data, error } = await supabase.from('stock_by_unit').select('*');
    if (error) { console.error('fetch stock_by_unit', error); return null; }
    if (!data || data.length === 0) return null;
    const grouped = {};
    for (const row of data) {
      if (!grouped[row.unidad]) grouped[row.unidad] = [];
      grouped[row.unidad].push(stockUnitFromDb(row));
    }
    for (const u of unitsList) {
      if (!grouped[u]) grouped[u] = template.map((it, i) => ({ ...it, id: `${u}-${i}` }));
    }
    return grouped;
  } catch (err) {
    console.error('fetchStockByUnit err', err);
    return null;
  }
}

export async function fetchStockStorage() {
  try {
    const { data, error } = await supabase.from('stock_storage').select('*');
    if (error) { console.error('fetch stock_storage', error); return null; }
    if (!data || data.length === 0) return null;
    return data.map(stockStorageFromDb);
  } catch (err) {
    console.error('fetchStockStorage err', err);
    return null;
  }
}

export async function seedStockByUnit(unitsList, template) {
  try {
    const rows = [];
    for (const unidad of unitsList) {
      template.forEach((item, i) => {
        rows.push({
          id: `${unidad}-${i}`, unidad,
          categoria: item.cat, producto: item.prod, unidad_medida: item.unit,
          qty: item.qty, min_qty: item.min,
        });
      });
    }
    const { error } = await supabase.from('stock_by_unit').upsert(rows, { onConflict: 'id' });
    if (error) console.error('seed stock_by_unit', error);
  } catch (err) {
    console.error('seedStockByUnit err', err);
  }
}

export async function seedStockStorage(items) {
  try {
    const rows = items.map((item) => ({
      id: item.id, categoria: item.cat, producto: item.prod,
      unidad_medida: item.unit, qty: item.qty, min_qty: item.min,
    }));
    const { error } = await supabase.from('stock_storage').upsert(rows, { onConflict: 'id' });
    if (error) console.error('seed stock_storage', error);
  } catch (err) {
    console.error('seedStockStorage err', err);
  }
}

export async function fetchRates() {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('key', 'rates').maybeSingle();
    if (error) { console.error('fetch rates', error); return DEFAULT_RATES; }
    return data?.value || DEFAULT_RATES;
  } catch (err) {
    console.error('fetchRates err', err);
    return DEFAULT_RATES;
  }
}

export async function saveRates(rates) {
  try {
    const { error } = await supabase.from('settings').upsert({ key: 'rates', value: rates, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) console.error('save rates', error);
  } catch (err) {
    console.error('saveRates err', err);
  }
}

export async function fetchExtraClients() {
  try {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) { console.error('fetch clients', error); return []; }
    return (data || []).map((r) => r.name);
  } catch (err) {
    console.error('fetchExtraClients err', err);
    return [];
  }
}

export async function addClientToDb(clientInput) {
  const name = typeof clientInput === 'string' ? clientInput.trim() : (clientInput?.name || '').trim();
  if (!name) return;
  const { error } = await supabase.from('clients').insert({ name });
  if (error && error.code !== '23505') {
    console.error('addClientToDb error:', error);
  }
  try {
    const rows = UNIT_STOCK_TEMPLATE.map((item, i) => ({
      id: `${name}-${i}`, unidad: name,
      categoria: item.cat, producto: item.prod, unidad_medida: item.unit,
      qty: item.qty, min_qty: item.min,
    }));
    await supabase.from('stock_by_unit').upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.error('stock_by_unit upsert error:', e);
  }
  return name;
}

export async function fetchCleanersDb() {
  try {
    const { data, error } = await supabase.from('cleaners_db').select('*').order('name');
    if (error) { console.error('fetch cleaners_db', error); return []; }
    return data || [];
  } catch (err) {
    console.error('fetchCleanersDb err', err);
    return [];
  }
}

export async function addCleanerToDb(name, password) {
  const { error } = await supabase.from('cleaners_db').insert({ name, password });
  if (error) throw error;
}

export const scheduleFromDb = (r) => {
  const cleaners = Array.isArray(r.cleaners) ? r.cleaners : (r.cleaner ? [r.cleaner] : []);
  const cleaner = cleaners[0] || r.cleaner || '';
  const estado = r.estado || 'programado';
  const status = estado === 'completado' ? 'completed' : 'pending';

  let horas = 2;
  const match = (r.notas || '').match(/\[Duración:\s*(\d+)h(?:\s*(\d+)m)?\]/i);
  if (match) {
    const h = parseInt(match[1], 10) || 0;
    const m = parseInt(match[2], 10) || 0;
    horas = parseFloat((h + m / 60).toFixed(2));
  } else if (r.horas) {
    horas = Number(r.horas);
  }

  return {
    ...r,
    id: Number(r.id),
    cleaners,
    cleaner,
    estado,
    status,
    horas,
  };
};

export const scheduleToDb = (entry) => {
  const cleaners = Array.isArray(entry.cleaners) && entry.cleaners.length
    ? entry.cleaners
    : (entry.cleaner ? [entry.cleaner] : []);

  let estado = entry.estado;
  if (!estado && entry.status) {
    estado = entry.status === 'completed' ? 'completado' : 'programado';
  }
  if (!estado) estado = 'programado';

  return {
    fecha: entry.fecha,
    hora: entry.hora || null,
    unidad: entry.unidad,
    cleaners,
    tipo: entry.tipo || 'Limpieza',
    notas: entry.notas || null,
    estado,
  };
};

export async function fetchSchedule() {
  try {
    const { data, error } = await supabase.from('schedule').select('*').order('fecha').order('hora');
    if (error) { console.error('fetch schedule', error); return []; }
    return (data || []).map(scheduleFromDb);
  } catch (err) {
    console.error('fetchSchedule err', err);
    return [];
  }
}

export async function addScheduleToDb(entry) {
  const dbPayload = scheduleToDb(entry);
  const { data, error } = await supabase.from('schedule').insert(dbPayload).select().single();
  if (error) throw error;
  return scheduleFromDb(data);
}

export async function updateScheduleInDb(id, patch) {
  const dbPatch = {};
  if (patch.fecha !== undefined) dbPatch.fecha = patch.fecha;
  if (patch.hora !== undefined) dbPatch.hora = patch.hora;
  if (patch.unidad !== undefined) dbPatch.unidad = patch.unidad;
  if (patch.cleaners !== undefined) dbPatch.cleaners = patch.cleaners;
  else if (patch.cleaner !== undefined) dbPatch.cleaners = [patch.cleaner];
  if (patch.tipo !== undefined) dbPatch.tipo = patch.tipo;
  if (patch.notas !== undefined) dbPatch.notas = patch.notas;
  if (patch.estado !== undefined) {
    dbPatch.estado = patch.estado;
  } else if (patch.status !== undefined) {
    dbPatch.estado = patch.status === 'completed' ? 'completado' : 'programado';
  }
  const { error } = await supabase.from('schedule').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteScheduleFromDb(id) {
  const { error } = await supabase.from('schedule').delete().eq('id', id);
  if (error) throw error;
}

export async function logAction(entry) {
  try {
    const { error } = await supabase.from('audit_log').insert(entry);
    if (error) console.error('audit log', error);
  } catch (e) {
    console.error('logAction err', e);
  }
}
