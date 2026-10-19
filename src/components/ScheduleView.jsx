import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Building2,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Sparkles,
  Ban,
  Pencil,
  Filter,
  Users,
  Check,
  Search,
} from 'lucide-react';

const formatDisplayDate = (fechaStr, todayStr) => {
  if (!fechaStr) return '';
  try {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const formatted = `${days[date.getDay()]}, ${d} ${months[date.getMonth()]}`;

    if (fechaStr === todayStr) {
      return `${formatted} (Hoy)`;
    }
    
    // Check tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (fechaStr === tomorrowStr) {
      return `${formatted} (Mañana)`;
    }

    return `${formatted} ${y}`;
  } catch {
    return fechaStr;
  }
};

export default function ScheduleView({
  schedule = [],
  services = [],
  availableUnits = [],
  availableCleaners = [],
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onOpenNewService,
  onEditService,
  onCancelService,
  onAddClient,
  currentUser,
}) {
  const isCleaner = Boolean(
    currentUser && (
      (currentUser.role || '').toLowerCase() === 'cleaner' ||
      (currentUser.role !== 'admin' && !['fernandouribe', 'michelleadmin', 'fercastil'].includes((currentUser.username || '').toLowerCase()))
    )
  );
  const cleanerName = (currentUser?.displayName || currentUser?.username || 'Cleaner').trim();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter States
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'today' | 'all'
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'services' | 'schedule'
  const [selectedCleanerFilter, setSelectedCleanerFilter] = useState('all'); // Admin filter by specific cleaner
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for adding new assignment / shift
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddClientInSchedule, setShowAddClientInSchedule] = useState(false);
  const [newScheduleClient, setNewScheduleClient] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('09:00');
  const [duracionHoras, setDuracionHoras] = useState(2);
  const [duracionMinutos, setDuracionMinutos] = useState(0);
  const [unidad, setUnidad] = useState(availableUnits[0] || '');
  const [cleaner, setCleaner] = useState(availableCleaners[0] || '');
  const [tipo, setTipo] = useState('Limpieza');
  const [notes, setNotes] = useState('');

  // Robust cleaner matching function that handles single strings, arrays, objects, and legacy keys
  const cleanerMatches = (item, cName) => {
    if (!cName || !item) return false;
    const target = cName.trim().toLowerCase();
    if (!target) return false;

    const matchesVal = (val) => {
      if (!val || typeof val !== 'string') return false;
      const str = val.trim().toLowerCase();
      if (str === target) return true;
      const parts = str.split(/[,/&+yY\s]+/).map((p) => p.trim());
      return parts.includes(target);
    };

    const matchesList = (list) => {
      if (!Array.isArray(list)) return false;
      return list.some((c) => {
        if (typeof c === 'string') return matchesVal(c);
        if (c && typeof c === 'object' && c.name) return matchesVal(c.name);
        return false;
      });
    };

    // 1. Direct item properties
    if (matchesVal(item.cleaner)) return true;
    if (matchesList(item.cleaners)) return true;

    // 2. Original service if unified item or raw service object
    const svc = item.originalService || item;
    if (svc) {
      if (matchesVal(svc.cleaner)) return true;
      if (matchesList(svc.cleaners)) return true;
      if (svc.pagosPorCleaner && typeof svc.pagosPorCleaner === 'object') {
        if (Object.keys(svc.pagosPorCleaner).some(matchesVal)) return true;
      }
      if (svc.ratesPorCleaner && typeof svc.ratesPorCleaner === 'object') {
        if (Object.keys(svc.ratesPorCleaner).some(matchesVal)) return true;
      }
    }

    return false;
  };

  // STRICT ROOT FILTER: When logged in as a cleaner, ONLY their own services & schedule items exist
  const activeServices = useMemo(() => {
    if (!isCleaner) return services || [];
    return (services || []).filter((s) => cleanerMatches(s, cleanerName));
  }, [services, isCleaner, cleanerName]);

  const activeSchedule = useMemo(() => {
    if (!isCleaner) return schedule || [];
    return (schedule || []).filter((sc) => cleanerMatches(sc, cleanerName));
  }, [schedule, isCleaner, cleanerName]);

  // Convert services from the database into unified calendar entries
  const serviceCalendarItems = useMemo(() => {
    return activeServices.map((s) => {
      const cls = Array.isArray(s.cleaners) && s.cleaners.length
        ? s.cleaners
        : (s.cleaner ? [s.cleaner] : []);
      const primaryCleaner = cls[0] || 'Sin asignar';
      const isPast = s.fecha < todayStr;
      const isCancelled = s.status === 'cancelado';

      return {
        id: `svc-${s.id}`,
        rawId: s.id,
        isRegisteredService: true,
        fecha: s.fecha,
        hora: s.hora || '09:00',
        unidad: s.unidad,
        cleaners: cls,
        cleaner: primaryCleaner,
        tipo: s.tipo || 'Limpieza',
        horas: Number(s.horas) || 2,
        notas: isCancelled ? 'Servicio cancelado en sistema' : (s.capturista ? `Capturista: ${s.capturista}` : 'Servicio registrado en sistema'),
        estado: isCancelled ? 'cancelado' : (isPast ? 'completado' : 'programado'),
        status: isCancelled ? 'cancelled' : (isPast ? 'completed' : 'pending'),
        originalService: s,
      };
    });
  }, [activeServices, todayStr]);

  // Convert schedule entries from database into unified calendar entries
  const scheduleCalendarItems = useMemo(() => {
    return activeSchedule.map((sc) => {
      const cls = Array.isArray(sc.cleaners) && sc.cleaners.length
        ? sc.cleaners
        : (sc.cleaner ? [sc.cleaner] : []);
      const primaryCleaner = cls[0] || 'Sin asignar';
      const isDone = sc.estado === 'completado' || sc.status === 'completed';

      return {
        ...sc,
        id: sc.id,
        isRegisteredService: false,
        cleaners: cls,
        cleaner: primaryCleaner,
        horas: Number(sc.horas) || 2,
        hora: sc.hora || '09:00',
        estado: sc.estado || (isDone ? 'completado' : 'programado'),
        status: sc.status || (isDone ? 'completed' : 'pending'),
      };
    });
  }, [activeSchedule]);

  // Combined calendar items sorted chronologically (nearer upcoming dates first)
  const unifiedCalendarItems = useMemo(() => {
    const all = [...serviceCalendarItems, ...scheduleCalendarItems];
    return all.sort((a, b) => {
      if (a.fecha !== b.fecha) {
        return a.fecha.localeCompare(b.fecha);
      }
      return (a.hora || '00:00').localeCompare(b.hora || '00:00');
    });
  }, [serviceCalendarItems, scheduleCalendarItems]);

  // Filtered items based on user role, date range, cleaner, and source
  const filteredItems = useMemo(() => {
    return unifiedCalendarItems.filter((item) => {
      // 1. Role cleaner restriction: MUST be assigned to this cleaner (extra safety guarantee)
      if (isCleaner) {
        if (!cleanerMatches(item, cleanerName)) {
          return false;
        }
      } else if (selectedCleanerFilter !== 'all') {
        // Admin specific cleaner filter
        if (!cleanerMatches(item, selectedCleanerFilter)) {
          return false;
        }
      }

      // 2. Source filter (all | services | schedule)
      if (sourceFilter === 'services' && !item.isRegisteredService) return false;
      if (sourceFilter === 'schedule' && item.isRegisteredService) return false;

      // 3. Date filter
      if (filter === 'today') return item.fecha === todayStr;
      if (filter === 'upcoming') {
        // Includes today and all future dates (e.g. from 16, 17, 23, 25, 30 onwards)
        if (item.fecha < todayStr) return false;
      }

      // 4. Search Filter (Cliente, Cleaner, Servicio, Fecha)
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const unitName = (item.unidad || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const clStr = (item.cleaner || (item.cleaners || []).join(' ')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const tipoStr = (item.tipo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const fechaStr = item.fecha || '';
        const notesStr = (item.notas || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        const matchesSearch =
          unitName.includes(term) ||
          clStr.includes(term) ||
          tipoStr.includes(term) ||
          fechaStr.includes(term) ||
          notesStr.includes(term);

        if (!matchesSearch) return false;
      }

      return true; // 'all'
    });
  }, [unifiedCalendarItems, isCleaner, cleanerName, selectedCleanerFilter, sourceFilter, filter, todayStr, searchTerm]);

  // Metric counts for quick badges
  const totalUpcomingCount = useMemo(() => {
    return unifiedCalendarItems.filter((i) => {
      if (isCleaner && !cleanerMatches(i, cleanerName)) return false;
      return i.fecha >= todayStr;
    }).length;
  }, [unifiedCalendarItems, isCleaner, cleanerName, todayStr]);

  const upcomingServicesCount = useMemo(() => {
    return unifiedCalendarItems.filter((i) => {
      if (isCleaner && !cleanerMatches(i, cleanerName)) return false;
      return i.isRegisteredService && i.fecha >= todayStr;
    }).length;
  }, [unifiedCalendarItems, isCleaner, cleanerName, todayStr]);

  const upcomingTurnosCount = useMemo(() => {
    return unifiedCalendarItems.filter((i) => {
      if (isCleaner && !cleanerMatches(i, cleanerName)) return false;
      return !i.isRegisteredService && i.fecha >= todayStr;
    }).length;
  }, [unifiedCalendarItems, isCleaner, cleanerName, todayStr]);

  // Modal Open Handler
  const handleOpenModal = () => {
    if (isCleaner) {
      setCleaner(cleanerName);
    } else {
      setCleaner(availableCleaners[0] || '');
    }
    setUnidad(availableUnits[0] || '');
    setDuracionHoras(2);
    setDuracionMinutos(0);
    setFecha(todayStr);
    setHora('09:00');
    setNotes('');
    setIsModalOpen(true);
  };

  // Submit Handler for Manual Shift
  const handleCreate = (e) => {
    e.preventDefault();
    const assignedCleaner = isCleaner ? cleanerName : cleaner;
    const durMin = Number(duracionMinutos) || 0;
    const durHrs = Number(duracionHoras) || 0;
    const totalDecimalHours = parseFloat((durHrs + durMin / 60).toFixed(2));

    const durationLabel = durMin > 0 ? `${durHrs}h ${durMin}m` : `${durHrs}h`;
    const fullNotes = notes.trim()
      ? `[Duración: ${durationLabel}] ${notes.trim()}`
      : `[Duración: ${durationLabel}]`;

    onAddSchedule({
      fecha,
      hora,
      unidad,
      cleaners: [assignedCleaner],
      cleaner: assignedCleaner,
      tipo,
      notas: fullNotes,
      estado: 'programado',
      status: 'pending',
      horas: totalDecimalHours,
    });
    setIsModalOpen(false);
    setNotes('');
  };

  // Toggle status for manual schedule item
  const handleStatusToggle = (item) => {
    const isDone = item.estado === 'completado' || item.status === 'completed';
    const nextStatus = isDone ? 'pending' : 'completed';
    const nextEstado = isDone ? 'programado' : 'completado';
    onUpdateSchedule(item.id, { status: nextStatus, estado: nextEstado });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Title Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#0B1D4A] text-[#FFB566] flex items-center justify-center font-bold shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#0B1D4A] leading-tight">
                {isCleaner ? 'Mi Calendario de Asignaciones y Servicios' : 'Calendario General de Servicios y Turnos'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCleaner
                  ? `Mostrando únicamente los servicios y turnos asignados a ${cleanerName}`
                  : 'Monitoreo de servicios programados en el sistema y turnos futuros de todo el equipo'}
              </p>
            </div>
            {isCleaner && (
              <span className="px-3 py-1 rounded-full bg-[#FFB566]/20 text-[#0B1D4A] border border-[#FFB566]/60 text-xs font-bold shadow-2xs">
                Cleaner: {cleanerName}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenNewService && (
            <button
              onClick={() => onOpenNewService({
                fecha: todayStr,
                cleaner: isCleaner ? cleanerName : (availableCleaners[0] || ''),
                cleaners: isCleaner ? [cleanerName] : (availableCleaners[0] ? [availableCleaners[0]] : []),
                tipo: 'Limpieza',
              })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1D4A] hover:bg-[#1E3670] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
              title={isCleaner ? 'Registrar un nuevo servicio para ti' : 'Capturar un nuevo servicio'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFB566]" />
              <span>{isCleaner ? '+ Registrar Mi Servicio' : '+ Capturar Servicio'}</span>
            </button>
          )}

          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#FFB566] to-[#E89A45] text-[#0B1D4A] text-xs font-bold rounded-xl hover:brightness-105 active:scale-98 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isCleaner ? 'Agendar Mi Turno' : 'Agendar Turno'}</span>
          </button>
        </div>
      </div>

      {/* 2. Metrics & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Date Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              Fecha:
            </span>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'upcoming'
                  ? 'bg-[#0B1D4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Próximos (Desde hoy) ({totalUpcomingCount})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'today'
                  ? 'bg-[#0B1D4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-[#0B1D4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Todos los Tiempos ({unifiedCalendarItems.length})
            </button>
          </div>

          {/* Source Filter (Servicios vs Turnos) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Origen:
            </span>
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sourceFilter === 'all'
                  ? 'bg-[#FFB566] text-[#0B1D4A] font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({filteredItems.length})
            </button>
            <button
              onClick={() => setSourceFilter('services')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sourceFilter === 'services'
                  ? 'bg-[#FFB566] text-[#0B1D4A] font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Servicios registrados en el sistema"
            >
              ✨ Servicios en Sistema ({upcomingServicesCount})
            </button>
            <button
              onClick={() => setSourceFilter('schedule')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sourceFilter === 'schedule'
                  ? 'bg-[#FFB566] text-[#0B1D4A] font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Turnos agendados en la agenda"
            >
              📅 Turnos Agenda ({upcomingTurnosCount})
            </button>
          </div>
        </div>

        {/* Search & Cleaner Filter Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            {/* Search Input in Calendar */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar cliente, cleaner, servicio, fecha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!isCleaner && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Cleaner:
                </span>
                <select
                  value={selectedCleanerFilter}
                  onChange={(e) => setSelectedCleanerFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-bold text-[#0B1D4A] focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                >
                  <option value="all">👥 Todos los Cleaners</option>
                  {availableCleaners.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Viendo <strong className="text-slate-800">{filteredItems.length}</strong> eventos de calendario
          </div>
        </div>
      </div>

      {/* 3. Grid of Unified Calendar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isDone = item.estado === 'completado' || item.status === 'completed';
          const isCancelled = item.estado === 'cancelado' || item.status === 'cancelled';
          const itemCleaners = item.cleaners || [item.cleaner];

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between hover:shadow-md ${
                isCancelled
                  ? 'border-rose-200 bg-rose-50/20 opacity-80'
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/15'
                  : item.isRegisteredService
                  ? 'border-amber-300/80 bg-amber-50/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                
                {/* Top Strip: Date & Source Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#0B1D4A]" />
                      <span>{formatDisplayDate(item.fecha, todayStr)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.hora || '09:00'} · {item.horas}h estimada</span>
                    </div>
                  </div>

                  {/* Origin Badge */}
                  <div className="flex flex-col items-end gap-1">
                    {item.isRegisteredService ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0B1D4A] text-[#FFB566] border border-[#FFB566]/40 flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-2.5 h-2.5 text-[#FFB566]" />
                        <span>Servicio en Sistema</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <CalendarIcon className="w-2.5 h-2.5 text-slate-500" />
                        <span>Turno Agenda</span>
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-rose-100 text-rose-800'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isCancelled ? 'Cancelado' : isDone ? 'Completado' : 'Programado'}
                    </span>
                  </div>
                </div>

                {/* Unit / Residence & Service Type */}
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-[#0B1D4A] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-serif font-bold text-base text-[#0B1D4A] leading-tight">
                        {item.unidad}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {item.tipo || 'Limpieza'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cleaners Assigned */}
                <div className="pt-1">
                  <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cleaners Asignados:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {itemCleaners.length > 0 ? (
                      itemCleaners.map((cl, idx) => {
                        const isMe = isCleaner && cl.toLowerCase() === cleanerName.toLowerCase();
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                              isMe
                                ? 'bg-amber-100 text-[#0B1D4A] border border-amber-300 ring-1 ring-amber-400/50'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            <span>{cl}</span>
                            {isMe && (
                              <span className="text-[9px] bg-[#0B1D4A] text-white px-1 py-0.2 rounded font-semibold">
                                Tú
                              </span>
                            )}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin asignar</span>
                    )}
                  </div>
                </div>

                {/* Notes or details */}
                {(item.notas || item.notes) && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                    <p className="line-clamp-2">{item.notas || item.notes}</p>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                
                {/* Actions for REGISTERED SERVICES */}
                {item.isRegisteredService ? (
                  <div className="flex items-center gap-1.5 flex-wrap w-full justify-between">
                    <button
                      onClick={() => onEditService && onEditService(item.originalService)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0B1D4A] text-white hover:bg-[#1E3670] transition-colors shadow-2xs cursor-pointer"
                      title="Abrir formulario para ver o editar detalles de este servicio"
                    >
                      <Pencil className="w-3 h-3 text-[#FFB566]" />
                      <span>{isCleaner ? 'Ver Detalles' : 'Editar Servicio'}</span>
                    </button>

                    {!isCleaner && onCancelService && (
                      <button
                        onClick={() => onCancelService(item.rawId)}
                        className={`p-1.5 rounded-xl text-xs font-bold transition-colors ${
                          isCancelled
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                        }`}
                        title={isCancelled ? 'Reactivar servicio' : 'Cancelar servicio'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  /* Actions for MANUAL SCHEDULE ASSIGNMENTS */
                  <div className="flex items-center gap-1.5 flex-wrap w-full justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleStatusToggle(item)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-[#0B1D4A] text-white hover:bg-[#1E3670]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Completado' : 'Marcar Hecho'}</span>
                      </button>

                      {onOpenNewService && (
                        <button
                          onClick={() => onOpenNewService({
                            unidad: item.unidad,
                            fecha: item.fecha,
                            horas: item.horas || 2,
                            cleaner: isCleaner ? cleanerName : item.cleaner,
                            cleaners: isCleaner ? [cleanerName] : itemCleaners,
                            tipo: item.tipo || 'Limpieza',
                            status: 'activo',
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#FFB566]/20 text-[#0B1D4A] hover:bg-[#FFB566]/40 border border-[#FFB566]/60 transition-colors cursor-pointer"
                          title="Registrar esta asignación como servicio oficial para nómina"
                        >
                          <Sparkles className="w-3 h-3 text-amber-700" />
                          <span>Registrar Servicio</span>
                        </button>
                      )}
                    </div>

                    {(!isCleaner || item.cleaner?.toLowerCase() === cleanerName.toLowerCase()) && (
                      <button
                        onClick={() => onDeleteSchedule(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar asignación de turno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-serif font-bold text-base text-slate-700">
                No hay servicios ni turnos registrados para este filtro.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {isCleaner
                  ? `Cuando un administrador o tú registren un servicio asignado a ${cleanerName} con fecha de hoy en adelante, aparecerá aquí automáticamente.`
                  : 'Los servicios agregados al sistema con fechas futuras (por ejemplo del 17 en adelante) y los turnos agendados aparecen aquí automáticamente.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setFilter('all')}
                className="text-xs font-bold text-[#0B1D4A] bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                Ver todos los registros históricos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Add Schedule Turno Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between">
              <div>
                <span className="font-serif text-lg font-bold text-[#FAF7F1] block">
                  {isCleaner ? 'Agendar Mi Turno' : 'Agendar Turno'}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {isCleaner ? `Asignación exclusiva para: ${cleanerName}` : 'Programación de Operaciones WhiteGlove'}
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Duration: Hours & Minutes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block font-bold text-slate-700">
                  Duración Estimada (Horas y Minutos)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Horas:</span>
                    <select
                      value={duracionHoras}
                      onChange={(e) => setDuracionHoras(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>{h} {h === 1 ? 'hora' : 'horas'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Minutos:</span>
                    <select
                      value={duracionMinutos}
                      onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                    >
                      <option value={0}>0 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-medium pt-1">
                  Total: <strong className="text-[#0B1D4A]">{duracionHoras}h {duracionMinutos > 0 ? `${duracionMinutos}m` : ''}</strong> ({parseFloat((duracionHoras + duracionMinutos / 60).toFixed(2))} hrs)
                </div>
              </div>

              {/* Unit / Client */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Unidad / Residencia</label>
                  {onAddClient && (
                    <button
                      type="button"
                      onClick={() => setShowAddClientInSchedule(!showAddClientInSchedule)}
                      className="text-[11px] font-bold text-[#0B1D4A] hover:text-[#1E3670] bg-[#FFB566]/20 border border-[#FFB566]/60 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      + Nuevo Cliente
                    </button>
                  )}
                </div>

                {showAddClientInSchedule && (
                  <div className="mb-2 p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-amber-950 block">Nombre del nuevo cliente / unidad:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Ej: Mohammed o Phillys..."
                        value={newScheduleClient}
                        onChange={(e) => setNewScheduleClient(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B1D4A]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const trimmed = newScheduleClient.trim();
                          if (trimmed) {
                            await onAddClient(trimmed);
                            setUnidad(trimmed);
                            setNewScheduleClient('');
                            setShowAddClientInSchedule(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#0B1D4A] text-[#FFB566] text-xs font-bold rounded-lg hover:bg-[#1E3670] cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  required
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Assigned Cleaner & Service Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cleaner Asignado</label>
                  {isCleaner ? (
                    <div className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50 rounded-xl text-[#0B1D4A] font-bold flex items-center justify-between">
                      <span>{cleanerName}</span>
                      <span className="text-[10px] bg-[#0B1D4A] text-white px-1.5 py-0.2 rounded font-semibold">Tú</span>
                    </div>
                  ) : (
                    <select
                      value={cleaner}
                      onChange={(e) => setCleaner(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                      required
                    >
                      {availableCleaners.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  {isCleaner && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Solo puedes agendar para ti.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Servicio</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  >
                    <option value="Limpieza">Limpieza</option>
                    <option value="Extra Task">Extra Task</option>
                  </select>
                </div>
              </div>

              {/* Special instructions */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instrucciones Especiales / Notas</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Código de acceso, cambio de sábanas, atención a detalles, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-[#0B1D4A] bg-[#FFB566] hover:bg-[#E89A45] rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  Confirmar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
