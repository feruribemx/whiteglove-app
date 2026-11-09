import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, saveSettingToFirestore } from './firebase';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token strictly in memory (never in localStorage or sessionStorage).
let cachedAccessToken = null;

/**
 * Initialize auth state listener. Clears cachedAccessToken when user signs out.
 */
export const initGoogleSheetsAuth = (onAuthSuccess, onAuthFailure) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Must be called from a button click or user interaction.
 */
export const googleSheetsSignIn = async () => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Sheets.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sheets Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleSheetsAccessToken = async () => {
  return cachedAccessToken;
};

export const googleSheetsLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Extracts Spreadsheet ID from a Google Drive / Google Sheets URL or returns trimmed ID
 */
export function extractSpreadsheetId(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  const driveMatch = trimmed.match(/[-\w]{25,}/);
  if (trimmed.startsWith('http') && driveMatch) return driveMatch[0];
  return trimmed;
}

const SHEETS_CONFIG_STORAGE_KEY = 'wg_google_sheets_config';

export function getSavedSheetsConfig() {
  try {
    const raw = localStorage.getItem(SHEETS_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSheetsConfig(configPatch) {
  try {
    const current = getSavedSheetsConfig() || {};
    const merged = {
      ...current,
      ...configPatch,
      updatedAt: new Date().toISOString(),
    };
    // Ensure we never accidentally persist any token
    delete merged.accessToken;
    delete merged.token;
    localStorage.setItem(SHEETS_CONFIG_STORAGE_KEY, JSON.stringify(merged));
    saveSettingToFirestore('google_sheets_config', merged).catch(() => {});
    return merged;
  } catch {
    return configPatch;
  }
}

/**
 * Fetch spreadsheet metadata including title and real sheet tab names.
 */
export async function fetchSpreadsheetMetadata(spreadsheetId) {
  const token = await getGoogleSheetsAccessToken();
  if (!token) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Ingresa un enlace o ID válido de Google Sheets.');
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    if (res.status === 401) cachedAccessToken = null;
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        'Sin permisos para acceder a esta hoja de cálculo. Verifica que tu cuenta de Google tenga acceso al archivo.'
    );
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        'No se encontró el archivo de Google Sheets. Verifica que sea una Hoja de Cálculo de Google.'
    );
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s) => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title || 'Hoja 1',
    rowCount: s.properties?.gridProperties?.rowCount || 0,
    columnCount: s.properties?.gridProperties?.columnCount || 0,
  }));

  return {
    spreadsheetId: data.spreadsheetId || cleanId,
    title: data.properties?.title || 'Hoja de Cálculo',
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
    sheets,
  };
}

/**
 * Creates a brand-new Google Sheets spreadsheet in the user's Google Drive
 */
export async function createNewGoogleSpreadsheet(title = 'Control Calendario WhiteGlove') {
  const token = await getGoogleSheetsAccessToken();
  if (!token) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Calendario WhiteGlove',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'No se pudo crear la hoja de cálculo en Google Sheets.');
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || title,
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: (data.sheets || []).map((s) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
    })),
  };
}

/**
 * Adds a new sheet tab inside an existing Google Spreadsheet
 */
export async function createSheetTabInSpreadsheet(spreadsheetId, tabTitle = 'Calendario WhiteGlove') {
  const token = await getGoogleSheetsAccessToken();
  if (!token) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: tabTitle.trim(),
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'No se pudo crear la pestaña en la hoja de cálculo.');
  }

  return await fetchSpreadsheetMetadata(cleanId);
}

/**
 * Reads values from a specific tab in the Google Spreadsheet
 */
export async function readGoogleSheetTab(spreadsheetId, tabName) {
  const token = await getGoogleSheetsAccessToken();
  if (!token) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const range = `'${String(tabName || '').replace(/'/g, "''")}'!A1:P500`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Error al leer los datos de la pestaña seleccionada.');
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Writes or appends schedule rows to the target Google Sheet tab.
 * Note: Callers MUST obtain explicit user confirmation via UI before calling this function.
 */
export async function syncScheduleRowsToGoogleSheet({
  spreadsheetId,
  tabName,
  headers,
  dataRows,
  mode = 'replace', // 'replace' | 'append'
}) {
  const token = await getGoogleSheetsAccessToken();
  if (!token) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const safeTab = `'${String(tabName).replace(/'/g, "''")}'`;

  if (mode === 'append') {
    // Check if the sheet is completely empty first so we include headers if needed
    const existing = await readGoogleSheetTab(cleanId, tabName).catch(() => []);
    const valuesToAppend = existing.length === 0 ? [headers, ...dataRows] : dataRows;

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodeURIComponent(`${safeTab}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: valuesToAppend,
        }),
      }
    );

    if (!appendRes.ok) {
      const errData = await appendRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Error al agregar filas en Google Sheets.');
    }

    return await appendRes.json();
  }

  // 'replace' mode: Clear existing values in A1:Z1000 and write fresh headers + dataRows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodeURIComponent(`${safeTab}!A1:Z1000`)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const values = [headers, ...dataRows];
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodeURIComponent(`${safeTab}!A1`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Error al actualizar los datos en Google Sheets.');
  }

  return await updateRes.json();
}
