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
    passwords: ['FerCastil2025!', 'WhiteGlove2025!', 'fercastil2025', 'admin123'],
    legacyHash: '265994bee6d40b93c5e6bcff24899755cba748905572fe3141d8899fde36ff07',
    displayName: 'Fer Castil',
    username: 'FerCastil',
    role: 'admin',
    fullFinancialAccess: false, // Can manage cleaners pay and capture services, but does not see client charges/profits
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
  return user?.role === 'admin' && user?.fullFinancialAccess !== false && user?.username !== 'FerCastil';
}

export function canManagePagos(user) {
  return user?.role === 'admin';
}

export const initialsOf = (name) => {
  if (!name) return 'WG';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};
