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
import LoginView from './components/LoginView';
import LandingView from './components/LandingView';
import Toast from './components/Toast';

import {
  supabase,
  fetchAllServices,
  fetchStockByUnit,
  fetchStockStorage,
  seedStockByUnit,
  seedStockStorage,
  fetchRates,
  fetchExtraClients,
  fetchCleanersDb,
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
import { hasFullAccess } from './lib/auth';

export default function App() {
  // Authentication
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('wg-current-user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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
  const [activeTab, setActiveTab] = useState(() => (currentUser?.role === 'cleaner' ? 'registro' : 'services'));
  const [periodFilter, setPeriodFilter] = useState('all');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
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

  // Initial Data Loading & Realtime subscriptions
  useEffect(() => {
    async function loadAllData() {
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

        setServices(svcs);
        setRates(ratesData);
        setExtraClients(extras);
        setCleanersDb(cleaners);
        setSchedule(sched);

        if (byUnit) {
          setStockByUnit(byUnit);
        } else {
          const initByUnit = BASE_UNITS.reduce((acc, u) => {
            acc[u] = UNIT_STOCK_TEMPLATE.map((it, i) => ({ ...it, id: `${u}-${i}` }));
            return acc;
          }, {});
          setStockByUnit(initByUnit);
          seedStockByUnit(BASE_UNITS, UNIT_STOCK_TEMPLATE);
        }

        if (storage) {
          setStockStorage(storage);
        } else {
          setStockStorage(INITIAL_STOCK_STORAGE);
          seedStockStorage(INITIAL_STOCK_STORAGE);
        }
      } catch (err) {
        console.error('Data loading error:', err);
        addToast('Conexión', 'Usando datos locales temporales mientras se sincroniza.', 'info');
      } finally {
        setLoading(false);
      }
    }

    loadAllData();

    // Realtime channel
    const ch = supabase
      .channel('whiteglove-suite')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, async () => {
        setServices(await fetchAllServices());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_by_unit' }, async () => {
        const next = await fetchStockByUnit(BASE_UNITS, UNIT_STOCK_TEMPLATE);
        if (next) setStockByUnit(next);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_storage' }, async () => {
        const next = await fetchStockStorage();
        if (next) setStockStorage(next);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule' }, async () => {
        setSchedule(await fetchSchedule());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaners_db' }, async () => {
        setCleanersDb(await fetchCleanersDb());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, async () => {
        setExtraClients(await fetchExtraClients());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
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
    const found = cleanersDb.find((c) => c.name.toLowerCase() === cleanerName.toLowerCase());
    if (found) {
      return (found.password || '').trim().toLowerCase() === (enteredPassword || '').trim().toLowerCase();
    }
    // Default fallback: name in lowercase
    return cleanerName.toLowerCase() === (enteredPassword || '').trim().toLowerCase();
  };

  // Service Management
  const handleOpenNewService = (prefill = null) => {
    if (prefill) {
      setServiceToEdit(prefill);
    } else {
      setServiceToEdit(null);
    }
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service) => {
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleCancelService = async (id, newStatus = 'cancelado') => {
    try {
      const targetService = services.find((s) => s.id === id);
      if (!targetService) return;
      const updated = { ...targetService, status: newStatus };
      const dbRow = svcToDb(updated);
      const { error } = await supabase.from('services').update(dbRow).eq('id', id);
      if (error) throw error;
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      addToast(
        'Servicio',
        newStatus === 'cancelado' ? 'Servicio cancelado exitosamente.' : 'Servicio reactivado.'
      );
      logAction({
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
      const isEdit = services.some((s) => s.id === serviceData.id);
      const dbRow = svcToDb(serviceData);

      if (isEdit) {
        const { error } = await supabase.from('services').update(dbRow).eq('id', serviceData.id);
        if (error) throw error;
        setServices((prev) => prev.map((s) => (s.id === serviceData.id ? serviceData : s)));
        addToast('Actualizado', `Servicio en ${serviceData.unidad} actualizado con éxito.`);
        logAction({
          actor: currentUser?.displayName || currentUser?.username,
          action: 'UPDATE_SERVICE',
          details: `Modificó servicio #${serviceData.id} (${serviceData.unidad})`,
        });
      } else {
        const { error } = await supabase.from('services').insert(dbRow);
        if (error) throw error;
        setServices((prev) => [serviceData, ...prev]);
        addToast('Registrado', `Servicio en ${serviceData.unidad} guardado en la nube.`);
        logAction({
          actor: currentUser?.displayName || currentUser?.username,
          action: 'CREATE_SERVICE',
          details: `Creó servicio en ${serviceData.unidad} por ${serviceData.horas}h`,
        });
      }

      setIsServiceModalOpen(false);
    } catch (err) {
      console.error('Save service error:', err);
      addToast('Error', 'No se pudo guardar el servicio. Verifica la conexión.', 'error');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('¿Confirmas que deseas eliminar este servicio?')) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      addToast('Eliminado', 'El servicio ha sido removido.', 'info');
      logAction({
        actor: currentUser?.displayName || currentUser?.username,
        action: 'DELETE_SERVICE',
        details: `Eliminó el servicio #${id}`,
      });
    } catch (err) {
      console.error('Delete service error:', err);
      addToast('Error', 'No se pudo eliminar el servicio.', 'error');
    }
  };

  // Inventory Management
  const handleUpdateStockByUnit = async (unit, nextItems) => {
    setStockByUnit((prev) => ({ ...prev, [unit]: nextItems }));
    try {
      const rows = nextItems.map((item) => ({
        id: item.id,
        unidad: unit,
        categoria: item.cat,
        producto: item.prod,
        unidad_medida: item.unit,
        qty: item.qty,
        min_qty: item.min,
      }));
      const { error } = await supabase.from('stock_by_unit').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      addToast('Inventario', `Stock de ${unit} actualizado.`);
    } catch (err) {
      console.error('Stock unit update err:', err);
      addToast('Error', 'No se pudo sincronizar el inventario.', 'error');
    }
  };

  const handleUpdateStockStorage = async (nextItems) => {
    setStockStorage(nextItems);
    try {
      const rows = nextItems.map((item) => ({
        id: item.id,
        categoria: item.cat,
        producto: item.prod,
        unidad_medida: item.unit,
        qty: item.qty,
        min_qty: item.min,
      }));
      const { error } = await supabase.from('stock_storage').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      addToast('Almacén', 'Stock de almacén central actualizado.');
    } catch (err) {
      console.error('Stock storage update err:', err);
      addToast('Error', 'No se pudo sincronizar el almacén.', 'error');
    }
  };

  // Schedule Management
  const handleAddSchedule = async (entry) => {
    try {
      const created = await addScheduleToDb(entry);
      setSchedule((prev) => [...prev, created]);
      addToast('Turno Agendado', `Asignado a ${entry.cleaner} en ${entry.unidad}.`);
    } catch (err) {
      console.error('Schedule add err:', err);
      addToast('Error', 'No se pudo agendar el turno.', 'error');
    }
  };

  const handleUpdateSchedule = async (id, patch) => {
    try {
      await updateScheduleInDb(id, patch);
      setSchedule((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      addToast('Agenda', 'Estado de turno actualizado.');
    } catch (err) {
      console.error('Schedule update err:', err);
      addToast('Error', 'No se pudo actualizar el turno.', 'error');
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await deleteScheduleFromDb(id);
      setSchedule((prev) => prev.filter((s) => s.id !== id));
      addToast('Agenda', 'Turno eliminado.');
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
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenNewService={handleOpenNewService}
        onOpenAuditLog={() => setIsAuditModalOpen(true)}
        onPreviewLanding={() => setPreviewLanding(true)}
        lang={portalLang}
        setLang={handleSetPortalLang}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 flex-1">
        
        {/* KPI Strip (Visible on Services & Analytics tabs for supervisors) */}
        {currentUser.role === 'admin' && (activeTab === 'services' || activeTab === 'analytics') && (
          <StatsCards
            services={services}
            showFinances={showFinancials}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
          />
        )}

        {/* Tab Content Routing */}
        {activeTab === 'services' && (
          <ServicesList
            services={services}
            currentUser={currentUser}
            onEditService={handleEditService}
            onCancelService={handleCancelService}
            onDeleteService={handleDeleteService}
            onOpenNewService={handleOpenNewService}
          />
        )}

        {activeTab === 'registro' && (
          /* Personal cleaner view of their logged hours */
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#0B1D4A]">
                  Mis Turnos Realizados ({currentUser.displayName || currentUser.username})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historial de horas trabajadas registradas en el sistema para tu nómina
                </p>
              </div>
              <button
                onClick={() => handleOpenNewService({
                  cleaner: currentUser.displayName || currentUser.username,
                  cleaners: [currentUser.displayName || currentUser.username]
                })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFB566] text-[#0B1D4A] font-bold text-xs rounded-xl hover:brightness-105 active:scale-98 transition-all shadow-xs shrink-0"
              >
                + Registrar Mi Servicio
              </button>
            </div>
            <ServicesList
              services={services}
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
            schedule={schedule}
            availableUnits={availableUnits}
            availableCleaners={availableCleaners}
            onAddSchedule={handleAddSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onOpenNewService={handleOpenNewService}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'payroll' && currentUser.role === 'admin' && (
          <PayrollView
            services={services}
            cleaners={availableCleaners}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            onEditService={handleEditService}
            onCancelService={handleCancelService}
          />
        )}

        {activeTab === 'analytics' && showFinancials && (
          <AnalyticsView services={services} />
        )}
      </main>

      {/* Service Modal (Create & Edit) */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        serviceToEdit={serviceToEdit}
        onSave={handleSaveService}
        availableUnits={availableUnits}
        availableCleaners={availableCleaners}
        rates={rates}
        currentUser={currentUser}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
