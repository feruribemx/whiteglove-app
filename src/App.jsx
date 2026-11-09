import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import Navbar from './components/Navbar';
import StatsCards from './components/StatsCards';
import ServicesList from './components/ServicesList';
import ServiceModal from './components/ServiceModal';
import InventoryView from './components/InventoryView';
import ScheduleView from './components/ScheduleView';
import PayrollView from './components/PayrollView';
import AnalyticsView from './components/AnalyticsView';
import AuditLogModal from './components/AuditLogModal';
import AddCleanerModal from './components/AddCleanerModal';
import SystemDiagnosticsModal from './components/SystemDiagnosticsModal';
import InquiriesModal from './components/InquiriesModal';
import RatesConfigModal from './components/RatesConfigModal';
import ClientDossierModal from './components/ClientDossierModal';
import CleanerTimeClock from './components/CleanerTimeClock';
import LoginView from './components/LoginView';
import LandingView from './components/LandingView';
import Toast from './components/Toast';
import { getSavedClientMemory, saveClientMemory } from './lib/clientMemory';
import { getSavedRatesConfig, saveRatesConfig, mergeRatesConfig } from './lib/ratesConfig';

import {
  supabase,
  fetchAllServices,
  fetchStockByUnit,
  fetchStockStorage,
  seedStockByUnit,
  seedStockStorage,
  fetchRates,
  fetchExtraClients,
  addClientToDb,
  fetchCleanersDb,
  addCleanerToDb,
  fetchSchedule,
  addScheduleToDb,
  updateScheduleInDb,
  deleteScheduleFromDb,
  logAction,
  svcToDb,
  BASE_UNITS,
  BASE_CLEANERS,
  UNIT_STOCK_TEMPLATE,
  INITIAL_STOCK_STORAGE,
  DEFAULT_RATES,
} from './lib/supabase';
import {
  subscribeServices,
  subscribeSchedule,
  subscribeCleaners,
  subscribeClients,
  subscribeStockByUnit,
  subscribeStockStorage,
  subscribeSettings,
  subscribeInquiries,
  saveServiceToFirestore,
  deleteServiceFromFirestore,
  saveScheduleShiftToFirestore,
  deleteScheduleShiftFromFirestore,
  saveCleanerToFirestore,
  saveClientToFirestore,
  saveStockByUnitToFirestore,
  saveStockStorageToFirestore,
  saveSettingToFirestore,
  saveAuditLogToFirestore,
  seedInitialFirestoreIfEmpty,
} from './lib/firebase';
import {
  hasFullAccess,
  canRegisterCleaners,
  isSupervisorFerCastil,
  isServiceVisibleToUser,
  isScheduleVisibleToUser,
  getAllowedCleaners,
} from './lib/auth';

export default function App() {
  // Authentication
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('wg-current-user');
      if (!stored) return null;
      const u = JSON.parse(stored);
      if (u) {
        const adminNames = ['fernandouribe', 'michelleadmin', 'fercastil'];
        if (!u.role) {
          u.role = adminNames.includes((u.username || '').toLowerCase()) ? 'admin' : 'cleaner';
        }
      }
      return u;
    } catch {
      return null;
    }
  });

  const isUserCleaner = Boolean(
    currentUser && (
      (currentUser.role || '').toLowerCase() === 'cleaner' ||
      (currentUser.role !== 'admin' && !['fernandouribe', 'michelleadmin', 'fercastil'].includes((currentUser.username || '').toLowerCase()))
    )
  );

  // Data states
  const [services, setServices] = useState([]);
  const [stockByUnit, setStockByUnit] = useState({});
  const [stockStorage, setStockStorage] = useState([]);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [extraClients, setExtraClients] = useState([]);
  const [cleanersDb, setCleanersDb] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState(() =>
    isUserCleaner || isSupervisorFerCastil(currentUser) ? 'registro' : 'services'
  );
  const [periodFilter, setPeriodFilter] = useState('all');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAddCleanerModalOpen, setIsAddCleanerModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isRatesConfigModalOpen, setIsRatesConfigModalOpen] = useState(false);
  const [ratesConfig, setRatesConfig] = useState(() => getSavedRatesConfig());
  const [inquiries, setInquiries] = useState([]);
  const [isInquiriesModalOpen, setIsInquiriesModalOpen] = useState(false);
  const [clientMemory, setClientMemory] = useState(() => getSavedClientMemory());
  const [dossierModalUnit, setDossierModalUnit] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [previewLanding, setPreviewLanding] = useState(false);

  const getDeletedServiceIds = () => {
    try {
      const raw = localStorage.getItem('wg_deleted_service_ids');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      return new Set();
    }
  };

  // Persistent Memory for Client Payment Status (cobranzaStatus: 'pagado' | 'facturado' | 'pendiente')
  const getSavedCobranzaMap = () => {
    try {
      const raw = localStorage.getItem('wg_cobranza_status_map');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const applyCobranzaMemoryToServices = (list, customMap = null) => {
    if (!Array.isArray(list)) return [];
    const cobMap = customMap || getSavedCobranzaMap();
    return list.map((s) => {
      if (!s) return s;
      const key = String(s.id);
      const savedEntry = cobMap[key];
      if (savedEntry && savedEntry.cobranzaStatus) {
        return {
          ...s,
          cobranzaStatus: savedEntry.cobranzaStatus,
          fechaCobro: savedEntry.fechaCobro !== undefined ? savedEntry.fechaCobro : (s.fechaCobro || ''),
          metodoCobro: savedEntry.metodoCobro || s.metodoCobro || 'E-Transfer',
        };
      }
      return {
        ...s,
        cobranzaStatus: s.cobranzaStatus || 'pendiente',
      };
    });
  };

  const saveCobranzaMapToMemory = (patchEntries) => {
    try {
      const currentMap = getSavedCobranzaMap();
      const nextMap = { ...currentMap, ...patchEntries };
      localStorage.setItem('wg_cobranza_status_map', JSON.stringify(nextMap));
      saveSettingToFirestore('cobranza_status_map', nextMap).catch(() => {});
      return nextMap;
    } catch (e) {
      console.warn('Error saving cobranza map to memory:', e);
      return {};
    }
  };
  const [portalLang, setPortalLang] = useState(() => {
    try {
      return localStorage.getItem('wg-portal-lang') || 'es';
    } catch {
      return 'es';
    }
  });

  const handleSetPortalLang = (newLang) => {
    setPortalLang(newLang);
    try {
      localStorage.setItem('wg-portal-lang', typeof newLang === 'function' ? newLang(portalLang) : newLang);
    } catch (e) {
      console.warn('Could not save language preference:', e);
    }
  };

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (title, message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Merge base lists with dynamic database values
  const availableUnits = useMemo(() => {
    const merged = new Set([...BASE_UNITS, ...extraClients]);
    return Array.from(merged).sort();
  }, [extraClients]);

  const availableCleaners = useMemo(() => {
    const fromDb = cleanersDb.map((c) => c.name);
    const merged = new Set([...BASE_CLEANERS, ...fromDb]);
    return Array.from(merged).sort();
  }, [cleanersDb]);

  // Cleaners accessible according to role/supervisor permissions
  const visibleCleaners = useMemo(() => {
    return getAllowedCleaners(currentUser, availableCleaners);
  }, [currentUser, availableCleaners]);

  // Services accessible to currentUser (Fer Castil strictly sees only Maria's services)
  const visibleServices = useMemo(() => {
    return services.filter((s) => isServiceVisibleToUser(s, currentUser));
  }, [services, currentUser]);

  // Calendar shifts accessible to currentUser
  const visibleSchedule = useMemo(() => {
    return schedule.filter((sc) => isScheduleVisibleToUser(sc, currentUser));
  }, [schedule, currentUser]);

  // Initial Data Loading & Live Cloud Sync across all devices
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      setLoading(true);
      try {
        const [svcs, byUnit, storage, ratesData, extras, cleaners, sched] = await Promise.all([
          fetchAllServices(),
          fetchStockByUnit(BASE_UNITS, UNIT_STOCK_TEMPLATE),
          fetchStockStorage(),
          fetchRates(),
          fetchExtraClients(),
          fetchCleanersDb(),
          fetchSchedule(),
        ]);

        if (isMounted) {
          const deletedSet = getDeletedServiceIds();
          const filteredInitialSvcs = (svcs || []).filter((s) => !deletedSet.has(String(s.id)));
          if (filteredInitialSvcs.length) {
            setServices((prev) => {
              const prevMap = new Map((prev || []).map((item) => [String(item.id), item]));
              const merged = filteredInitialSvcs.map((dbItem) => {
                const existing = prevMap.get(String(dbItem.id));
                if (existing) {
                  return {
                    ...dbItem,
                    ...existing,
                    cobranzaStatus:
                      existing.cobranzaStatus && existing.cobranzaStatus !== 'pendiente'
                        ? existing.cobranzaStatus
                        : dbItem.cobranzaStatus || 'pendiente',
                    fechaCobro: existing.fechaCobro || dbItem.fechaCobro || '',
                  };
                }
                return dbItem;
              });
              // Include any items in prev that weren't in filteredInitialSvcs
              const initialIds = new Set(filteredInitialSvcs.map((i) => String(i.id)));
              const extraPrev = (prev || []).filter(
                (p) => !initialIds.has(String(p.id)) && !deletedSet.has(String(p.id))
              );
              const combined = [...extraPrev, ...merged].sort(
                (a, b) =>
                  (b.fecha || '').localeCompare(a.fecha || '') ||
                  String(b.id || '').localeCompare(String(a.id || ''))
              );
              return applyCobranzaMemoryToServices(combined);
            });
          }
          if (byUnit) setStockByUnit(byUnit);
          if (storage) setStockStorage(storage);
          if (ratesData) setRates(ratesData);
          if (extras?.length) setExtraClients(extras);
          if (cleaners?.length) setCleanersDb(cleaners);
          if (sched?.length) setSchedule(sched);
        }

        // Seed Firestore if fresh/empty so all base units, cleaners and records are stored in the cloud
        await seedInitialFirestoreIfEmpty(svcs, sched);
      } catch (err) {
        console.warn('Initial data load notice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();

    // Attach Realtime Listeners to Firebase Firestore (All devices sync live in real-time)
    const unsubServices = subscribeServices((liveServices) => {
      if (Array.isArray(liveServices)) {
        const deletedSet = getDeletedServiceIds();
        const activeLive = liveServices.filter((s) => !deletedSet.has(String(s.id)));
        if (activeLive.length > 0) {
          setServices((prev) => {
            const liveMap = new Map(activeLive.map((item) => [String(item.id), item]));
            const mergedPrev = (prev || [])
              .filter((p) => !deletedSet.has(String(p.id)))
              .map((p) => {
                const fromCloud = liveMap.get(String(p.id));
                if (fromCloud) {
                  liveMap.delete(String(p.id));
                  return {
                    ...p,
                    ...fromCloud,
                    cobranzaStatus:
                      fromCloud.cobranzaStatus && fromCloud.cobranzaStatus !== 'pendiente'
                        ? fromCloud.cobranzaStatus
                        : p.cobranzaStatus || 'pendiente',
                  };
                }
                return p;
              });
            const remainingCloud = Array.from(liveMap.values());
            const combined = [...remainingCloud, ...mergedPrev].sort(
              (a, b) =>
                (b.fecha || '').localeCompare(a.fecha || '') ||
                String(b.id || '').localeCompare(String(a.id || ''))
            );
            return applyCobranzaMemoryToServices(combined);
          });
        }
      }
    });

    const unsubSchedule = subscribeSchedule((liveSchedule) => {
      if (liveSchedule && liveSchedule.length > 0) {
        setSchedule(liveSchedule);
      }
    });

    const unsubCleaners = subscribeCleaners((liveCleaners) => {
      if (liveCleaners && liveCleaners.length > 0) {
        setCleanersDb((prev) => {
          const map = new Map();
          prev.forEach((c) => map.set((c.name || '').toLowerCase(), c));
          liveCleaners.forEach((c) => map.set((c.name || '').toLowerCase(), c));
          return Array.from(map.values());
        });
      }
    });

    const unsubClients = subscribeClients((liveClients) => {
      if (liveClients && liveClients.length > 0) {
        setExtraClients((prev) => Array.from(new Set([...prev, ...liveClients])));
      }
    });

    const unsubStockByUnit = subscribeStockByUnit((liveStock) => {
      if (liveStock && Object.keys(liveStock).length > 0) {
        setStockByUnit((prev) => ({ ...prev, ...liveStock }));
      }
    });

    const unsubStockStorage = subscribeStockStorage((liveStorage) => {
      if (liveStorage && liveStorage.length > 0) {
        setStockStorage(liveStorage);
      }
    });

    const unsubSettings = subscribeSettings((settingsMap) => {
      if (settingsMap) {
        if (settingsMap.rates) setRates(settingsMap.rates);
        if (settingsMap.payroll_payments) {
          try {
            localStorage.setItem('wg_payroll_payments', JSON.stringify(settingsMap.payroll_payments));
          } catch {}
        }
        if (settingsMap.payroll_paid_services) {
          try {
            localStorage.setItem('wg_payroll_paid_services', JSON.stringify(settingsMap.payroll_paid_services));
          } catch {}
        }
        if (settingsMap.client_memory) {
          setClientMemory(settingsMap.client_memory);
          try {
            localStorage.setItem('wg_client_memory', JSON.stringify(settingsMap.client_memory));
          } catch {}
        }
        if (settingsMap.rates_config) {
          const merged = mergeRatesConfig(settingsMap.rates_config);
          setRatesConfig(merged);
          try {
            localStorage.setItem('wg_rates_config', JSON.stringify(merged));
          } catch {}
        }
        if (settingsMap.cobranza_status_map && typeof settingsMap.cobranza_status_map === 'object') {
          try {
            const localCobMap = getSavedCobranzaMap();
            const mergedCobMap = { ...localCobMap, ...settingsMap.cobranza_status_map };
            localStorage.setItem('wg_cobranza_status_map', JSON.stringify(mergedCobMap));
            setServices((prev) => applyCobranzaMemoryToServices(prev, mergedCobMap));
          } catch {}
        }
        if (Array.isArray(settingsMap.deleted_service_ids)) {
          try {
            const localSet = getDeletedServiceIds();
            settingsMap.deleted_service_ids.forEach((id) => localSet.add(String(id)));
            localStorage.setItem('wg_deleted_service_ids', JSON.stringify(Array.from(localSet)));
            setServices((prev) => prev.filter((s) => !localSet.has(String(s.id))));
          } catch {}
        }
      }
    });

    const unsubInquiries = subscribeInquiries((liveInquiries) => {
      if (liveInquiries) {
        setInquiries(liveInquiries);
      }
    });

    return () => {
      isMounted = false;
      unsubServices();
      unsubSchedule();
      unsubCleaners();
      unsubClients();
      unsubStockByUnit();
      unsubStockStorage();
      unsubSettings();
      unsubInquiries();
    };
  }, []);

  // Auth actions
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('wg-current-user', JSON.stringify(user));
    } catch {}
    setActiveTab(
      user.role === 'cleaner' || isSupervisorFerCastil(user) ? 'registro' : 'services'
    );
    addToast('Bienvenido', `Sesión iniciada como ${user.displayName || user.username}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('wg-current-user');
    } catch {}
    addToast('Sesión Finalizada', 'Has cerrado sesión exitosamente.');
  };

  const verifyCleanerPassword = async (cleanerName, enteredPassword) => {
    const cName = (cleanerName || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const firstName = cName.split(/\s+/)[0] || cName;
    const entered = (enteredPassword || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!cName || !entered) return false;

    // 1. Special handling for Maria / Fer Castil
    if (['maria', 'fercastil', 'fernanda castil', 'fer castil', 'fernanda'].includes(cName)) {
      if (
        [
          'rocky1.',
          'rocky1',
          'maria123',
          'maria',
          'fercastil',
          'fercastil123',
          'fercastil2025!',
          'whiteglove2025!',
          '1234',
        ].includes(entered)
      ) {
        return true;
      }
    }

    // 2. Standard valid password patterns for any cleaner (e.g. "jazz123", "jazz", "1234", "whiteglove")
    const validPasswords = new Set([
      cName,
      `${cName}123`,
      `${cName}2025`,
      `${cName}2026`,
      firstName,
      `${firstName}123`,
      `${firstName}2025`,
      `${firstName}2026`,
      '1234',
      '123456',
      'whiteglove',
      'whiteglove123',
    ]);

    // 3. Also check custom password configured in cleanersDb (from Firestore or Supabase)
    const found = cleanersDb.find(
      (c) =>
        (c?.name || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') === cName
    );
    if (found && found.password) {
      const dbPass = String(found.password)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (dbPass) {
        validPasswords.add(dbPass);
        validPasswords.add(`${dbPass}123`);
      }
    }

    return validPasswords.has(entered);
  };

  // Service Management (Real-time Cloud Sync)
  const handleOpenNewService = (prefill = null) => {
    // If prefill is a DOM/React event (e.g. from onClick={handleOpenNewService}), sanitize it to null
    const isEvent = prefill && (
      typeof prefill.preventDefault === 'function' ||
      'nativeEvent' in prefill ||
      '_reactName' in prefill ||
      (typeof Element !== 'undefined' && prefill.target instanceof Element)
    );
    const validPrefill = (!isEvent && prefill && typeof prefill === 'object') ? prefill : null;
    setServiceToEdit(validPrefill);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service) => {
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleCancelService = async (id, newStatus = 'cancelado') => {
    try {
      const targetService = services.find((s) => String(s.id) === String(id));
      if (!targetService) return;
      const updated = { ...targetService, status: newStatus };
      
      // Live Cloud Persistence to Firestore
      await saveServiceToFirestore(updated);
      
      // Fallback Supabase sync
      const dbRow = svcToDb(updated);
      supabase.from('services').update(dbRow).eq('id', id).catch(() => {});

      setServices((prev) => prev.map((s) => (String(s.id) === String(id) ? updated : s)));
      addToast('Servicio', newStatus === 'cancelado' ? 'Servicio cancelado exitosamente.' : 'Servicio reactivado.');
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username,
        action: newStatus === 'cancelado' ? 'CANCEL_SERVICE' : 'REACTIVATE_SERVICE',
        details: `${newStatus === 'cancelado' ? 'Canceló' : 'Reactivó'} servicio en ${targetService.unidad}`,
      });
    } catch (err) {
      console.error('Cancel service error:', err);
      addToast('Error', 'No se pudo actualizar el estado del servicio.', 'error');
    }
  };

  const handleSaveService = async (serviceData) => {
    const serviceId = serviceData?.id ? String(serviceData.id) : String(Date.now());
    const payload = {
      ...serviceData,
      id: serviceId,
      updatedAt: new Date().toISOString(),
    };
    const isEdit = services.some((s) => String(s.id) === serviceId);

    // 0. Persist cobranzaStatus in dedicated memory map so it never resets on refresh
    if (payload.cobranzaStatus) {
      saveCobranzaMapToMemory({
        [serviceId]: {
          cobranzaStatus: payload.cobranzaStatus,
          fechaCobro: payload.fechaCobro || '',
          metodoCobro: payload.metodoCobro || 'E-Transfer',
          updatedAt: payload.updatedAt,
        },
      });
    }

    // 1. Optimistic update: instantly render in UI so the user sees immediate feedback
    setServices((prev) => {
      const exists = prev.some((s) => String(s.id) === serviceId);
      return exists ? prev.map((s) => (String(s.id) === serviceId ? payload : s)) : [payload, ...prev];
    });

    // 2. Immediately close modal so the interface is fluid and never freezes
    setIsServiceModalOpen(false);

    // 3. Save to Firebase Firestore (real-time live sync across all devices)
    try {
      await saveServiceToFirestore(payload);
    } catch (err) {
      console.warn('Firestore primary save notice (will persist via background/cache):', err);
    }

    // 4. Background sync to Supabase
    try {
      const dbRow = svcToDb(payload);
      if (isEdit) {
        supabase.from('services').update(dbRow).eq('id', payload.id).catch(() => {});
      } else {
        supabase.from('services').insert(dbRow).catch(() => {});
      }
    } catch (err) {
      console.warn('Supabase sync notice:', err);
    }

    // 5. Local offline cache
    try {
      const cached = JSON.parse(localStorage.getItem('wg-offline-services') || '[]');
      const updatedCache = [payload, ...cached.filter((s) => String(s.id) !== serviceId)].slice(0, 500);
      localStorage.setItem('wg-offline-services', JSON.stringify(updatedCache));
    } catch {}

    // 6. Audit Log
    try {
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username || 'WhiteGlove',
        action: isEdit ? 'UPDATE_SERVICE' : 'CREATE_SERVICE',
        details: `${isEdit ? 'Modificó' : 'Registró'} servicio en ${payload.unidad || 'Unidad'} (#${serviceId})`,
      });
    } catch {}

    // 7. Toast feedback
    addToast(
      isEdit ? 'Servicio Actualizado' : 'Servicio Registrado',
      `Servicio en ${payload.unidad || 'Unidad'} guardado exitosamente.`
    );
  };

  const handleDeleteService = (id) => {
    if (!hasFullAccess(currentUser)) {
      addToast('Acceso Restringido', 'Solo los administradores principales pueden eliminar servicios.', 'error');
      return;
    }
    const target = services.find((s) => String(s.id) === String(id));
    setServiceToDelete(target || { id: String(id), unidad: 'Servicio seleccionado', fecha: '' });
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    const sId = String(serviceToDelete.id);
    const targetUnit = serviceToDelete.unidad || 'Unidad';
    setServiceToDelete(null);

    // 1. Optimistically remove from UI state immediately
    setServices((prev) => prev.filter((s) => String(s.id) !== sId));

    // 2. Track deleted ID in localStorage & Firestore settings so Supabase fallback never resurrects it
    try {
      const deletedSet = getDeletedServiceIds();
      deletedSet.add(sId);
      const deletedArr = Array.from(deletedSet);
      localStorage.setItem('wg_deleted_service_ids', JSON.stringify(deletedArr));
      saveSettingToFirestore('deleted_service_ids', deletedArr).catch(() => {});
    } catch {}

    // 3. Remove from offline localStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem('wg-offline-services') || '[]');
      const filteredCache = cached.filter((s) => String(s.id) !== sId);
      localStorage.setItem('wg-offline-services', JSON.stringify(filteredCache));
    } catch {}

    // 4. Delete from Firestore and Supabase
    try {
      await deleteServiceFromFirestore(sId);
    } catch (err) {
      console.warn('Firestore delete notice:', err);
    }
    try {
      supabase.from('services').delete().eq('id', sId).catch(() => {});
    } catch {}

    addToast('Servicio Eliminado', `El servicio en ${targetUnit} ha sido eliminado permanentemente.`, 'info');
    try {
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username || 'Admin',
        action: 'DELETE_SERVICE',
        details: `Eliminó el servicio en ${targetUnit} (#${sId})`,
      });
    } catch {}
  };

  const handleSaveRatesConfig = (newConfig) => {
    const saved = saveRatesConfig(newConfig);
    setRatesConfig(saved);
    addToast('Tarifas Actualizadas', 'Los pagos por hora a cleaners y cobros por hora a clientes se han guardado.');
    try {
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username || 'Admin',
        action: 'UPDATE_RATES_CONFIG',
        details: 'Actualizó la configuración de pagos por hora a cleaners y tarifas por hora a clientes.',
      });
    } catch {}
  };

  // Client Billing / Collection Status Toggle (Master Admins Only)
  const handleToggleCobranza = async (idOrIds, nextStatus = 'pagado') => {
    if (!hasFullAccess(currentUser)) return;
    const ids = (Array.isArray(idOrIds) ? idOrIds : [idOrIds]).map(String);
    if (ids.length === 0) return;

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    // 1. Build updated records and persistent memory map synchronously BEFORE state update
    const updatedRecords = [];
    const cobranzaPatch = {};

    services.forEach((s) => {
      if (ids.includes(String(s.id))) {
        const resolvedFechaCobro =
          nextStatus === 'pagado' ? s.fechaCobro || todayStr : s.fechaCobro || '';
        const updated = {
          ...s,
          cobranzaStatus: nextStatus,
          fechaCobro: resolvedFechaCobro,
          updatedAt: nowIso,
        };
        updatedRecords.push(updated);
        cobranzaPatch[String(s.id)] = {
          cobranzaStatus: nextStatus,
          fechaCobro: resolvedFechaCobro,
          metodoCobro: s.metodoCobro || 'E-Transfer',
          updatedAt: nowIso,
        };
      }
    });

    // Ensure every requested ID is recorded in the persistent cobranza map even if not in current slice
    ids.forEach((idStr) => {
      if (!cobranzaPatch[idStr]) {
        cobranzaPatch[idStr] = {
          cobranzaStatus: nextStatus,
          fechaCobro: nextStatus === 'pagado' ? todayStr : '',
          metodoCobro: 'E-Transfer',
          updatedAt: nowIso,
        };
      }
    });

    // 2. Save immediately to localStorage ('wg_cobranza_status_map') & Firestore settings ('cobranza_status_map')
    saveCobranzaMapToMemory(cobranzaPatch);

    // 3. Update React UI state immediately
    const mapUpdated = new Map(updatedRecords.map((r) => [String(r.id), r]));
    setServices((prev) =>
      prev.map((s) => mapUpdated.get(String(s.id)) || s)
    );

    // 4. Persist each updated service document to Firestore, Supabase, and Offline Cache
    try {
      await Promise.all(
        updatedRecords.map(async (rec) => {
          try {
            await saveServiceToFirestore(rec);
          } catch {}
          try {
            const dbRow = svcToDb(rec);
            await supabase.from('services').update(dbRow).eq('id', rec.id);
          } catch {}
        })
      );
      const cached = JSON.parse(localStorage.getItem('wg-offline-services') || '[]');
      const nextCache = cached.map((c) => mapUpdated.get(String(c.id)) || c);
      localStorage.setItem('wg-offline-services', JSON.stringify(nextCache));
    } catch (err) {
      console.warn('Cobranza cloud sync notice:', err);
    }

    const statusLabel =
      nextStatus === 'pagado'
        ? 'Cobrado (Pagado)'
        : nextStatus === 'facturado'
        ? 'Facturado / Enviado'
        : 'Por Cobrar (Pendiente)';

    addToast(
      'Estado de Cobranza Guardado',
      ids.length === 1
        ? `Servicio marcado y guardado en memoria como: ${statusLabel}`
        : `${ids.length} servicios marcados y guardados en memoria como: ${statusLabel}`
    );

    try {
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username || 'Admin',
        action: 'UPDATE_COBRANZA_STATUS',
        details: `Actualizó estado de cobranza a "${statusLabel}" en ${ids.length} servicio(s).`,
      });
    } catch {}
  };

  // Inventory Management (Cloud Sync)
  const handleUpdateStockByUnit = async (unit, nextItems) => {
    setStockByUnit((prev) => ({ ...prev, [unit]: nextItems }));
    try {
      await saveStockByUnitToFirestore(unit, nextItems);
      addToast('Inventario', `Stock de ${unit} sincronizado en la nube.`);
    } catch (err) {
      console.error('Stock unit update err:', err);
      addToast('Error', 'No se pudo sincronizar el inventario.', 'error');
    }
  };

  const handleUpdateStockStorage = async (nextItems) => {
    setStockStorage(nextItems);
    try {
      await saveStockStorageToFirestore(nextItems);
      addToast('Almacén', 'Stock de almacén central sincronizado en la nube.');
    } catch (err) {
      console.error('Stock storage update err:', err);
      addToast('Error', 'No se pudo sincronizar el almacén.', 'error');
    }
  };

  // Client Management (Cloud Sync)
  const handleAddClient = async (clientData) => {
    const clientName = typeof clientData === 'string' ? clientData.trim() : (clientData?.name || '').trim();
    if (!clientName) return null;

    setExtraClients((prev) => (prev.includes(clientName) ? prev : [...prev, clientName]));

    try {
      await saveClientToFirestore(clientName);
      addClientToDb(clientName).catch(() => {});
      addToast('Nuevo Cliente', `Cliente "${clientName}" guardado en la nube.`);
      saveAuditLogToFirestore({
        actor: currentUser?.username || 'admin',
        action: 'CREAR_CLIENTE',
        details: `Cliente registrado: ${clientName}`,
      });
    } catch (err) {
      console.error('Error adding client:', err);
      addToast('Cliente Agregado', `Cliente "${clientName}" disponible para capturar servicios.`);
    }
    return clientName;
  };

  // Cleaner Management (Cloud Sync)
  const handleAddCleaner = async (cleanerData) => {
    const cleanerName = typeof cleanerData === 'string' ? cleanerData.trim() : (cleanerData?.name || '').trim();
    if (!cleanerName) return null;

    const password = typeof cleanerData === 'object' && cleanerData.password ? cleanerData.password.trim() : `${cleanerName.toLowerCase()}123`;
    const phone = typeof cleanerData === 'object' ? (cleanerData.phone || '').trim() : '';
    const notes = typeof cleanerData === 'object' ? (cleanerData.notes || '').trim() : '';

    const newCleanerObj = {
      name: cleanerName,
      password,
      phone,
      notes,
    };

    setCleanersDb((prev) => {
      const exists = prev.some((c) => (c.name || '').toLowerCase() === cleanerName.toLowerCase());
      if (exists) return prev;
      return [...prev, newCleanerObj];
    });

    try {
      await saveCleanerToFirestore(newCleanerObj);
      addCleanerToDb(cleanerName, password).catch(() => {});
      addToast('Nuevo Cleaner', `Cleaner "${cleanerName}" registrado y sincronizado en la nube.`);
      saveAuditLogToFirestore({
        actor: currentUser?.username || 'admin',
        action: 'CREAR_CLEANER',
        details: `Nuevo cleaner registrado: ${cleanerName}`,
      });
    } catch (err) {
      console.error('Error adding cleaner to cloud:', err);
      addToast('Nuevo Cleaner', `Cleaner "${cleanerName}" registrado en el equipo.`);
    }

    return cleanerName;
  };

  // Schedule Management (Cloud Sync)
  const handleAddSchedule = async (entry) => {
    try {
      const shiftWithId = {
        ...entry,
        id: entry.id ? String(entry.id) : String(Date.now()),
        cleaners: entry.cleaners && entry.cleaners.length ? entry.cleaners : (entry.cleaner ? [entry.cleaner] : []),
        cleaner: (entry.cleaners && entry.cleaners[0]) || entry.cleaner || '',
        estado: entry.estado || (entry.status === 'completed' ? 'completado' : 'programado'),
        status: entry.status || 'pending',
      };
      await saveScheduleShiftToFirestore(shiftWithId);
      addScheduleToDb(shiftWithId).catch(() => {});
      setSchedule((prev) => [...prev, shiftWithId]);
      addToast('Turno Agendado', `Asignado a ${shiftWithId.cleaner} en ${shiftWithId.unidad}.`);
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username,
        action: 'ADD_SCHEDULE',
        details: `Turno agendado en ${shiftWithId.unidad} (${shiftWithId.cleaner})`,
      });
    } catch (err) {
      console.error('Schedule add err:', err);
      const fallbackEntry = {
        ...entry,
        id: Date.now(),
        cleaners: entry.cleaners || [entry.cleaner],
      };
      setSchedule((prev) => [...prev, fallbackEntry]);
      addToast('Turno Agendado', `Asignado a ${entry.cleaner} en ${entry.unidad}.`);
    }
  };

  const handleUpdateSchedule = async (id, patch) => {
    try {
      const current = schedule.find((s) => String(s.id) === String(id)) || {};
      const updated = { ...current, ...patch, id: String(id) };
      await saveScheduleShiftToFirestore(updated);
      updateScheduleInDb(id, patch).catch(() => {});
      setSchedule((prev) => prev.map((s) => (String(s.id) === String(id) ? updated : s)));
      addToast('Agenda', 'Estado de turno actualizado en la nube.');
    } catch (err) {
      console.error('Schedule update err:', err);
      addToast('Error', 'No se pudo actualizar el turno.', 'error');
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await deleteScheduleShiftFromFirestore(id);
      deleteScheduleFromDb(id).catch(() => {});
      setSchedule((prev) => prev.filter((s) => String(s.id) !== String(id)));
      addToast('Agenda', 'Turno eliminado de la nube.');
    } catch (err) {
      console.error('Schedule delete err:', err);
      addToast('Error', 'No se pudo eliminar el turno.', 'error');
    }
  };

  // If not logged in, render Landing Page or Login Modal
  if (!currentUser) {
    return (
      <>
        {showAuthModal ? (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            cleanersList={availableCleaners}
            onVerifyCleanerPassword={verifyCleanerPassword}
            onBackToLanding={() => setShowAuthModal(false)}
          />
        ) : (
          <LandingView onGoToLogin={() => setShowAuthModal(true)} />
        )}
        <Toast toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  if (previewLanding) {
    return (
      <div className="relative">
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2">
          <a
            href="#reviews"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0B1D4A] text-[#FFB566] border border-[#FFB566]/40 font-bold text-xs rounded-xl shadow-xl hover:brightness-110 transition-all"
          >
            ★ Gestionar Reviews
          </a>
          <button
            onClick={() => setPreviewLanding(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FFB566] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-xl hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            ← Volver al Panel
          </button>
        </div>
        <LandingView currentUser={currentUser} onGoToLogin={() => setPreviewLanding(false)} />
      </div>
    );
  }

  const showFinancials = hasFullAccess(currentUser);
  const newInquiriesCount = inquiries.filter((i) => (i.status || 'nueva').toLowerCase() === 'nueva').length;

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0B1D4A] flex flex-col pb-20 md:pb-12 w-full max-w-full overflow-x-hidden">
      {/* Adaptive Luxury Navbar with consolidated user menu */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenNewService={handleOpenNewService}
        onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
        onOpenRatesConfig={showFinancials ? () => setIsRatesConfigModalOpen(true) : null}
        onOpenClientDossier={(u) => setDossierModalUnit(typeof u === 'string' ? u : '')}
        onOpenAuditLog={showFinancials ? () => setIsAuditModalOpen(true) : null}
        onOpenDiagnostics={showFinancials ? () => setIsDiagnosticsModalOpen(true) : null}
        onPreviewLanding={() => setPreviewLanding(true)}
        onOpenInquiries={showFinancials ? () => setIsInquiriesModalOpen(true) : null}
        inquiriesCount={newInquiriesCount}
        lang={portalLang}
        setLang={handleSetPortalLang}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 flex-1">
        
        {/* KPI Strip (Visible on Services & Analytics tabs for supervisors) */}
        {currentUser.role === 'admin' && (activeTab === 'services' || activeTab === 'analytics') && (
          <StatsCards
            services={visibleServices}
            showFinances={showFinancials}
            currentUser={currentUser}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
          />
        )}

        {/* Tab Content Routing */}
        {activeTab === 'services' && (
          <ServicesList
            services={visibleServices}
            currentUser={currentUser}
            onEditService={handleEditService}
            onCancelService={handleCancelService}
            onDeleteService={hasFullAccess(currentUser) ? handleDeleteService : null}
            onToggleCobranza={showFinancials ? handleToggleCobranza : null}
            onOpenNewService={handleOpenNewService}
            onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
            onOpenRatesConfig={showFinancials ? () => setIsRatesConfigModalOpen(true) : null}
            onOpenClientDossier={(u) => setDossierModalUnit(typeof u === 'string' ? u : '')}
          />
        )}

        {activeTab === 'registro' && (
          /* Primary Cleaner View: #1 Reloj Checador (Time Clock) + Scheduled Shifts + Personal Shift History */
          <div className="space-y-5">
            {/* 1. RELOJ CHECADOR DE SERVICIO (Lo primero que ven al iniciar sesión) */}
            <CleanerTimeClock
              currentUser={
                isSupervisorFerCastil(currentUser)
                  ? { ...currentUser, displayName: 'Maria', username: 'Maria' }
                  : currentUser
              }
              availableUnits={availableUnits}
              services={visibleServices}
              schedule={visibleSchedule}
              rates={rates}
              ratesConfig={ratesConfig}
              clientMemory={clientMemory}
              onSaveService={handleSaveService}
              onUpdateSchedule={handleUpdateSchedule}
              onOpenClientDossier={(u) => setDossierModalUnit(typeof u === 'string' ? u : '')}
              onOpenCalendar={() => setActiveTab('schedule')}
            />

            {/* 2. Upcoming Services Notice for Cleaners */}
            <div className="bg-gradient-to-r from-[#0B1D4A] to-[#1E3670] text-white p-4 rounded-2xl border border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFB566]/20 border border-[#FFB566]/40 flex items-center justify-center shrink-0">
                  <span className="text-lg">📅</span>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#FAF7F1]">
                    Tu Calendario de Servicios Programados
                  </h3>
                  <p className="text-xs text-slate-300">
                    Consulta las fechas y turnos futuros donde estás asignada en el sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('schedule')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 shrink-0 cursor-pointer"
              >
                <span>Ver Mi Calendario</span>
                <span>→</span>
              </button>
            </div>

            {/* 3. Historial de Turnos Realizados */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#0B1D4A]">
                  Mis Turnos Realizados ({isSupervisorFerCastil(currentUser) ? 'Maria' : (currentUser.displayName || currentUser.username)})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historial de horas trabajadas y registros del reloj checador vinculados a tu nómina
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  📅 Calendario
                </button>
                <button
                  onClick={() => handleOpenNewService({
                    cleaner: isSupervisorFerCastil(currentUser) ? 'Maria' : (currentUser.displayName || currentUser.username),
                    cleaners: [isSupervisorFerCastil(currentUser) ? 'Maria' : (currentUser.displayName || currentUser.username)]
                  })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFB566] text-[#0B1D4A] font-bold text-xs rounded-xl hover:brightness-105 active:scale-98 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  + Registrar Manualmente
                </button>
              </div>
            </div>
            <ServicesList
              services={visibleServices}
              currentUser={currentUser}
              onEditService={handleEditService}
              onCancelService={isSupervisorFerCastil(currentUser) ? handleCancelService : () => {}}
              onDeleteService={() => {}}
              onOpenClientDossier={(u) => setDossierModalUnit(typeof u === 'string' ? u : '')}
              onOpenNewService={() => handleOpenNewService({
                cleaner: isSupervisorFerCastil(currentUser) ? 'Maria' : (currentUser.displayName || currentUser.username),
                cleaners: [isSupervisorFerCastil(currentUser) ? 'Maria' : (currentUser.displayName || currentUser.username)]
              })}
            />
          </div>
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            stockByUnit={stockByUnit}
            stockStorage={stockStorage}
            availableUnits={availableUnits}
            onUpdateStockByUnit={handleUpdateStockByUnit}
            onUpdateStockStorage={handleUpdateStockStorage}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            schedule={visibleSchedule}
            services={visibleServices}
            availableUnits={availableUnits}
            availableCleaners={visibleCleaners}
            onAddSchedule={handleAddSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onOpenNewService={handleOpenNewService}
            onEditService={handleEditService}
            onCancelService={handleCancelService}
            onAddClient={handleAddClient}
            onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
            onOpenClientDossier={(u) => setDossierModalUnit(typeof u === 'string' ? u : '')}
            clientMemory={clientMemory}
            currentUser={currentUser}
            cleanersDb={cleanersDb}
          />
        )}

        {activeTab === 'payroll' && currentUser.role === 'admin' && (
          <PayrollView
            services={visibleServices}
            cleaners={availableCleaners}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            onEditService={handleEditService}
            onUpdateService={handleSaveService}
            onCancelService={handleCancelService}
            onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
            currentUser={currentUser}
            ratesConfig={ratesConfig}
          />
        )}

        {activeTab === 'analytics' && showFinancials && (
          <AnalyticsView services={services} />
        )}
      </main>

      {/* Service Modal (Create & Edit) */}
      {isServiceModalOpen && (
        <ServiceModal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          serviceToEdit={serviceToEdit}
          onSave={handleSaveService}
          onDeleteService={hasFullAccess(currentUser) ? handleDeleteService : null}
          onAddClient={handleAddClient}
          onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
          onOpenRatesConfig={showFinancials ? () => setIsRatesConfigModalOpen(true) : null}
          onOpenClientDossier={(u) => setDossierModalUnit(typeof u === 'string' ? u : '')}
          availableUnits={availableUnits}
          availableCleaners={visibleCleaners}
          rates={rates}
          ratesConfig={ratesConfig}
          currentUser={currentUser}
          services={visibleServices}
          clientMemory={clientMemory}
        />
      )}

      {/* Client Technical Dossier Modal (Strictly for Administrators and Cleaners in the Work Portal) */}
      {dossierModalUnit !== null && (
        <ClientDossierModal
          isOpen={dossierModalUnit !== null}
          onClose={() => setDossierModalUnit(null)}
          initialUnit={dossierModalUnit}
          availableUnits={availableUnits}
          clientMemory={clientMemory}
          currentUser={currentUser}
          onAddClient={handleAddClient}
          onSaveDossier={(unitName, updatedEntry) => {
            setClientMemory((prev) => ({ ...(prev || {}), [unitName]: updatedEntry }));
            addToast('Ficha Técnica Guardada', `Ficha técnica de "${unitName}" sincronizada en la nube.`);
          }}
        />
      )}

      {/* Hourly Pay & Client Billing Rates Configuration Modal (Master Admins Only) */}
      {isRatesConfigModalOpen && showFinancials && (
        <RatesConfigModal
          isOpen={isRatesConfigModalOpen}
          onClose={() => setIsRatesConfigModalOpen(false)}
          ratesConfig={ratesConfig}
          onSaveRatesConfig={handleSaveRatesConfig}
          availableUnits={availableUnits}
          knownCleaners={availableCleaners}
        />
      )}

      {/* Custom Delete Service Confirmation Modal (Replaces blocked window.confirm) */}
      {serviceToDelete && showFinancials && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#0B1D4A]">
                    ¿Eliminar este servicio?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Esta acción removerá el registro del sistema y de la nube.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Cliente / Propiedad:</span>
                <span className="font-bold text-slate-900">{serviceToDelete.unidad || '—'}</span>
              </div>
              {serviceToDelete.fecha && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Fecha:</span>
                  <span className="font-bold text-slate-800">{serviceToDelete.fecha}</span>
                </div>
              )}
              {(serviceToDelete.cleaner || serviceToDelete.cleaners?.length) && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Cleaner(s):</span>
                  <span className="font-bold text-slate-800">
                    {serviceToDelete.cleaners?.length ? serviceToDelete.cleaners.join(', ') : serviceToDelete.cleaner}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteService}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Cleaner Modal */}
      {isAddCleanerModalOpen && (
        <AddCleanerModal
          isOpen={isAddCleanerModalOpen}
          onClose={() => setIsAddCleanerModalOpen(false)}
          onAddCleaner={handleAddCleaner}
          existingCleaners={availableCleaners}
        />
      )}

      {/* Audit Log Modal (Master Admins Only) */}
      {isAuditModalOpen && showFinancials && (
        <AuditLogModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}

      {/* System Diagnostics & Tests Modal (Master Admins Only) */}
      {isDiagnosticsModalOpen && showFinancials && (
        <SystemDiagnosticsModal
          isOpen={isDiagnosticsModalOpen}
          onClose={() => setIsDiagnosticsModalOpen(false)}
          services={services}
          schedule={schedule}
          cleanersDb={cleanersDb}
          onAddTestShift={handleAddSchedule}
          onAddTestMemory={async (unit, data) => {
            const updated = saveClientMemory(unit, data);
            if (updated) {
              setClientMemory((prev) => ({ ...prev, [unit]: updated }));
              addToast('Memoria Guardada', `Memoria para "${unit}" emitida a la nube.`);
            }
          }}
        />
      )}

      {/* Online Inquiries & Quote Requests Modal (Master Admins Only) */}
      {isInquiriesModalOpen && showFinancials && (
        <InquiriesModal
          isOpen={isInquiriesModalOpen}
          onClose={() => setIsInquiriesModalOpen(false)}
          inquiries={inquiries}
          onUpdateStatus={(id, status) => {
            setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, status } : inq)));
            addToast('Prospecto Actualizado', `Estado de solicitud cambiado a "${status}".`);
          }}
          currentUser={currentUser}
        />
      )}

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
