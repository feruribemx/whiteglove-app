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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  CalendarDays,
  CalendarRange,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { isMariaOrFerCastil, isMaferCleaner } from '../lib/auth';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatDisplayDate = (fechaStr, todayStr) => {
  if (!fechaStr) return '';
  try {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const formatted = `${days[date.getDay()]}, ${d} ${MONTH_NAMES[date.getMonth()].substring(0, 3)}`;

    if (fechaStr === todayStr) {
      return `${formatted} (Hoy)`;
    }
    
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

const formatFullDateHeader = (fechaStr) => {
  if (!fechaStr) return '';
  try {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${days[date.getDay()]}, ${d} de ${MONTH_NAMES[date.getMonth()]} de ${y}`;
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
  onOpenAddCleaner,
  currentUser,
  cleanersDb = [],
}) {
  const isMasterAdmin = Boolean(
    currentUser && ['fernandouribe', 'michelleadmin'].includes((currentUser.username || '').toLowerCase())
  );
  const isSupervisorFer = Boolean(
    currentUser && ['fercastil', 'maria', 'fernandacastil'].includes((currentUser.username || '').toLowerCase())
  );
  const isCleaner = Boolean(
    currentUser && !isMasterAdmin && !isSupervisorFer
  );
  const cleanerName = (currentUser?.displayName || currentUser?.username || 'Cleaner').trim();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // View Mode: 'calendar' (Interactive Month Grid) | 'week' (Weekly Columns) | 'cards' (Cards Grid)
  const [viewMode, setViewMode] = useState('calendar');

  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'cancelled'
  const [selectedCleanerFilter, setSelectedCleanerFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'services' | 'schedule'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterRange, setDateFilterRange] = useState('all'); // 'all' | 'upcoming' | 'today'

  // Modal State for adding new assignment / shift
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddClientInSchedule, setShowAddClientInSchedule] = useState(false);
  const [newScheduleClient, setNewScheduleClient] = useState('');
  const [fecha, setFecha] = useState(selectedDate || todayStr);
  const [hora, setHora] = useState('09:00');
  const [duracionHoras, setDuracionHoras] = useState(2);
  const [duracionMinutos, setDuracionMinutos] = useState(0);
  const [unidad, setUnidad] = useState(availableUnits[0] || '');
  const [cleaner, setCleaner] = useState(availableCleaners[0] || '');
  const [tipo, setTipo] = useState('Limpieza');
  const [notes, setNotes] = useState('');
  const [copiedShiftId, setCopiedShiftId] = useState(null);

  const handleShareWhatsAppShift = (item) => {
    const cleanersStr = (item.cleaners && item.cleaners.length ? item.cleaners : [item.cleaner]).join(', ');
    const primaryCleaner = item.cleaner || (item.cleaners && item.cleaners[0]) || '';
    
    // Find cleaner phone if registered
    const cleanerObj = (cleanersDb || []).find((c) => {
      const n = typeof c === 'string' ? c : c?.name;
      return (n || '').trim().toLowerCase() === primaryCleaner.trim().toLowerCase();
    });
    const rawPhone = typeof cleanerObj === 'object' && cleanerObj?.phone ? String(cleanerObj.phone).replace(/\D/g, '') : '';

    let text = `🧹 *WHITEGLOVE - TURNO DE LIMPIEZA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 *Fecha:* ${item.fecha}\n`;
    text += `⏰ *Hora:* ${item.hora || '09:00'} (${item.horas} hrs)\n`;
    text += `📍 *Unidad:* ${item.unidad}\n`;
    text += `🧹 *Tipo:* ${item.tipo || 'Limpieza'}\n`;
    text += `👤 *Cleaner Asignado:* ${cleanersStr}\n`;
    if (item.notas) {
      text += `📝 *Notas:* ${item.notas}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Favor de confirmar de recibido en WhatsApp._`;

    const url = rawPhone
      ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        navigator.clipboard.writeText(text);
        setCopiedShiftId(item.id);
        setTimeout(() => setCopiedShiftId(null), 3000);
      }
    } catch {
      navigator.clipboard.writeText(text);
      setCopiedShiftId(item.id);
      setTimeout(() => setCopiedShiftId(null), 3000);
    }
  };

  // Robust cleaner matching function that handles single strings, arrays, objects, and legacy keys
  const cleanerMatches = (item, cName) => {
    if (!cName || !item) return false;
    const target = cName.trim().toLowerCase();
    if (!target) return false;

    // 1. Mafer: completely distinct cleaner, NEVER match Maria or Fer Castil!
    if (target === 'mafer') {
      const isItemMafer = (val) => isMaferCleaner(val);
      if (isItemMafer(item.cleaner)) return true;
      if (Array.isArray(item.cleaners) && item.cleaners.some(isItemMafer)) return true;
      const svc = item.originalService || item;
      if (svc) {
        if (isItemMafer(svc.cleaner)) return true;
        if (Array.isArray(svc.cleaners) && svc.cleaners.some(isItemMafer)) return true;
        if (svc.pagosPorCleaner && Object.keys(svc.pagosPorCleaner).some(isItemMafer)) return true;
        if (svc.ratesPorCleaner && Object.keys(svc.ratesPorCleaner).some(isItemMafer)) return true;
      }
      return false;
    }

    // 2. MARIA = FER CASTIL (They are the exact same person, never Mafer)
    if (target === 'maria' || target === 'fer castil' || target === 'fercastil' || target === 'fernanda castil') {
      const isItemMariaOrFer = (val) => isMariaOrFerCastil(val);
      if (isItemMariaOrFer(item.cleaner)) return true;
      if (Array.isArray(item.cleaners) && item.cleaners.some(isItemMariaOrFer)) return true;
      const svc = item.originalService || item;
      if (svc) {
        if (isItemMariaOrFer(svc.cleaner)) return true;
        if (Array.isArray(svc.cleaners) && svc.cleaners.some(isItemMariaOrFer)) return true;
        if (svc.pagosPorCleaner && Object.keys(svc.pagosPorCleaner).some(isItemMariaOrFer)) return true;
        if (svc.ratesPorCleaner && Object.keys(svc.ratesPorCleaner).some(isItemMariaOrFer)) return true;
      }
      return false;
    }

    // 3. Regular Cleaners (Jazz, Karen, Ruben, Nancy, Mariana, etc.)
    const matchesVal = (val) => {
      if (!val) return false;
      const str = (typeof val === 'string' ? val : val?.name || '').trim().toLowerCase();
      if (!str) return false;
      if (str === target) return true;
      const parts = str.split(/[,/&+yY\s]+/).map((p) => p.trim());
      return parts.includes(target);
    };

    if (matchesVal(item.cleaner)) return true;
    if (Array.isArray(item.cleaners) && item.cleaners.some(matchesVal)) return true;

    const svc = item.originalService || item;
    if (svc) {
      if (matchesVal(svc.cleaner)) return true;
      if (Array.isArray(svc.cleaners) && svc.cleaners.some(matchesVal)) return true;
      if (svc.pagosPorCleaner && typeof svc.pagosPorCleaner === 'object') {
        if (Object.keys(svc.pagosPorCleaner).some(matchesVal)) return true;
      }
      if (svc.ratesPorCleaner && typeof svc.ratesPorCleaner === 'object') {
        if (Object.keys(svc.ratesPorCleaner).some(matchesVal)) return true;
      }
    }

    return false;
  };

  // Convert services from database into unified calendar entries
  const serviceCalendarItems = useMemo(() => {
    return (services || []).map((s) => {
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
  }, [services, todayStr]);

  // Convert schedule entries from database into unified calendar entries
  const scheduleCalendarItems = useMemo(() => {
    return (schedule || []).map((sc) => {
      const cls = Array.isArray(sc.cleaners) && sc.cleaners.length
        ? sc.cleaners
        : (sc.cleaner ? [sc.cleaner] : []);
      const primaryCleaner = cls[0] || 'Sin asignar';
      const isDone = sc.estado === 'completado' || sc.status === 'completed';
      const isCancelled = sc.estado === 'cancelado' || sc.status === 'cancelled';

      return {
        ...sc,
        id: sc.id,
        isRegisteredService: false,
        cleaners: cls,
        cleaner: primaryCleaner,
        horas: Number(sc.horas) || 2,
        hora: sc.hora || '09:00',
        estado: isCancelled ? 'cancelado' : (isDone ? 'completado' : 'programado'),
        status: isCancelled ? 'cancelled' : (isDone ? 'completed' : 'pending'),
      };
    });
  }, [schedule]);

  // Combined calendar items sorted chronologically
  const unifiedCalendarItems = useMemo(() => {
    const all = [...serviceCalendarItems, ...scheduleCalendarItems];
    return all.sort((a, b) => {
      if (a.fecha !== b.fecha) {
        return a.fecha.localeCompare(b.fecha);
      }
      return (a.hora || '00:00').localeCompare(b.hora || '00:00');
    });
  }, [serviceCalendarItems, scheduleCalendarItems]);

  // Filtered items based on user role, cleaner filter, status filter, and search
  const filteredItems = useMemo(() => {
    return unifiedCalendarItems.filter((item) => {
      // 1. Cleaner isolation:
      // - Only Michelle and Fernando can see all information across the team.
      // - Fer Castil strictly sees ONLY her own services and shifts (MARIA = FER CASTIL).
      // - Mafer is a distinct cleaner and strictly sees ONLY Mafer's services.
      // - All other cleaners strictly see ONLY their own assigned services and shifts.
      if (!isMasterAdmin) {
        if (isSupervisorFer) {
          const isFerItem =
            cleanerMatches(item, 'Maria') ||
            (item.originalService?.capturista && !isMaferCleaner(item.originalService.capturista) && isMariaOrFerCastil(item.originalService.capturista));
          if (!isFerItem) return false;
        } else if (cleanerName.toLowerCase() === 'mafer') {
          // Mafer strictly sees her own
          if (!cleanerMatches(item, 'Mafer')) {
            return false;
          }
        } else {
          // Regular cleaner: only matching their name
          if (!cleanerMatches(item, cleanerName)) {
            return false;
          }
        }
      } else if (selectedCleanerFilter !== 'all') {
        if (!cleanerMatches(item, selectedCleanerFilter)) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (item.status !== 'pending' && item.estado !== 'programado') return false;
        } else if (statusFilter === 'completed') {
          if (item.status !== 'completed' && item.estado !== 'completado') return false;
        } else if (statusFilter === 'cancelled') {
          if (item.status !== 'cancelled' && item.estado !== 'cancelado') return false;
        }
      }

      // 3. Source filter
      if (sourceFilter === 'services' && !item.isRegisteredService) return false;
      if (sourceFilter === 'schedule' && item.isRegisteredService) return false;

      // 4. Date range filter (for cards view)
      if (dateFilterRange === 'today') {
        if (item.fecha !== todayStr) return false;
      } else if (dateFilterRange === 'upcoming') {
        if (item.fecha < todayStr) return false;
      }

      // 5. Search Filter (Cliente, Cleaner, Tipo, Notas)
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

      return true;
    });
  }, [unifiedCalendarItems, isCleaner, cleanerName, selectedCleanerFilter, statusFilter, sourceFilter, dateFilterRange, searchTerm, todayStr]);

  // Map of date string -> array of items for rapid calendar lookup
  const itemsByDate = useMemo(() => {
    const map = {};
    filteredItems.forEach((item) => {
      if (!map[item.fecha]) {
        map[item.fecha] = [];
      }
      map[item.fecha].push(item);
    });
    return map;
  }, [filteredItems]);

  // Selected Day Items
  const selectedDayItems = useMemo(() => {
    return itemsByDate[selectedDate] || [];
  }, [itemsByDate, selectedDate]);

  // Selected day metrics
  const selectedDayStats = useMemo(() => {
    const total = selectedDayItems.length;
    const completed = selectedDayItems.filter((i) => i.status === 'completed' || i.estado === 'completado').length;
    const pending = selectedDayItems.filter((i) => i.status === 'pending' || i.estado === 'programado').length;
    const cancelled = selectedDayItems.filter((i) => i.status === 'cancelled' || i.estado === 'cancelado').length;
    const totalHours = selectedDayItems.reduce((acc, i) => acc + (Number(i.horas) || 0), 0);
    const cleanersSet = new Set();
    selectedDayItems.forEach((i) => {
      (i.cleaners || [i.cleaner]).forEach((c) => {
        if (c && c !== 'Sin asignar') cleanersSet.add(c);
      });
    });

    return { total, completed, pending, cancelled, totalHours, cleanersCount: cleanersSet.size };
  }, [selectedDayItems]);

  // Month Calendar Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Build Month Grid Data (Monday-based weeks)
  const monthGridData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    // Convert JS getDay() (0=Sun, 1=Mon...) to Monday-based (0=Mon, 6=Sun)
    const firstDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // 1. Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // 2. Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // 3. Next month padding to fill a complete 35 or 42 grid
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = nextDate.toISOString().split('T')[0];
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [currentDate, todayStr]);

  // Week View Data: 7 days around the selected date (Mon to Sun)
  const weekDaysData = useMemo(() => {
    const [y, m, d] = (selectedDate || todayStr).split('-').map(Number);
    const sel = new Date(y, m - 1, d);
    const dayOfWeek = (sel.getDay() + 6) % 7; // 0 for Monday
    const monday = new Date(sel);
    monday.setDate(sel.getDate() - dayOfWeek);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(monday);
      dateObj.setDate(monday.getDate() + i);
      const dateStr = dateObj.toISOString().split('T')[0];
      weekDays.push({
        dateStr,
        dayName: WEEKDAY_NAMES_SHORT[i],
        dayNum: dateObj.getDate(),
        monthShort: MONTH_NAMES[dateObj.getMonth()].substring(0, 3),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        items: itemsByDate[dateStr] || [],
      });
    }
    return weekDays;
  }, [selectedDate, todayStr, itemsByDate]);

  // Open modal prefilled with selected date
  const handleOpenModalForDate = (targetDate = selectedDate) => {
    setFecha(targetDate || todayStr);
    setHora('09:00');
    setDuracionHoras(2);
    setDuracionMinutos(0);
    setUnidad(availableUnits[0] || '');
    setCleaner(isCleaner ? cleanerName : (availableCleaners[0] || ''));
    setTipo('Limpieza');
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
      
      {/* 1. Header & Title Bar with View Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-[#0B1D4A] text-[#FFB566] flex items-center justify-center font-bold shadow-xs">
              <CalendarIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#0B1D4A] leading-tight">
                {isMasterAdmin
                  ? 'Calendario Operativo de Limpiezas'
                  : isSupervisorFer
                  ? 'Mi Calendario (María - Fer Castil)'
                  : `Mi Calendario (${cleanerName})`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isMasterAdmin
                  ? 'Gestión y visualización interactiva de turnos de todo el equipo en tiempo real'
                  : 'Tus servicios y turnos asignados sincronizados en tiempo real'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Zone: View Mode Buttons + Add Shift Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#0B1D4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista Mensual con Inspector Diario"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Mensual</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-[#0B1D4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista Semanal en Columnas"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0B1D4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista en Tarjetas Individuales"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tarjetas</span>
            </button>
          </div>

          {/* Quick Capture / Add Buttons */}
          {onOpenNewService && (
            <button
              onClick={() => onOpenNewService({
                fecha: selectedDate || todayStr,
                cleaner: isCleaner ? cleanerName : (isSupervisorFer ? 'Maria' : (availableCleaners[0] || '')),
                cleaners: isCleaner ? [cleanerName] : (isSupervisorFer ? ['Maria'] : (availableCleaners[0] ? [availableCleaners[0]] : [])),
                tipo: 'Limpieza',
              })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1D4A] hover:bg-[#1E3670] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
              title="Capturar servicio completo con cobro y nómina"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFB566]" />
              <span className="hidden sm:inline">+ Capturar Servicio</span>
              <span className="sm:hidden">+ Servicio</span>
            </button>
          )}

          <button
            onClick={() => handleOpenModalForDate(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#FFB566] to-[#E89A45] text-[#0B1D4A] text-xs font-bold rounded-xl hover:brightness-105 active:scale-98 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Agendar Turno</span>
            <span className="sm:hidden">Agendar</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Filter Bar (Cleaner, Status, Source & Search) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Estado:
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#0B1D4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Todos ({filteredItems.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Programados</span>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Completados</span>
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <Ban className="w-3 h-3" />
              <span>Cancelados</span>
            </button>
          </div>

          {/* Cleaner Filter (Exclusively for Master Administrators Michelle and Fernando) */}
          {isMasterAdmin ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1 text-xs">
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
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F1] border border-[#E8DFC8] rounded-xl text-xs font-bold text-[#0B1D4A] shadow-2xs">
              <User className="w-3.5 h-3.5 text-[#FFB566]" />
              <span>{isSupervisorFer ? 'Mis Servicios (María - Fer Castil)' : `Mis Servicios (${cleanerName})`}</span>
            </div>
          )}
        </div>

        {/* Secondary Row: Search input and origin pills */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por cliente, cleaner, notas, dirección..."
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

            {/* Source Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Origen:</span>
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  sourceFilter === 'all'
                    ? 'bg-[#FFB566] text-[#0B1D4A] font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSourceFilter('services')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  sourceFilter === 'services'
                    ? 'bg-[#FFB566] text-[#0B1D4A] font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ✨ En Sistema
              </button>
              <button
                onClick={() => setSourceFilter('schedule')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  sourceFilter === 'schedule'
                    ? 'bg-[#FFB566] text-[#0B1D4A] font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📅 En Agenda
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Fecha seleccionada: <strong className="text-[#0B1D4A] font-bold">{formatDisplayDate(selectedDate, todayStr)}</strong>
          </div>
        </div>
      </div>

      {/* 3. MAIN INTERACTIVE CALENDAR VIEW (MONTH GRID) */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left/Main Column: Month Interactive Grid (8 cols on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
            
            {/* Month Navigator Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Mes Anterior"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Mes Siguiente"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
                <h3 className="text-lg font-serif font-bold text-[#0B1D4A] ml-1">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoToToday}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1D4A] font-bold text-xs transition-colors"
                >
                  Hoy
                </button>
              </div>
            </div>

            {/* 7-Column Days Header (Lun, Mar, Mié, Jue, Vie, Sáb, Dom) */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-1 border-b border-slate-100">
              {WEEKDAY_NAMES_SHORT.map((dayName, idx) => (
                <div key={dayName} className={idx >= 5 ? 'text-amber-700' : ''}>
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {monthGridData.map((cell) => {
                const dayItems = itemsByDate[cell.dateStr] || [];
                const isSelected = cell.dateStr === selectedDate;
                const pendingCount = dayItems.filter((i) => i.status === 'pending' || i.estado === 'programado').length;
                const completedCount = dayItems.filter((i) => i.status === 'completed' || i.estado === 'completado').length;
                const cancelledCount = dayItems.filter((i) => i.status === 'cancelled' || i.estado === 'cancelado').length;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`min-h-[96px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-[#FAF7F1] border-[#FFB566] ring-2 ring-[#FFB566]/60 shadow-md'
                        : cell.isToday
                        ? 'bg-amber-50/40 border-amber-300'
                        : cell.isCurrentMonth
                        ? 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                        : 'bg-slate-50/50 border-slate-100 text-slate-300 opacity-60'
                    }`}
                  >
                    {/* Top cell row: Day number + today dot */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          cell.isToday
                            ? 'bg-[#0B1D4A] text-[#FFB566] shadow-2xs font-extrabold'
                            : isSelected
                            ? 'bg-[#FFB566] text-[#0B1D4A] font-extrabold'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {/* Total day cleanings count badge */}
                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Middle: Cleaning Items Pill Preview */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayItems.slice(0, 2).map((item) => {
                        const isDone = item.status === 'completed' || item.estado === 'completado';
                        const isCanc = item.status === 'cancelled' || item.estado === 'cancelado';
                        const cl = item.cleaner || (item.cleaners && item.cleaners[0]) || '';

                        return (
                          <div
                            key={item.id}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate leading-tight border ${
                              isCanc
                                ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                                : isDone
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-[#0B1D4A]/5 text-[#0B1D4A] border-slate-200'
                            }`}
                            title={`${item.unidad} (${cl}) - ${item.hora || '09:00'}`}
                          >
                            <span className="font-bold">{item.hora?.substring(0, 5) || '09:00'}</span> {item.unidad}
                          </div>
                        );
                      })}

                      {dayItems.length > 2 && (
                        <span className="text-[9px] font-bold text-slate-500 block text-right pr-0.5">
                          +{dayItems.length - 2} más...
                        </span>
                      )}
                    </div>

                    {/* Bottom: Status dot indicator summary */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {pendingCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`${pendingCount} programado(s)`} />
                      )}
                      {completedCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${completedCount} completado(s)`} />
                      )}
                      {cancelledCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" title={`${cancelledCount} cancelado(s)`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Programado / Pendiente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Completado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Cancelado</span>
                </div>
              </div>
              <span className="text-slate-400 text-[11px]">
                Haz clic en cualquier día para gestionar su agenda en detalle
              </span>
            </div>
          </div>

          {/* Right Column: Daily Cleaning Schedule Inspector (4 cols on desktop) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 sticky top-20">
            
            {/* Inspector Header */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#FFB566] bg-[#0B1D4A] px-2.5 py-0.5 rounded-full">
                  Agenda del Día
                </span>
                <button
                  onClick={() => handleOpenModalForDate(selectedDate)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#0B1D4A] bg-[#FFB566] hover:bg-[#E89A45] rounded-xl transition-all shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Agendar Turno</span>
                </button>
              </div>

              <h3 className="text-base font-serif font-bold text-[#0B1D4A] mt-2 leading-tight">
                {formatFullDateHeader(selectedDate)}
              </h3>

              {/* Day Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Total Turnos</span>
                  <span className="text-base font-bold text-[#0B1D4A]">{selectedDayStats.total}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Horas Est.</span>
                  <span className="text-base font-bold text-amber-700">{selectedDayStats.totalHours.toFixed(1)}h</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Cleaners</span>
                  <span className="text-base font-bold text-emerald-700">{selectedDayStats.cleanersCount}</span>
                </div>
              </div>
            </div>

            {/* Cleanings List for Selected Day */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedDayItems.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Sin limpiezas para este día</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No hay turnos ni servicios registrados para el {formatDisplayDate(selectedDate, todayStr)}.
                  </p>
                  <button
                    onClick={() => handleOpenModalForDate(selectedDate)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1D4A] text-[#FFB566] text-xs font-bold rounded-xl hover:bg-[#1E3670] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agendar para este día</span>
                  </button>
                </div>
              ) : (
                selectedDayItems.map((item) => {
                  const isDone = item.status === 'completed' || item.estado === 'completado';
                  const isCancelled = item.status === 'cancelled' || item.estado === 'cancelado';
                  const itemCleaners = item.cleaners || [item.cleaner];

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                        isCancelled
                          ? 'bg-rose-50/40 border-rose-200 opacity-80'
                          : isDone
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      {/* Top Row: Time, Type & Origin */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#0B1D4A]" />
                          <span className="font-bold text-xs text-[#0B1D4A]">{item.hora || '09:00'}</span>
                          <span className="text-[11px] text-slate-400">({item.horas} hrs)</span>
                        </div>

                        <div className="flex items-center gap-1">
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

                      {/* Property / Unit */}
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#0B1D4A] shrink-0" />
                        <span className="font-bold text-xs text-slate-900 truncate">{item.unidad}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                          {item.tipo || 'Limpieza'}
                        </span>
                      </div>

                      {/* Cleaners assigned */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {itemCleaners.map((cName) => (
                          <span
                            key={cName}
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#0B1D4A]/10 text-[#0B1D4A] px-2 py-0.5 rounded-lg"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-[#0B1D4A] text-[#FFB566] text-[8px] flex items-center justify-center font-bold">
                              {cName.charAt(0)}
                            </span>
                            <span>{cName}</span>
                          </span>
                        ))}
                      </div>

                      {/* Notes if any */}
                      {item.notas && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                          {item.notas}
                        </p>
                      )}

                      {/* Action buttons on shift */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* Status Toggle Button */}
                        {!item.isRegisteredService && (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isDone
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isDone ? 'Reabrir' : 'Completar'}</span>
                          </button>
                        )}

                        {item.isRegisteredService && (
                          <button
                            type="button"
                            onClick={() => onEditService && onEditService(item.originalService)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                            <span>Ver Servicio</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleShareWhatsAppShift(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                            title="Compartir detalles del turno al cleaner por WhatsApp"
                          >
                            <Share2 className="w-3 h-3 text-emerald-600" />
                            <span>{copiedShiftId === item.id ? '¡Copiado!' : 'WhatsApp'}</span>
                          </button>

                          {!item.isRegisteredService && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('¿Deseas eliminar este turno de la agenda?')) {
                                  onDeleteSchedule(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar turno"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. WEEKLY INTERACTIVE COLUMNS VIEW */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-serif font-bold text-base text-[#0B1D4A]">
                Vista Semanal de Turnos ({weekDaysData[0]?.dayNum} {weekDaysData[0]?.monthShort} – {weekDaysData[6]?.dayNum} {weekDaysData[6]?.monthShort})
              </h3>
              <p className="text-xs text-slate-500">
                Distribución de limpiezas de lunes a domingo. Haz clic en cualquier día para agendar directamente.
              </p>
            </div>
            <button
              onClick={handleGoToToday}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1D4A] font-bold text-xs"
            >
              Semana Actual (Hoy)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekDaysData.map((day) => (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                  day.isSelected
                    ? 'bg-[#FAF7F1] border-[#FFB566] ring-2 ring-[#FFB566]/60 shadow-xs'
                    : day.isToday
                    ? 'bg-amber-50/40 border-amber-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block uppercase">
                        {day.dayName}
                      </span>
                      <span className="text-base font-serif font-bold text-[#0B1D4A]">
                        {day.dayNum} {day.monthShort}
                      </span>
                    </div>
                    {day.isToday && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0B1D4A] text-[#FFB566]">
                        Hoy
                      </span>
                    )}
                  </div>

                  {/* Day cleanings count */}
                  <div className="text-[10px] text-slate-400 font-medium mb-2">
                    {day.items.length} {day.items.length === 1 ? 'limpieza' : 'limpiezas'}
                  </div>

                  {/* Shifts list */}
                  <div className="space-y-2">
                    {day.items.map((item) => {
                      const isDone = item.status === 'completed' || item.estado === 'completado';
                      const isCancelled = item.status === 'cancelled' || item.estado === 'cancelado';
                      return (
                        <div
                          key={item.id}
                          className={`p-2 rounded-xl border text-xs space-y-1 ${
                            isCancelled
                              ? 'bg-rose-50 border-rose-200 text-rose-900 line-through'
                              : isDone
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span>{item.hora || '09:00'}</span>
                            <span className="text-[9px]">{item.horas}h</span>
                          </div>
                          <div className="font-bold truncate text-[11px]">{item.unidad}</div>
                          <div className="text-[10px] text-slate-600 truncate">
                            👤 {item.cleaner}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Shift button for this column */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModalForDate(day.dateStr);
                  }}
                  className="mt-3 w-full py-1.5 text-[11px] font-bold text-[#0B1D4A] bg-slate-100 hover:bg-[#FFB566] hover:text-[#0B1D4A] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agendar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. CARDS GRID VIEW */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Viendo <strong className="text-slate-800">{filteredItems.length}</strong> turnos y servicios
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDateFilterRange('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${dateFilterRange === 'all' ? 'bg-[#0B1D4A] text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setDateFilterRange('upcoming')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${dateFilterRange === 'upcoming' ? 'bg-[#0B1D4A] text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Próximos
              </button>
              <button
                onClick={() => setDateFilterRange('today')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${dateFilterRange === 'today' ? 'bg-[#0B1D4A] text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Hoy
              </button>
            </div>
          </div>

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

                      <div className="flex flex-col items-end gap-1">
                        {item.isRegisteredService ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0B1D4A] text-[#FFB566] border border-[#FFB566]/40 flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 text-[#FFB566]" />
                            <span>En Sistema</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <CalendarIcon className="w-2.5 h-2.5 text-slate-500" />
                            <span>En Agenda</span>
                          </span>
                        )}

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

                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-[#0B1D4A] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-sm text-[#0B1D4A] leading-tight">
                            {item.unidad}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {item.tipo || 'Limpieza'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {itemCleaners.map((cName) => (
                            <span
                              key={cName}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200"
                            >
                              {cName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {item.notas && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                        {item.notas}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                    {!item.isRegisteredService && (
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(item)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                          isDone
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Reabrir Turno' : 'Marcar Completado'}</span>
                      </button>
                    )}

                    {item.isRegisteredService && (
                      <button
                        type="button"
                        onClick={() => onEditService && onEditService(item.originalService)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B1D4A] hover:bg-slate-100 border border-slate-200"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ver Servicio</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleShareWhatsAppShift(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                        title="Enviar turno por WhatsApp al cleaner"
                      >
                        <Share2 className="w-3 h-3 text-emerald-600" />
                        <span>{copiedShiftId === item.id ? '¡Copiado!' : 'WhatsApp'}</span>
                      </button>

                      {!item.isRegisteredService && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('¿Confirmas que deseas eliminar este turno de la agenda?')) {
                              onDeleteSchedule(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar de la agenda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. MODAL TO ADD NEW SCHEDULE SHIFT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#FFB566]" />
                <h3 className="font-serif font-bold text-base text-[#FAF7F1]">
                  Agendar Turno de Limpieza
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              {/* Date & Start Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                    required
                  />
                </div>
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Duración Estimada</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={duracionHoras}
                      onChange={(e) => setDuracionHoras(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                    />
                    <span className="text-slate-500 font-bold">hrs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={duracionMinutos}
                      onChange={(e) => setDuracionMinutos(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                    >
                      <option value="0">00 mins</option>
                      <option value="15">15 mins</option>
                      <option value="30">30 mins</option>
                      <option value="45">45 mins</option>
                    </select>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium pt-1">
                  Total: <strong className="text-[#0B1D4A]">{duracionHoras}h {duracionMinutos > 0 ? `${duracionMinutos}m` : ''}</strong> ({parseFloat((duracionHoras + duracionMinutos / 60).toFixed(2))} hrs)
                </div>
              </div>

              {/* Unit / Residence */}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Cleaner Asignado</label>
                    {!isCleaner && onOpenAddCleaner && (
                      <button
                        type="button"
                        onClick={onOpenAddCleaner}
                        className="text-[11px] font-bold text-[#0B1D4A] hover:text-[#1E3670] bg-[#FFB566]/20 border border-[#FFB566]/60 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        title="Registrar nuevo cleaner en el equipo"
                      >
                        + Nuevo Cleaner
                      </button>
                    )}
                  </div>
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

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas Operativas</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre código de acceso, sábanas o indicaciones especiales..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B1D4A] text-[#FFB566] font-bold shadow-xs hover:bg-[#1E3670]"
                >
                  Guardar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
