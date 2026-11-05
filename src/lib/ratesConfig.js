// Dynamic Hourly Rates Engine for Clients and Cleaners (Cloud Firestore + LocalStorage synced)
import { saveSettingToFirestore } from './firebase';

const RATES_CONFIG_STORAGE_KEY = 'wg_rates_config';

// Default pre-configured rates matching administrative rules
export const DEFAULT_RATES_CONFIG = {
  // Base hourly pay rate ($/hr) per cleaner when no client-specific override exists
  cleanerBaseRates: {
    'Mafer': 20,
    'Maria': 20,
    'Jazz': 18,
    'Amalia': 18,
    'Yuliana': 18,
    'Karen': 18,
    'Kary': 18,
    'Ruben': 18,
    'Nancy': 18,
    'Mariana': 18,
  },

  // Specific cleaner + client hourly pay overrides ($/hr)
  cleanerClientRules: [
    {
      id: 'mafer__georgia_ancaster',
      cleaner: 'Mafer',
      client: 'Georgia Ancaster',
      rate: 23.5,
      notes: 'Tarifa especial Mafer con Georgia ($23.50/hr)',
    },
    {
      id: 'mafer__max_hamilton',
      cleaner: 'Mafer',
      client: 'Max - Hamilton',
      rate: 20,
      notes: 'Tarifa Mafer con Max ($20.00/hr)',
    },
  ],

  // Client hourly charge rates ($/hr billed to client)
  clientHourlyRates: {
    'Rohan Unit A': 40,
    'Rohan Unit B': 40,
    'Rohan Unit C': 40,
    'Rohan': 40,
    'Mafer': 29,
  },
};

export function normalizeCleanerName(name) {
  if (!name) return '';
  const raw = String(name).trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeStr(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase();
}

/**
 * Load current rates configuration from localStorage, merged with defaults
 */
export function getSavedRatesConfig() {
  try {
    const raw = localStorage.getItem(RATES_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_RATES_CONFIG;
    const parsed = JSON.parse(raw);
    return mergeRatesConfig(parsed);
  } catch (err) {
    console.warn('Error reading rates config:', err);
    return DEFAULT_RATES_CONFIG;
  }
}

/**
 * Merge cloud or saved config with defaults so required structures always exist
 */
export function mergeRatesConfig(incoming) {
  if (!incoming || typeof incoming !== 'object') return DEFAULT_RATES_CONFIG;

  const cleanerBaseRates = {
    ...DEFAULT_RATES_CONFIG.cleanerBaseRates,
    ...(incoming.cleanerBaseRates || {}),
  };

  const clientHourlyRates = {
    ...DEFAULT_RATES_CONFIG.clientHourlyRates,
    ...(incoming.clientHourlyRates || {}),
  };

  const cleanerClientRules = Array.isArray(incoming.cleanerClientRules)
    ? incoming.cleanerClientRules
    : DEFAULT_RATES_CONFIG.cleanerClientRules;

  return {
    cleanerBaseRates,
    cleanerClientRules,
    clientHourlyRates,
    updatedAt: incoming.updatedAt || null,
  };
}

/**
 * Save updated rates configuration to localStorage and Cloud Firestore
 */
export function saveRatesConfig(newConfig) {
  const merged = {
    ...mergeRatesConfig(newConfig),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(RATES_CONFIG_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Could not save rates config to localStorage:', err);
  }
  saveSettingToFirestore('rates_config', merged).catch((err) => {
    console.warn('Could not sync rates_config to Firestore:', err);
  });
  return merged;
}

/**
 * Resolve the hourly pay rate ($/hr) as a number for a given cleaner working at a given client/unit.
 * Priority:
 * 1. Exact or partial Cleaner + Client rule (e.g. Mafer + Georgia Ancaster = 23.50, Mafer + Max - Hamilton = 20)
 * 2. Cleaner base rate (e.g. Mafer = 20, Maria = 20)
 * 3. Fallback service rate (default 20)
 */
export function resolveCleanerHourlyRate(cleanerName, unitName, ratesConfig = null, fallbackServiceRate = 20) {
  const cfg = ratesConfig ? mergeRatesConfig(ratesConfig) : getSavedRatesConfig();
  const cNorm = normalizeStr(cleanerName);
  const uNorm = normalizeStr(unitName);

  if (!cNorm) {
    return Number(fallbackServiceRate) || 20;
  }

  // 1. Check specific Cleaner + Client rules (exact match first, then partial token match like "Georgia" or "Max")
  if (uNorm && Array.isArray(cfg.cleanerClientRules)) {
    const exactRule = cfg.cleanerClientRules.find(
      (r) => normalizeStr(r.cleaner) === cNorm && normalizeStr(r.client) === uNorm
    );
    if (exactRule && exactRule.rate != null && !Number.isNaN(Number(exactRule.rate))) {
      return Number(exactRule.rate);
    }

    const partialRule = cfg.cleanerClientRules.find((r) => {
      if (normalizeStr(r.cleaner) !== cNorm) return false;
      const ruleClientNorm = normalizeStr(r.client);
      if (!ruleClientNorm) return false;
      return uNorm.includes(ruleClientNorm) || ruleClientNorm.includes(uNorm);
    });
    if (partialRule && partialRule.rate != null && !Number.isNaN(Number(partialRule.rate))) {
      return Number(partialRule.rate);
    }
  }

  // 2. Check Cleaner's base hourly rate (case-insensitive)
  if (cfg.cleanerBaseRates) {
    const baseKey = Object.keys(cfg.cleanerBaseRates).find((k) => normalizeStr(k) === cNorm);
    if (baseKey && cfg.cleanerBaseRates[baseKey] != null && !Number.isNaN(Number(cfg.cleanerBaseRates[baseKey]))) {
      return Number(cfg.cleanerBaseRates[baseKey]);
    }
  }

  // 3. Fallback to service type rate
  return Number(fallbackServiceRate) || 20;
}

/**
 * Resolve the hourly charge rate ($/hr) billed to a given client/unit as a number (or null if none configured).
 * E.g. Rohan = 40, Mafer = 29
 */
export function resolveClientHourlyRate(unitName, ratesConfig = null) {
  const cfg = ratesConfig ? mergeRatesConfig(ratesConfig) : getSavedRatesConfig();
  const uNorm = normalizeStr(unitName);
  if (!uNorm || !cfg.clientHourlyRates) {
    return null;
  }

  // 1. Exact match (case-insensitive)
  const exactKey = Object.keys(cfg.clientHourlyRates).find((k) => normalizeStr(k) === uNorm);
  if (exactKey && cfg.clientHourlyRates[exactKey] != null && Number(cfg.clientHourlyRates[exactKey]) > 0) {
    return Number(cfg.clientHourlyRates[exactKey]);
  }

  // 2. Prefix / partial match (e.g. "Rohan" matches "Rohan Unit A")
  const partialKey = Object.keys(cfg.clientHourlyRates).find((k) => {
    const kNorm = normalizeStr(k);
    if (!kNorm) return false;
    return uNorm.startsWith(kNorm) || kNorm.startsWith(uNorm);
  });
  if (partialKey && cfg.clientHourlyRates[partialKey] != null && Number(cfg.clientHourlyRates[partialKey]) > 0) {
    return Number(cfg.clientHourlyRates[partialKey]);
  }

  return null;
}
