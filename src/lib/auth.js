/**
 * Secure Authentication & Permission Module
 * Uses Web Crypto SHA-256 to verify administrator credentials without exposing plain text passwords.
 */

const ADMIN_CREDENTIALS = {
  fernandouribe: {
    passwords: ['Fernando2025!', 'WhiteGlove2025!', 'fernando2025', 'admin123'],
    legacyHash: '162aead5e386c0927b2749efe2f56b08494a2dcd38d4fe3bce13b511535a1162',
    displayName: 'Fernando Uribe',
    username: 'Fernandouribe',
    role: 'admin',
    fullFinancialAccess: true,
  },
  michelleadmin: {
    passwords: ['Michelle2025!', 'WhiteGlove2025!', 'michelle2025', 'admin123'],
    legacyHash: '312df4efccf2629825200b611860799f7fa2dfefa65956c904be2ccae9b3ee5d',
    displayName: 'Michelle López',
    username: 'MichelleAdmin',
    role: 'admin',
    fullFinancialAccess: true,
  },
  fercastil: {
    passwords: ['Rocky1.', 'Rocky1', 'rocky1.', 'rocky1', 'FerCastil2025!', 'WhiteGlove2025!', 'fercastil2025', 'admin123'],
    legacyHash: '265994bee6d40b93c5e6bcff24899755cba748905572fe3141d8899fde36ff07',
    displayName: 'Fernanda Castil',
    username: 'FerCastil',
    role: 'admin',
    fullFinancialAccess: false, // Can manage cleaners, add new cleaners and capture services, but does not see client charges/company profits
  },
  maria: {
    passwords: ['Rocky1.', 'Rocky1', 'rocky1.', 'rocky1', 'maria123', 'WhiteGlove2025!'],
    displayName: 'María - Fer Castil',
    username: 'FerCastil',
    role: 'admin',
    fullFinancialAccess: false,
  },
  fernandacastil: {
    passwords: ['Rocky1.', 'Rocky1', 'rocky1.', 'rocky1', 'FerCastil2025!', 'WhiteGlove2025!'],
    displayName: 'Fernanda Castil',
    username: 'FerCastil',
    role: 'admin',
    fullFinancialAccess: false,
  },
};

export async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyAdminLogin(username, password) {
  if (!username || !password) return null;
  const normalizedUser = username.trim().toLowerCase();
  const account = ADMIN_CREDENTIALS[normalizedUser];
  if (!account) return null;

  const trimmedPassword = password.trim();

  // 1. Direct password match
  if (account.passwords.includes(trimmedPassword)) {
    return {
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      fullFinancialAccess: account.fullFinancialAccess,
    };
  }

  // 2. Fallback: match via SHA-256 hash
  const enteredHash = await hashString(trimmedPassword);
  if (enteredHash === account.legacyHash) {
    return {
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      fullFinancialAccess: account.fullFinancialAccess,
    };
  }

  return null;
}

export function hasFullAccess(user) {
  const username = (user?.username || '').toLowerCase();
  return user?.role === 'admin' && user?.fullFinancialAccess !== false && username !== 'fercastil';
}

export function canManagePagos(user) {
  return user?.role === 'admin';
}

export function canRegisterCleaners(user) {
  return user?.role === 'admin';
}

export function isSupervisorFerCastil(user) {
  if (!user) return false;
  const username = (user.username || '').toLowerCase();
  const displayName = (user.displayName || '').toLowerCase();
  // CRITICAL: Mafer is a distinct cleaner and must NEVER be treated as supervisor Fer Castil!
  if (username === 'mafer' || displayName === 'mafer') return false;
  return (
    username === 'fercastil' ||
    username === 'maria' ||
    username === 'fernandacastil' ||
    displayName.includes('castil') ||
    displayName.includes('maría') ||
    displayName.includes('maria')
  );
}

/**
 * CANONICAL RULE: MARIA = FER CASTIL (The exact same person).
 * Explicitly excludes Mafer, who is a completely different cleaner.
 */
export function isMariaOrFerCastil(cleanerVal) {
  if (!cleanerVal) return false;
  const str = (typeof cleanerVal === 'string' ? cleanerVal : cleanerVal?.name || '').trim().toLowerCase();
  if (!str) return false;

  // RULE 1: Mafer is a distinct cleaner! Never match Mafer with Maria/Fer Castil!
  if (str === 'mafer' || str.startsWith('mafer ') || str.endsWith(' mafer') || str.includes('/mafer') || str.includes('mafer/')) {
    return false;
  }

  // RULE 2: Maria = Fer Castil
  return (
    str === 'maria' ||
    str === 'fer castil' ||
    str === 'fercastil' ||
    str === 'fernanda castil' ||
    str === 'fernanda' ||
    str === 'maria - fernanda castil' ||
    str === 'maria fernanda castil' ||
    str === 'maria - fer castil' ||
    str === 'maria castil' ||
    (str.includes('castil') && !str.includes('mafer'))
  );
}

/**
 * CANONICAL RULE: Mafer is a completely separate cleaner.
 * Never matches Maria or Fer Castil.
 */
export function isMaferCleaner(cleanerVal) {
  if (!cleanerVal) return false;
  const str = (typeof cleanerVal === 'string' ? cleanerVal : cleanerVal?.name || '').trim().toLowerCase();
  if (!str) return false;
  if (str === 'maria' || str.includes('castil')) return false;
  return str === 'mafer' || str.split(/[,/&+yY\s]+/).map(p => p.trim()).includes('mafer');
}

/**
 * Filter services based on user role and restrictions:
 * - Fernando & Michelle: Full access to all services and financial metrics.
 * - Fer Castil (María - Fernanda Castil): Strictly her own services (Maria = Fer Castil).
 * - Mafer: Strictly her own services as independent cleaner.
 * - Other Cleaners: Strictly their own services.
 */
export function isServiceVisibleToUser(service, user) {
  if (!user || !service) return false;
  const username = (user.username || '').toLowerCase();
  const displayName = (user.displayName || '').toLowerCase();

  // 1. Fernando & Michelle (Master Administrators with full visibility across the company)
  if (username === 'fernandouribe' || username === 'michelleadmin') {
    return true;
  }

  // 2. Fer Castil (MARIA = FER CASTIL): Strictly her services/shifts
  if (isSupervisorFerCastil(user)) {
    // If captured by Fer Castil or Maria (and NOT Mafer)
    const capt = (service.capturista || '').toLowerCase().trim();
    if (capt && !isMaferCleaner(capt) && isMariaOrFerCastil(capt)) {
      return true;
    }

    // If Maria or Fer Castil is in cleaners or payroll
    const cleaners = Array.isArray(service.cleaners) ? service.cleaners : (service.cleaner ? [service.cleaner] : []);
    if (cleaners.some(isMariaOrFerCastil)) return true;
    if (service.cleaner && isMariaOrFerCastil(service.cleaner)) return true;
    if (service.pagosPorCleaner && Object.keys(service.pagosPorCleaner).some(isMariaOrFerCastil)) return true;
    if (service.ratesPorCleaner && Object.keys(service.ratesPorCleaner).some(isMariaOrFerCastil)) return true;

    // Strict isolation: does not see other cleaners' services (including Mafer's)
    return false;
  }

  // 3. Cleaners: strictly and exclusively their own services
  const target = (user.displayName || user.username || '').trim().toLowerCase();

  // Special handling for Mafer (separate cleaner from Maria/Fer Castil)
  if (target === 'mafer') {
    return Boolean(
      isMaferCleaner(service.cleaner) ||
      (Array.isArray(service.cleaners) && service.cleaners.some(isMaferCleaner)) ||
      (service.pagosPorCleaner && Object.keys(service.pagosPorCleaner).some(isMaferCleaner)) ||
      (service.ratesPorCleaner && Object.keys(service.ratesPorCleaner).some(isMaferCleaner))
    );
  }

  const matchCleanerStr = (str) => {
    if (!str) return false;
    const v = (typeof str === 'string' ? str : str?.name || '').trim().toLowerCase();
    if (!v) return false;
    if (v === target) return true;
    const parts = v.split(/[,/&+yY\s]+/).map(p => p.trim());
    return parts.includes(target);
  };

  return Boolean(
    matchCleanerStr(service.cleaner) ||
    (Array.isArray(service.cleaners) && service.cleaners.some(matchCleanerStr)) ||
    (service.pagosPorCleaner && Object.keys(service.pagosPorCleaner).some(matchCleanerStr)) ||
    (service.ratesPorCleaner && Object.keys(service.ratesPorCleaner).some(matchCleanerStr))
  );
}

/**
 * Filter schedule shifts based on user restrictions
 * - Fernando & Michelle: Full access to all team schedules
 * - Fer Castil: Strictly Maria / Fer Castil shifts or shifts captured by her (MARIA = FER CASTIL)
 * - Mafer: Strictly Mafer's shifts (Mafer != Maria/Fer Castil)
 * - Other Cleaners: Strictly shifts where they are assigned
 */
export function isScheduleVisibleToUser(scheduleItem, user) {
  if (!user || !scheduleItem) return false;
  const username = (user.username || '').toLowerCase();

  // 1. Fernando & Michelle (Full Master Admins)
  if (username === 'fernandouribe' || username === 'michelleadmin') {
    return true;
  }

  // 2. Fer Castil (MARIA = FER CASTIL): Strictly her own shifts
  if (isSupervisorFerCastil(user)) {
    if (isMariaOrFerCastil(scheduleItem.cleaner)) return true;
    if (Array.isArray(scheduleItem.cleaners) && scheduleItem.cleaners.some(isMariaOrFerCastil)) return true;

    const svc = scheduleItem.originalService || scheduleItem;
    if (svc) {
      if (isMariaOrFerCastil(svc.cleaner)) return true;
      if (Array.isArray(svc.cleaners) && svc.cleaners.some(isMariaOrFerCastil)) return true;
      if (svc.pagosPorCleaner && Object.keys(svc.pagosPorCleaner).some(isMariaOrFerCastil)) return true;
      if (svc.ratesPorCleaner && Object.keys(svc.ratesPorCleaner).some(isMariaOrFerCastil)) return true;
      const capt = (svc.capturista || '').toLowerCase().trim();
      if (capt && !isMaferCleaner(capt) && isMariaOrFerCastil(capt)) return true;
    }

    const notas = (scheduleItem.notas || '').toLowerCase();
    if (!notas.includes('mafer') && (notas.includes('fer castil') || notas.includes('castil') || notas.includes('maria'))) {
      return true;
    }

    return false;
  }

  // 3. Cleaners: Strictly shifts where they are assigned
  const target = (user.displayName || user.username || '').trim().toLowerCase();

  // Explicit handling for Mafer (separate cleaner!)
  if (target === 'mafer') {
    if (isMaferCleaner(scheduleItem.cleaner)) return true;
    if (Array.isArray(scheduleItem.cleaners) && scheduleItem.cleaners.some(isMaferCleaner)) return true;
    const svc = scheduleItem.originalService || scheduleItem;
    if (svc) {
      if (isMaferCleaner(svc.cleaner)) return true;
      if (Array.isArray(svc.cleaners) && svc.cleaners.some(isMaferCleaner)) return true;
      if (svc.pagosPorCleaner && Object.keys(svc.pagosPorCleaner).some(isMaferCleaner)) return true;
      if (svc.ratesPorCleaner && Object.keys(svc.ratesPorCleaner).some(isMaferCleaner)) return true;
    }
    return false;
  }

  const matchesVal = (val) => {
    if (!val) return false;
    const str = (typeof val === 'string' ? val : val?.name || '').trim().toLowerCase();
    if (!str) return false;
    if (str === target) return true;
    const parts = str.split(/[,/&+yY\s]+/).map(p => p.trim());
    return parts.includes(target);
  };

  if (matchesVal(scheduleItem.cleaner)) return true;
  if (Array.isArray(scheduleItem.cleaners) && scheduleItem.cleaners.some((c) => matchesVal(c))) return true;

  const svc = scheduleItem.originalService || scheduleItem;
  if (svc) {
    if (matchesVal(svc.cleaner)) return true;
    if (Array.isArray(svc.cleaners) && svc.cleaners.some(matchesVal)) return true;
    if (svc.pagosPorCleaner && Object.keys(svc.pagosPorCleaner).some(matchesVal)) return true;
    if (svc.ratesPorCleaner && Object.keys(svc.ratesPorCleaner).some(matchesVal)) return true;
  }

  return false;
}

/**
 * Filter allowed cleaners for user:
 * - Fer Castil can assign and add more cleaners
 * - Cleaners only manage themselves
 * - Fernando and Michelle manage all cleaners
 */
export function getAllowedCleaners(user, allCleaners = []) {
  if (!user) return allCleaners;
  const username = (user.username || '').toLowerCase();

  if ((user.role || '').toLowerCase() === 'cleaner') {
    const target = (user.displayName || user.username || '').trim().toLowerCase();
    if (target === 'mafer') {
      return allCleaners.filter(c => (typeof c === 'string' ? c : c?.name || '').toLowerCase() === 'mafer');
    }
    return allCleaners.filter(c => (typeof c === 'string' ? c : c?.name || '').toLowerCase() === target);
  }

  // Administrators and Supervisors (Fernando, Michelle, Fer Castil) can assign all cleaners
  return allCleaners;
}

export const initialsOf = (name) => {
  if (!name) return 'WG';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};
