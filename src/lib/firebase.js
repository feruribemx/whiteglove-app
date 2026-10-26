import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BASE_UNITS,
  BASE_CLEANERS,
  UNIT_STOCK_TEMPLATE,
  INITIAL_STOCK_STORAGE,
  DEFAULT_RATES,
} from './supabase';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with experimentalForceLongPolling enabled.
// This prevents [code=unavailable] and "Could not reach Cloud Firestore backend"
// connection errors inside iframe previews, proxies, and cloud sandbox environments.
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

/**
 * Robust error handling adhering strictly to FirestoreErrorInfo format
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Validate connection to Firestore
 */
export async function testConnection() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'rates'));
    if (snap.exists()) {
      console.log('WhiteGlove: Conexión en la nube con Firestore establecida.');
    }
    return true;
  } catch (error) {
    console.warn('WhiteGlove: Conexión Firestore en proceso o sincronizando en segundo plano.');
    return false;
  }
}

// ==========================================
// REAL-TIME SUBSCRIBERS (Live Sync on all devices)
// ==========================================

export function subscribeServices(onUpdate, onError) {
  const colRef = collection(db, 'services');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          ...data,
          id: data.id || d.id,
        });
      });
      // Sort newest first
      items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || String(b.id || '').localeCompare(String(a.id || '')));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
      if (onError) onError(error);
    }
  );
}

export function subscribeSchedule(onUpdate, onError) {
  const colRef = collection(db, 'schedule');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          ...data,
          id: data.id || d.id,
        });
      });
      items.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.hora || '').localeCompare(b.hora || ''));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schedule');
      if (onError) onError(error);
    }
  );
}

export function subscribeCleaners(onUpdate, onError) {
  const colRef = collection(db, 'cleaners');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cleaners');
      if (onError) onError(error);
    }
  );
}

export function subscribeClients(onUpdate, onError) {
  const colRef = collection(db, 'clients');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.name) items.push(data.name);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
      if (onError) onError(error);
    }
  );
}

export function subscribeStockByUnit(onUpdate, onError) {
  const colRef = collection(db, 'stock_by_unit');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const grouped = {};
      snapshot.forEach((d) => {
        const data = d.data();
        const unit = data.unidad;
        if (unit) {
          if (!grouped[unit]) grouped[unit] = [];
          grouped[unit].push({ id: d.id, ...data });
        }
      });
      onUpdate(grouped);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stock_by_unit');
      if (onError) onError(error);
    }
  );
}

export function subscribeStockStorage(onUpdate, onError) {
  const colRef = collection(db, 'stock_storage');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });
      items.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stock_storage');
      if (onError) onError(error);
    }
  );
}

export function subscribeSettings(onUpdate, onError) {
  const colRef = collection(db, 'settings');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const settingsMap = {};
      snapshot.forEach((d) => {
        settingsMap[d.id] = d.data()?.value;
      });
      onUpdate(settingsMap);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settings');
      if (onError) onError(error);
    }
  );
}

export function subscribeAuditLogs(onUpdate, onError) {
  const colRef = collection(db, 'audit_logs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });
      items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      if (onError) onError(error);
    }
  );
}

export function subscribeInquiries(onUpdate, onError) {
  const colRef = collection(db, 'inquiries');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inquiries');
      if (onError) onError(error);
    }
  );
}

// ==========================================
// WRITE / UPDATE MUTATIONS WITH AUTOMATIC SANITIZATION
// ==========================================

/**
 * Recursively cleans payloads before sending to Firestore, eliminating any undefined values
 * or stray DOM/React properties that cause Firestore setDoc() to reject the write.
 */
export function sanitizeFirestoreData(data) {
  if (data === undefined) return null;
  if (data === null) return null;
  if (data instanceof Date) return data.toISOString();
  if (typeof data !== 'object') {
    if (typeof data === 'number') {
      return Number.isNaN(data) ? 0 : data;
    }
    return data;
  }
  // Remove accidental React SyntheticEvents or DOM elements
  if (
    typeof data.preventDefault === 'function' ||
    'nativeEvent' in data ||
    '_reactName' in data ||
    (typeof Element !== 'undefined' && data instanceof Element)
  ) {
    return null;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item));
  }
  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith('_react') || key.startsWith('__react') || val === undefined) {
      continue;
    }
    const cleaned = sanitizeFirestoreData(val);
    if (cleaned !== undefined) {
      clean[key] = cleaned;
    }
  }
  return clean;
}

export async function saveServiceToFirestore(service) {
  const serviceId = String(service?.id || Date.now());
  const path = `services/${serviceId}`;
  try {
    const raw = {
      ...service,
      id: serviceId,
      updatedAt: new Date().toISOString(),
    };
    const payload = sanitizeFirestoreData(raw);
    await setDoc(doc(db, 'services', serviceId), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteServiceFromFirestore(serviceId) {
  const sId = String(serviceId);
  const path = `services/${sId}`;
  try {
    await deleteDoc(doc(db, 'services', sId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveScheduleShiftToFirestore(shift) {
  const shiftId = String(shift.id || Date.now());
  const path = `schedule/${shiftId}`;
  try {
    const raw = {
      ...shift,
      id: shiftId,
      updatedAt: new Date().toISOString(),
    };
    const payload = sanitizeFirestoreData(raw);
    await setDoc(doc(db, 'schedule', shiftId), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteScheduleShiftFromFirestore(shiftId) {
  const sId = String(shiftId);
  const path = `schedule/${sId}`;
  try {
    await deleteDoc(doc(db, 'schedule', sId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveCleanerToFirestore(cleaner) {
  const name = typeof cleaner === 'string' ? cleaner.trim() : (cleaner?.name || '').trim();
  if (!name) return;
  const id = name.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  const path = `cleaners/${id}`;
  try {
    const raw = {
      id,
      name,
      password: typeof cleaner === 'object' && cleaner.password ? cleaner.password : name.toLowerCase(),
      phone: typeof cleaner === 'object' ? (cleaner.phone || '') : '',
      notes: typeof cleaner === 'object' ? (cleaner.notes || '') : '',
      updatedAt: new Date().toISOString(),
    };
    const payload = sanitizeFirestoreData(raw);
    await setDoc(doc(db, 'cleaners', id), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveClientToFirestore(clientName) {
  const name = typeof clientName === 'string' ? clientName.trim() : (clientName?.name || '').trim();
  if (!name) return;
  const id = name.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  const path = `clients/${id}`;
  try {
    const raw = {
      id,
      name,
      createdAt: new Date().toISOString(),
    };
    const payload = sanitizeFirestoreData(raw);
    await setDoc(doc(db, 'clients', id), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveStockByUnitToFirestore(unit, items) {
  const path = 'stock_by_unit';
  try {
    await Promise.all(
      items.map((item, idx) => {
        const id = `${unit.toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}_${idx}`;
        const clean = sanitizeFirestoreData({
          ...item,
          id,
          unidad: unit,
          updatedAt: new Date().toISOString(),
        });
        return setDoc(doc(db, 'stock_by_unit', id), clean);
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveStockStorageToFirestore(items) {
  const path = 'stock_storage';
  try {
    await Promise.all(
      items.map((item, idx) => {
        const id = String(item.id || idx + 1);
        const clean = sanitizeFirestoreData({
          ...item,
          id,
          updatedAt: new Date().toISOString(),
        });
        return setDoc(doc(db, 'stock_storage', id), clean);
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveSettingToFirestore(key, value) {
  const path = `settings/${key}`;
  try {
    const clean = sanitizeFirestoreData({
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'settings', key), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAuditLogToFirestore(log) {
  const id = String(Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const path = `audit_logs/${id}`;
  try {
    const clean = sanitizeFirestoreData({
      id,
      timestamp: new Date().toISOString(),
      ...log,
    });
    await setDoc(doc(db, 'audit_logs', id), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveInquiryToFirestore(inquiry) {
  const id = String(inquiry?.id || `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const path = `inquiries/${id}`;
  try {
    const raw = {
      ...inquiry,
      id,
      status: inquiry?.status || 'nueva', // 'nueva' | 'contactada' | 'agendada' | 'cerrada'
      createdAt: inquiry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const clean = sanitizeFirestoreData(raw);
    await setDoc(doc(db, 'inquiries', id), clean);
    return clean;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateInquiryStatusInFirestore(inquiryId, status) {
  const id = String(inquiryId);
  const path = `inquiries/${id}`;
  try {
    const clean = sanitizeFirestoreData({
      status,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'inquiries', id), clean, { merge: true });
    return { id, status };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ==========================================
// SEED INITIAL DATABASE IF EMPTY
// ==========================================
export async function seedInitialFirestoreIfEmpty(currentLocalServices = [], currentLocalSchedule = []) {
  try {
    // Check if services collection is populated
    const snap = await getDocs(collection(db, 'services'));
    if (snap.empty) {
      console.log('WhiteGlove: Inicializando datos predeterminados en Firestore...');
      
      // 1. Seed base Cleaners
      for (const name of BASE_CLEANERS) {
        await saveCleanerToFirestore({
          name,
          password: `${name.toLowerCase()}123`,
        });
      }

      // 2. Seed base Clients / Units
      for (const unit of BASE_UNITS) {
        await saveClientToFirestore(unit);
      }

      // 3. Seed Warehouse stock
      await saveStockStorageToFirestore(INITIAL_STOCK_STORAGE);

      // 4. Seed Stock for initial units
      for (const unit of BASE_UNITS.slice(0, 6)) {
        await saveStockByUnitToFirestore(unit, UNIT_STOCK_TEMPLATE);
      }

      // 5. Seed default Rates
      await saveSettingToFirestore('rates', DEFAULT_RATES);

      // 6. If local services exist, migrate them to Firestore
      if (currentLocalServices && currentLocalServices.length > 0) {
        for (const svc of currentLocalServices) {
          await saveServiceToFirestore(svc);
        }
      }

      // 7. If local schedule shifts exist, migrate them
      if (currentLocalSchedule && currentLocalSchedule.length > 0) {
        for (const shift of currentLocalSchedule) {
          await saveScheduleShiftToFirestore(shift);
        }
      }
      console.log('WhiteGlove: Firestore inicializado exitosamente.');
    }
  } catch (err) {
    console.warn('WhiteGlove: Inicialización omitida o en segundo plano:', err?.message);
  }
}
