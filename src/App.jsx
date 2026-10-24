import React, { useState, useEffect, useMemo } from 'react';
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
import LoginView from './components/LoginView';
import LandingView from './components/LandingView';
import Toast from './components/Toast';
import { getSavedClientMemory, saveClientMemory } from './lib/clientMemory';

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
  saveServiceToFirestore,
  deleteServiceFromFirestore,
  saveScheduleShiftToFirestore,
  deleteScheduleShiftFromFirestore,
  saveCleanerToFirestore,
  saveClientToFirestore,
  saveStockByUnitToFirestore,
  saveStockStorageToFirestore,
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
  const [activeTab, setActiveTab] = useState(() => (isUserCleaner ? 'registro' : 'services'));
  const [periodFilter, setPeriodFilter] = useState('all');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAddCleanerModalOpen, setIsAddCleanerModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [clientMemory, setClientMemory] = useState(() => getSavedClientMemory());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [previewLanding, setPreviewLanding] = useState(false);
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
          if (svcs?.length) setServices(svcs);
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
      if (liveServices && liveServices.length > 0) {
        setServices(liveServices);
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
    };
  }, []);

  // Auth actions
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('wg-current-user', JSON.stringify(user));
    } catch {}
    setActiveTab(user.role === 'cleaner' ? 'registro' : 'services');
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
    const cName = (cleanerName || '').trim().toLowerCase();
    const entered = (enteredPassword || '').trim();
    if (['maria', 'fercastil', 'fernanda castil'].includes(cName)) {
      if (['rocky1.', 'rocky1', 'maria123'].includes(entered.toLowerCase())) {
        return true;
      }
    }
    const found = cleanersDb.find((c) => c.name.toLowerCase() === cName);
    if (found) {
      if (['rocky1.', 'rocky1'].includes(entered.toLowerCase()) && ['maria', 'fercastil', 'fernanda castil'].includes(cName)) {
        return true;
      }
      return (found.password || '').trim().toLowerCase() === entered.toLowerCase();
    }
    return cName === entered.toLowerCase();
  };

  // Service Management (Real-time Cloud Sync)
  const handleOpenNewService = (prefill = null) => {
    setServiceToEdit(prefill);
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
    try {
      const serviceId = serviceData.id ? String(serviceData.id) : String(Date.now());
      const payload = { ...serviceData, id: serviceId };
      const isEdit = services.some((s) => String(s.id) === serviceId);

      // Save to Firebase Firestore (instantly broadcasts to all devices via onSnapshot)
      await saveServiceToFirestore(payload);

      // Background sync to Supabase
      const dbRow = svcToDb(payload);
      if (isEdit) {
        supabase.from('services').update(dbRow).eq('id', payload.id).catch(() => {});
      } else {
        supabase.from('services').insert(dbRow).catch(() => {});
      }

      setServices((prev) => {
        const exists = prev.some((s) => String(s.id) === serviceId);
        return exists ? prev.map((s) => (String(s.id) === serviceId ? payload : s)) : [payload, ...prev];
      });

      addToast(isEdit ? 'Actualizado' : 'Registrado', `Servicio en ${payload.unidad} guardado en la nube.`);
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username,
        action: isEdit ? 'UPDATE_SERVICE' : 'CREATE_SERVICE',
        details: `${isEdit ? 'Modificó' : 'Creó'} servicio #${serviceId} (${payload.unidad})`,
      });

      setIsServiceModalOpen(false);
    } catch (err) {
      console.error('Save service error:', err);
      addToast('Error', 'No se pudo guardar el servicio en la nube.', 'error');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('¿Confirmas que deseas eliminar este servicio?')) return;
    try {
      await deleteServiceFromFirestore(id);
      supabase.from('services').delete().eq('id', id).catch(() => {});
      setServices((prev) => prev.filter((s) => String(s.id) !== String(id)));
      addToast('Eliminado', 'El servicio ha sido removido.', 'info');
      saveAuditLogToFirestore({
        actor: currentUser?.displayName || currentUser?.username,
        action: 'DELETE_SERVICE',
        details: `Eliminó el servicio #${id}`,
      });
    } catch (err) {
      console.error('Delete service error:', err);
      addToast('Error', 'No se pudo eliminar el servicio.', 'error');
    }
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
        <div className="fixed top-20 right-6 z-50">
          <button
            onClick={() => setPreviewLanding(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FFB566] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-xl hover:brightness-105 active:scale-[0.98] transition-all"
          >
            ← Volver al Panel
          </button>
        </div>
        <LandingView onGoToLogin={() => setPreviewLanding(false)} />
      </div>
    );
  }

  const showFinancials = hasFullAccess(currentUser);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0B1D4A] flex flex-col pb-20 md:pb-12 w-full max-w-full overflow-x-hidden">
      {/* Adaptive Luxury Navbar with consolidated user menu */}
      {/* Adaptive Luxury Navbar with consolidated user menu */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenNewService={handleOpenNewService}
        onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
        onOpenAuditLog={() => setIsAuditModalOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        onPreviewLanding={() => setPreviewLanding(true)}
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
            onOpenNewService={handleOpenNewService}
            onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
          />
        )}

        {activeTab === 'registro' && (
          /* Personal cleaner view of their logged hours */
          <div className="space-y-4">
            {/* Upcoming Services Notice for Cleaners */}
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
                    Consulta las fechas y turnos futuros donde estás asignado en el sistema
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

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#0B1D4A]">
                  Mis Turnos Realizados ({currentUser.displayName || currentUser.username})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historial de horas trabajadas registradas en el sistema para tu nómina
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
                    cleaner: currentUser.displayName || currentUser.username,
                    cleaners: [currentUser.displayName || currentUser.username]
                  })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFB566] text-[#0B1D4A] font-bold text-xs rounded-xl hover:brightness-105 active:scale-98 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  + Registrar Mi Servicio
                </button>
              </div>
            </div>
            <ServicesList
              services={visibleServices}
              currentUser={currentUser}
              onEditService={() => {}}
              onCancelService={() => {}}
              onDeleteService={() => {}}
              onOpenNewService={() => handleOpenNewService({
                cleaner: currentUser.displayName || currentUser.username,
                cleaners: [currentUser.displayName || currentUser.username]
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
            currentUser={currentUser}
            cleanersDb={cleanersDb}
          />
        )}

        {activeTab === 'payroll' && currentUser.role === 'admin' && (
          <PayrollView
            services={visibleServices}
            cleaners={cleanersDb}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            onEditService={handleEditService}
            onCancelService={handleCancelService}
            onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
            currentUser={currentUser}
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
          onAddClient={handleAddClient}
          onOpenAddCleaner={canRegisterCleaners(currentUser) ? () => setIsAddCleanerModalOpen(true) : null}
          availableUnits={availableUnits}
          availableCleaners={visibleCleaners}
          rates={rates}
          currentUser={currentUser}
          services={visibleServices}
          clientMemory={clientMemory}
        />
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

      {/* Audit Log Modal */}
      {isAuditModalOpen && (
        <AuditLogModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}

      {/* System Diagnostics & Tests Modal */}
      {isDiagnosticsModalOpen && (
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

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
