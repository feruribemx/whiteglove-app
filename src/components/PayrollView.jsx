import React, { useState, useMemo } from 'react';
import {
  DollarSign, Download, Users, Clock, Search, Gift,
  Calendar, Check, Copy, UserCheck, ChevronRight, ChevronLeft,
  Sparkles, ArrowLeft, CheckCircle2, Building2, Printer,
  Share2, Camera, Eye, Filter, ArrowRight, Edit2, Ban, Plus, RotateCcw
} from 'lucide-react';
import { exportPayrollToCSV } from '../lib/export';
import { formatHoursAndMinutes } from './ServicesList';

// Helper to format ISO YYYY-MM-DD
function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get week start (Monday) and end (Sunday) with offset in weeks
function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  // Distance to Monday (0 is Sunday, so diff is 6; 1 is Monday, diff 0)
  const diffToMonday = now.getDate() - (day === 0 ? 6 : day - 1) + (offsetWeeks * 7);
  const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startStr: toDateStr(monday),
    endStr: toDateStr(sunday),
    label: `${monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  };
}

// Helper to get quincena start and end with offset in fortnights
function getQuincenaRange(offsetFortnights = 0) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const currentQuincenaIndex = currentDay <= 15 ? 0 : 1; // 0 = 1ra quincena, 1 = 2da quincena

  // Total quincenas elapsed from epoch base
  const totalQuincenas = (currentYear * 24 + currentMonth * 2 + currentQuincenaIndex) + offsetFortnights;
  
  const targetYear = Math.floor(totalQuincenas / 24);
  const rem = totalQuincenas % 24;
  const targetMonth = Math.floor(rem / 2);
  const targetPart = rem % 2; // 0 = 1ra quincena (1-15), 1 = 2da quincena (16-fin)

  const monthName = MONTH_NAMES[targetMonth];

  if (targetPart === 0) {
    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth, 15);
    return {
      startStr: toDateStr(start),
      endStr: toDateStr(end),
      label: `1ra Quincena ${monthName} ${targetYear} (1 – 15 ${monthName.substring(0, 3)})`,
      shortLabel: `1Q ${monthName.substring(0, 3)} ${targetYear}`
    };
  } else {
    const start = new Date(targetYear, targetMonth, 16);
    // Last day of month
    const end = new Date(targetYear, targetMonth + 1, 0);
    return {
      startStr: toDateStr(start),
      endStr: toDateStr(end),
      label: `2da Quincena ${monthName} ${targetYear} (16 – ${end.getDate()} ${monthName.substring(0, 3)})`,
      shortLabel: `2Q ${monthName.substring(0, 3)} ${targetYear}`
    };
  }
}

// Month names in Spanish
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function PayrollView({
  services = [],
  cleaners = [],
  onEditService,
  onCancelService,
}) {
  // Temporal Filter states: 'week' | 'quincena' | 'month' | 'custom' | 'all'
  const [filterMode, setFilterMode] = useState('week');
  
  // Week offset
  const [weekOffset, setWeekOffset] = useState(0);

  // Quincena offset
  const [quincenaOffset, setQuincenaOffset] = useState(0);

  // Month offset
  const [monthOffset, setMonthOffset] = useState(0);

  // Custom date range
  const [customStart, setCustomStart] = useState(() => {
    const n = new Date();
    n.setDate(n.getDate() - 14);
    return toDateStr(n);
  });
  const [customEnd, setCustomEnd] = useState(() => toDateStr(new Date()));

  // Cleaner Filter: 'all' or cleaner name
  const [selectedCleaner, setSelectedCleaner] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);

  // Manual Adjustments per cleaner for this period (e.g. bonus, reimbursement, deduction)
  const [manualAdjustments, setManualAdjustments] = useState({});

  // Compute active date range and descriptive label
  const { dateFilterLabel, isDateInRange, periodTypeLabel } = useMemo(() => {
    if (filterMode === 'all') {
      return {
        dateFilterLabel: 'Histórico Completo (Todos los registros)',
        periodTypeLabel: 'Histórico',
        isDateInRange: () => true
      };
    }

    if (filterMode === 'week') {
      const activeWeek = getWeekRange(weekOffset);
      let relativePrefix = '';
      if (weekOffset === 0) relativePrefix = 'Esta Semana';
      else if (weekOffset === -1) relativePrefix = 'Semana Pasada';
      else if (weekOffset === -2) relativePrefix = 'Hace 2 Semanas';
      else if (weekOffset < -2) relativePrefix = `Hace ${Math.abs(weekOffset)} Semanas`;
      else if (weekOffset === 1) relativePrefix = 'Próxima Semana';
      else relativePrefix = `En +${weekOffset} Semanas`;

      return {
        dateFilterLabel: `${relativePrefix} (${activeWeek.label})`,
        periodTypeLabel: 'Semana',
        isDateInRange: (fechaStr) => {
          if (!fechaStr) return false;
          return fechaStr >= activeWeek.startStr && fechaStr <= activeWeek.endStr;
        }
      };
    }

    if (filterMode === 'quincena') {
      const qRange = getQuincenaRange(quincenaOffset);
      let relativePrefix = '';
      if (quincenaOffset === 0) relativePrefix = 'Esta Quincena';
      else if (quincenaOffset === -1) relativePrefix = 'Quincena Pasada';
      else if (quincenaOffset === -2) relativePrefix = 'Hace 2 Quincenas';
      else if (quincenaOffset < -2) relativePrefix = `Hace ${Math.abs(quincenaOffset)} Quincenas`;
      else if (quincenaOffset === 1) relativePrefix = 'Próxima Quincena';
      else relativePrefix = `En +${quincenaOffset} Quincenas`;

      return {
        dateFilterLabel: `${relativePrefix}: ${qRange.label}`,
        periodTypeLabel: 'Quincena',
        isDateInRange: (fechaStr) => {
          if (!fechaStr) return false;
          return fechaStr >= qRange.startStr && fechaStr <= qRange.endStr;
        }
      };
    }

    if (filterMode === 'month') {
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const monthLabel = `${MONTH_NAMES[m]} ${y}`;

      return {
        dateFilterLabel: `Mes: ${monthLabel}`,
        periodTypeLabel: 'Mes',
        isDateInRange: (fechaStr) => fechaStr && fechaStr.startsWith(monthPrefix)
      };
    }

    if (filterMode === 'custom') {
      return {
        dateFilterLabel: `Rango: ${customStart} al ${customEnd}`,
        periodTypeLabel: 'Personalizado',
        isDateInRange: (fechaStr) => {
          if (!fechaStr) return false;
          return fechaStr >= customStart && fechaStr <= customEnd;
        }
      };
    }

    return {
      dateFilterLabel: 'Todos los registros',
      periodTypeLabel: 'Total',
      isDateInRange: () => true
    };
  }, [filterMode, weekOffset, quincenaOffset, monthOffset, customStart, customEnd]);

  // Filter services by active date range
  const servicesInPeriod = useMemo(() => {
    return services.filter((s) => isDateInRange(s.fecha));
  }, [services, isDateInRange]);

  // Aggregate stats per cleaner in this period (excluding cancelled services from total pay)
  const { cleanerStatsMap, allCleanersList } = useMemo(() => {
    const stats = {};

    // Initialize all cleaners
    cleaners.forEach((c) => {
      stats[c] = {
        cleaner: c,
        totalServices: 0,
        cancelledServices: 0,
        totalHours: 0,
        basePay: 0,
        tips: 0,
        manualAdjustment: Number(manualAdjustments[c]) || 0,
        totalPay: 0,
        servicesList: [],
      };
    });

    servicesInPeriod.forEach((svc) => {
      const svcCleaners = svc.cleaners?.length
        ? svc.cleaners
        : svc.cleaner
        ? [svc.cleaner]
        : [];

      const isCancelled = svc.status === 'cancelado';

      svcCleaners.forEach((cl) => {
        if (!stats[cl]) {
          stats[cl] = {
            cleaner: cl,
            totalServices: 0,
            cancelledServices: 0,
            totalHours: 0,
            basePay: 0,
            tips: 0,
            manualAdjustment: Number(manualAdjustments[cl]) || 0,
            totalPay: 0,
            servicesList: [],
          };
        }

        // Calculate pay for this cleaner
        let clBasePay = 0;
        if (svc.pagosPorCleaner && svc.pagosPorCleaner[cl] != null) {
          clBasePay = Number(svc.pagosPorCleaner[cl]) || 0;
        } else if (svc.pagoCleaner != null && svcCleaners.length === 1) {
          clBasePay = Number(svc.pagoCleaner) || 0;
        } else if (svc.pagoCleaner != null && svcCleaners.length > 1) {
          clBasePay = (Number(svc.pagoCleaner) || 0) / svcCleaners.length;
        }

        let clTip = 0;
        if (svc.tip) {
          clTip = (Number(svc.tip) || 0) / (svcCleaners.length || 1);
        }

        const clHours = Number(svc.horas) || 0;
        const clServiceTotal = clBasePay + clTip;

        // If cancelled, keep in list for audit/corroboration, but don't add to totals
        if (isCancelled) {
          stats[cl].cancelledServices += 1;
        } else {
          stats[cl].totalServices += 1;
          stats[cl].totalHours += clHours;
          stats[cl].basePay += clBasePay;
          stats[cl].tips += clTip;
        }

        stats[cl].servicesList.push({
          id: svc.id,
          rawService: svc,
          fecha: svc.fecha,
          unidad: svc.unidad || 'Sin unidad',
          tipo: svc.tipo || 'Limpieza',
          horas: clHours,
          pagoBase: clBasePay,
          tip: clTip,
          subtotal: clServiceTotal,
          status: svc.status || 'activo',
          pagoEstado: svc.pagoEstado || (isCancelled ? 'Cancelado' : 'Registrado'),
          coCleaners: svcCleaners.filter((c) => c !== cl),
        });
      });
    });

    Object.values(stats).forEach((cs) => {
      cs.totalPay = parseFloat((cs.basePay + cs.tips + (Number(manualAdjustments[cs.cleaner]) || 0)).toFixed(2));
      // Sort each cleaner's services descending by date
      cs.servicesList.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    });

    const list = Object.values(stats);
    return { cleanerStatsMap: stats, allCleanersList: list };
  }, [cleaners, servicesInPeriod, manualAdjustments]);

  // Consolidated table list (sorted by totalPay)
  const payrollList = useMemo(() => {
    return allCleanersList
      .filter((cs) => cs.cleaner.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.totalPay - a.totalPay);
  }, [allCleanersList, searchTerm]);

  // Overall totals in the period
  const totalPayroll = useMemo(() => {
    return payrollList.reduce((sum, item) => sum + item.totalPay, 0);
  }, [payrollList]);

  const totalPayrollHours = useMemo(() => {
    return payrollList.reduce((sum, item) => sum + item.totalHours, 0);
  }, [payrollList]);

  const activeCleanersCount = useMemo(() => {
    return payrollList.filter((cs) => cs.totalServices > 0).length;
  }, [payrollList]);

  // Active individual cleaner data if selected
  const activeCleanerData = selectedCleaner !== 'all' ? cleanerStatsMap[selectedCleaner] : null;

  // Handle Export CSV
  const handleExport = () => {
    const filename = `nomina_whiteglove_${filterMode}_${selectedCleaner}.csv`;
    exportPayrollToCSV(payrollList, filename);
  };

  // Generate WhatsApp summary text for screenshot / messaging
  const getWhatsAppMessage = () => {
    if (!activeCleanerData) return '';

    let text = `✨ *WHITEGLOVE PROFESSIONAL SERVICES*\n`;
    text += `📋 *RESUMEN DE LIQUIDACIÓN / NÓMINA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 *Cleaner:* ${activeCleanerData.cleaner}\n`;
    text += `📅 *Modalidad / Período:* ${dateFilterLabel}\n`;
    text += `🧹 *Turnos Realizados:* ${activeCleanerData.totalServices} turnos\n`;
    text += `⏱ *Horas Totales:* ${activeCleanerData.totalHours.toFixed(1)} hrs\n`;
    text += `💵 *Pago Base:* $${activeCleanerData.basePay.toFixed(2)} CAD\n`;
    if (activeCleanerData.tips > 0) {
      text += `🎁 *Propinas:* +$${activeCleanerData.tips.toFixed(2)} CAD\n`;
    }
    if (activeCleanerData.manualAdjustment !== 0) {
      text += `⚖️ *Ajuste / Bono:* ${activeCleanerData.manualAdjustment > 0 ? '+' : ''}$${activeCleanerData.manualAdjustment.toFixed(2)} CAD\n`;
    }
    text += `💰 *TOTAL A TRANSFERIR:* $${activeCleanerData.totalPay.toFixed(2)} CAD\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*Desglose de Turnos Realizados:*\n`;

    activeCleanerData.servicesList.forEach((s, idx) => {
      const durText = formatHoursAndMinutes(s.horas);
      const isCanc = s.status === 'cancelado';
      text += `${idx + 1}. ${isCanc ? '❌ [CANCELADO] ' : '🗓 '}${s.fecha} | 🏠 ${s.unidad} | ⏱ ${durText} | 💵 $${s.subtotal.toFixed(2)} CAD\n`;
    });

    text += `\n_Favor de revisar el desglose y corroborar de recibido. ¡Muchas gracias por tu excelente trabajo!_`;
    return text;
  };

  const copyWhatsAppSummary = () => {
    const text = getWhatsAppMessage();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const sendWhatsAppDirect = () => {
    const text = getWhatsAppMessage();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleManualAdjustmentChange = (cleanerName, val) => {
    const num = parseFloat(val) || 0;
    setManualAdjustments((prev) => ({
      ...prev,
      [cleanerName]: num
    }));
  };

  const now = new Date();

  return (
    <div className="space-y-6 w-full max-w-full">
      
      {/* 1. TOP HEADER & MAIN CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-[#0B1D4A]">
              Nómina y Liquidaciones
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0B1D4A]/10 text-[#0B1D4A] text-[11px] font-bold">
              CAD
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              {periodTypeLabel}
            </span>
            {selectedCleaner !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFB566]/20 text-[#0B1D4A] border border-[#FFB566]/60 text-[11px] font-bold">
                {selectedCleaner}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Liquidación editable semanal, quincenal o mensual. Filtra por cleaner, edita montos y envía comprobantes oficiales
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedCleaner !== 'all' && (
            <button
              onClick={() => setScreenshotMode(!screenshotMode)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all border ${
                screenshotMode
                  ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Modo optimizado para tomar screenshot limpio"
            >
              <Camera className="w-3.5 h-3.5 text-[#FFB566]" />
              <span>{screenshotMode ? 'Vista Normal' : 'Modo Screenshot'}</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER CONTROLS BAR: SEMANAL, QUINCENAL, MENSUAL & CLEANER */}
      <div className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print ${screenshotMode ? 'hidden' : ''}`}>
        
        {/* ROW A: Time Dimension Mode Selector (Semanal | Quincenal | Mensual | Rango | Histórico) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold flex-wrap">
            
            {/* 1. SEMANAL */}
            <button
              onClick={() => { setFilterMode('week'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'week'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Semanal</span>
            </button>

            {/* 2. QUINCENAL */}
            <button
              onClick={() => { setFilterMode('quincena'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'quincena'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Quincenal</span>
            </button>

            {/* 3. MENSUAL */}
            <button
              onClick={() => { setFilterMode('month'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'month'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mensual</span>
            </button>

            {/* 4. RANGO LIBRE */}
            <button
              onClick={() => { setFilterMode('custom'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'custom'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Rango Libre</span>
            </button>

            {/* 5. HISTÓRICO */}
            <button
              onClick={() => { setFilterMode('all'); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'all'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Histórico Total</span>
            </button>
          </div>

          {/* Active Period Badge */}
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B1D4A] bg-[#FFF8EC] border border-[#FFB566]/70 px-3 py-1.5 rounded-xl self-start lg:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-[#E89A45]" />
            <span>{dateFilterLabel}</span>
          </div>
        </div>

        {/* ROW B: Granular Steppers & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* WEEKLY CONTROLS */}
          {filterMode === 'week' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                  title="Semana anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-700 select-none">
                  Semana {weekOffset === 0 ? '(Actual)' : weekOffset > 0 ? `(+${weekOffset})` : `(${weekOffset})`}
                </span>
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                  title="Semana siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setWeekOffset(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  weekOffset === 0
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Esta Semana
              </button>

              <button
                onClick={() => setWeekOffset(-1)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  weekOffset === -1
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semana Pasada
              </button>

              <button
                onClick={() => setWeekOffset(-2)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  weekOffset === -2
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Hace 2 Semanas
              </button>
            </div>
          )}

          {/* QUINCENAL CONTROLS */}
          {filterMode === 'quincena' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setQuincenaOffset((prev) => prev - 1)}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                  title="Quincena anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-700 select-none">
                  Navegar Quincenas
                </span>
                <button
                  onClick={() => setQuincenaOffset((prev) => prev + 1)}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                  title="Quincena siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setQuincenaOffset(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  quincenaOffset === 0
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Esta Quincena
              </button>

              <button
                onClick={() => setQuincenaOffset(-1)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  quincenaOffset === -1
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Quincena Pasada
              </button>

              <button
                onClick={() => setQuincenaOffset(-2)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  quincenaOffset === -2
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Hace 2 Quincenas
              </button>
            </div>
          )}

          {/* MONTHLY CONTROLS */}
          {filterMode === 'month' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setMonthOffset((prev) => prev - 1)}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-700 select-none">
                  Navegar Meses
                </span>
                <button
                  onClick={() => setMonthOffset((prev) => prev + 1)}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setMonthOffset(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  monthOffset === 0
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Este Mes ({MONTH_NAMES[now.getMonth()]})
              </button>

              <button
                onClick={() => setMonthOffset(-1)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  monthOffset === -1
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Mes Anterior
              </button>

              <button
                onClick={() => setMonthOffset(-2)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  monthOffset === -2
                    ? 'bg-[#0B1D4A] text-white border-[#0B1D4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Hace 2 Meses
              </button>
            </div>
          )}

          {/* CUSTOM RANGE */}
          {filterMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Desde:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Hasta:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ROW C: Cleaner Selector Chips & Dropdown */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0B1D4A]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Filtrar por Cleaner:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCleaner}
                onChange={(e) => setSelectedCleaner(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
              >
                <option value="all">Ver Todos los Cleaners ({allCleanersList.length})</option>
                {allCleanersList.map((cs) => (
                  <option key={cs.cleaner} value={cs.cleaner}>
                    {cs.cleaner} — ${cs.totalPay.toFixed(2)} CAD ({cs.totalServices} turnos, {cs.totalHours.toFixed(1)}h)
                  </option>
                ))}
              </select>

              {selectedCleaner !== 'all' && (
                <button
                  onClick={() => setSelectedCleaner('all')}
                  className="text-xs font-bold text-[#0B1D4A] hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ver Todos</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCleaner('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCleaner === 'all'
                  ? 'bg-[#0B1D4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({allCleanersList.length})
            </button>

            {allCleanersList.map((cs) => {
              const isSelected = selectedCleaner === cs.cleaner;
              const hasEarnings = cs.totalPay > 0;
              return (
                <button
                  key={cs.cleaner}
                  onClick={() => setSelectedCleaner(cs.cleaner)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-[#FFB566] text-[#0B1D4A] border-[#FFB566] font-bold shadow-xs scale-102 ring-2 ring-[#0B1D4A]/20'
                      : hasEarnings
                      ? 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <span>{cs.cleaner}</span>
                  {hasEarnings && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-[#0B1D4A] text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      ${cs.totalPay.toFixed(0)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. CONDITIONAL RENDER: INDIVIDUAL CLEANER VOUCHER VS CONSOLIDATED TABLE */}
      {selectedCleaner !== 'all' && activeCleanerData ? (
        
        /* ========================================================================= */
        /* INDIVIDUAL CLEANER VOUCHER WITH DIRECT SERVICE EDITING & CUSTOM ADJUSTMENT */
        /* ========================================================================= */
        <div id="cleaner-voucher" className="space-y-4">
          
          {/* Header Action Bar */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print ${screenshotMode ? 'hidden' : ''}`}>
            <button
              onClick={() => setSelectedCleaner('all')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0B1D4A]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al concentrado general</span>
            </button>

            {/* Sharing & Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={sendWhatsAppDirect}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
                title="Abrir WhatsApp con el desglose de turnos"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar por WhatsApp</span>
              </button>

              <button
                onClick={copyWhatsAppSummary}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-800 stroke-[3]" />
                    <span className="text-emerald-950">¡Copiado para WhatsApp!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                title="Imprimir o guardar como PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          {/* SCREENSHOT-READY OFFICIAL VOUCHER CARD */}
          <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden print-only">
            
            {/* Watermark in Screenshot Mode */}
            {screenshotMode && (
              <div className="absolute top-2 right-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FFB566]" />
                <span>WhiteGlove Official Settlement · {periodTypeLabel}</span>
              </div>
            )}

            {/* WhiteGlove Official Emblem & Period Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.webp"
                  alt="WhiteGlove"
                  className="w-12 h-12 rounded-full object-contain ring-2 ring-[#FFB566] shrink-0"
                />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#0B1D4A] leading-tight">
                    WhiteGlove Professional Services
                  </h3>
                  <span className="text-[11px] uppercase tracking-widest text-[#E89A45] font-bold block">
                    Voucher de Liquidación & Nómina ({periodTypeLabel})
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block font-medium">Período Liquidado:</span>
                <span className="text-sm font-bold text-[#0B1D4A] block">{dateFilterLabel}</span>
                <span className="text-[11px] text-slate-400">Emisión: {now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Cleaner Identity & Grand Total Net Pill */}
            <div className="bg-[#0B1D4A] text-white p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-serif text-2xl font-bold text-[#FFB566] shrink-0">
                  {activeCleanerData.cleaner[0]}
                </div>
                <div>
                  <span className="text-xs text-slate-300 uppercase tracking-wider block font-medium">
                    Personal de Operaciones
                  </span>
                  <h4 className="font-serif text-2xl font-bold text-[#FAF7F1] leading-tight">
                    {activeCleanerData.cleaner}
                  </h4>
                  <span className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Turnos Auditados WhiteGlove</span>
                  </span>
                </div>
              </div>

              {/* Total To Transfer */}
              <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15 text-left md:text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold block">
                  Total Neto a Transferir ({periodTypeLabel})
                </span>
                <span className="text-3xl font-serif font-bold text-[#FFB566] tabular-nums block mt-0.5">
                  ${activeCleanerData.totalPay.toFixed(2)} CAD
                </span>
              </div>
            </div>

            {/* Summary Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Turnos Computados</span>
                <span className="text-xl font-bold text-[#0B1D4A] tabular-nums mt-0.5 block">
                  {activeCleanerData.totalServices} turnos
                </span>
                {activeCleanerData.cancelledServices > 0 && (
                  <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                    ({activeCleanerData.cancelledServices} cancelados)
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Horas Totales</span>
                <span className="text-xl font-bold text-[#0B1D4A] tabular-nums mt-0.5 block">
                  {activeCleanerData.totalHours.toFixed(1)} hrs
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Pago Base Horas</span>
                <span className="text-xl font-bold text-slate-800 tabular-nums mt-0.5 block">
                  ${activeCleanerData.basePay.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Propinas / Tips</span>
                <span className="text-xl font-bold text-amber-700 tabular-nums mt-0.5 block">
                  +${activeCleanerData.tips.toFixed(2)}
                </span>
              </div>
            </div>

            {/* EDITABLE MANUAL ADJUSTMENT / BONUS BAR (Only in Normal View) */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  Ajuste Extra / Bono / Deducción ({periodTypeLabel})
                </span>
                <span className="text-[11px] text-amber-700 block">
                  Modifica o agrega un bono especial o ajuste en CAD para la liquidación de {activeCleanerData.cleaner}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900">$</span>
                <input
                  type="number"
                  step="1"
                  placeholder="0.00"
                  value={manualAdjustments[activeCleanerData.cleaner] || ''}
                  onChange={(e) => handleManualAdjustmentChange(activeCleanerData.cleaner, e.target.value)}
                  className="w-28 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] tabular-nums"
                />
                <span className="text-[11px] text-amber-800 font-bold">CAD</span>
              </div>
            </div>

            {/* Individual Breakdown Table with Direct Action Buttons */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="font-serif text-sm font-bold text-[#0B1D4A]">
                  Desglose Detallado de Turnos Realizados ({activeCleanerData.servicesList.length})
                </h5>
                <span className="text-xs text-slate-400 font-medium">
                  {dateFilterLabel}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Unidad / Residencia</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3 text-center">Duración</th>
                        <th className="px-4 py-3 text-right">Pago Base</th>
                        <th className="px-4 py-3 text-right">Propina</th>
                        <th className="px-4 py-3 text-right font-bold text-[#0B1D4A]">Subtotal</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                        {onEditService && <th className="px-4 py-3 text-center no-print">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCleanerData.servicesList.map((svc, idx) => {
                        const isCanc = svc.status === 'cancelado';
                        const durText = formatHoursAndMinutes(svc.horas);

                        return (
                          <tr
                            key={svc.id || idx}
                            className={`transition-colors ${
                              isCanc ? 'bg-rose-50/40 text-slate-400' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                              <span className={isCanc ? 'line-through text-slate-400' : ''}>
                                {svc.fecha}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-medium text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className={`font-semibold ${isCanc ? 'line-through text-slate-400' : ''}`}>{svc.unidad}</span>
                              </div>
                              {svc.coCleaners.length > 0 && (
                                <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                                  En equipo con: {svc.coCleaners.join(', ')}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium">
                                {svc.tipo}
                              </span>
                            </td>

                            {/* Duración (Horas y Minutos) */}
                            <td className="px-4 py-3 text-center font-bold tabular-nums whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100">
                                {durText}
                              </span>
                              {Number(svc.horas) % 1 !== 0 && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  ({svc.horas}h)
                                </span>
                              )}
                            </td>

                            <td className={`px-4 py-3 text-right tabular-nums ${isCanc ? 'line-through text-slate-400' : ''}`}>
                              ${svc.pagoBase.toFixed(2)}
                            </td>

                            <td className={`px-4 py-3 text-right font-bold tabular-nums ${isCanc ? 'line-through text-slate-400' : 'text-amber-700'}`}>
                              {svc.tip > 0 ? `+$${svc.tip.toFixed(2)}` : '—'}
                            </td>

                            <td className={`px-4 py-3 text-right font-bold tabular-nums text-xs ${isCanc ? 'line-through text-slate-400' : 'text-[#0B1D4A]'}`}>
                              ${svc.subtotal.toFixed(2)}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isCanc
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}>
                                {isCanc ? 'Cancelado' : 'Activo'}
                              </span>
                            </td>

                            {/* Direct Actions in Voucher Table */}
                            {onEditService && (
                              <td className="px-4 py-3 text-center no-print whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => onEditService(svc.rawService)}
                                    className="p-1.5 text-slate-600 hover:text-[#0B1D4A] hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Editar datos de este servicio"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {onCancelService && (
                                    <button
                                      onClick={() => onCancelService(svc.id, isCanc ? 'activo' : 'cancelado')}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        isCanc
                                          ? 'text-emerald-700 hover:bg-emerald-100'
                                          : 'text-amber-700 hover:bg-amber-100'
                                      }`}
                                      title={isCanc ? 'Reactivar turno' : 'Cancelar turno'}
                                    >
                                      {isCanc ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {activeCleanerData.servicesList.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                            No hay turnos registrados para {activeCleanerData.cleaner} en {dateFilterLabel}.
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {activeCleanerData.servicesList.length > 0 && (
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-slate-800 font-serif">
                            Total General Liquidación ({activeCleanerData.cleaner}):
                          </td>
                          <td className="px-4 py-3 text-center text-slate-900 tabular-nums font-bold">
                            {activeCleanerData.totalHours.toFixed(1)} h
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums font-bold">
                            ${activeCleanerData.basePay.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-700 tabular-nums font-bold">
                            +${activeCleanerData.tips.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-[#0B1D4A] tabular-nums text-sm font-serif font-bold">
                            ${activeCleanerData.totalPay.toFixed(2)} CAD
                          </td>
                          <td></td>
                          {onEditService && <td className="no-print"></td>}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* Voucher Footer Disclaimer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span>WhiteGlove Professional Services · Liquidación {periodTypeLabel}</span>
              <span>Comprobante digital para corroboración de turnos, minutos y pago</span>
            </div>

          </div>
        </div>

      ) : (

        /* ========================================================================= */
        /* CONSOLIDATED ALL-CLEANERS VIEW                                            */
        /* ========================================================================= */
        <div className="space-y-6">
          
          {/* Summary Banner */}
          <div className="bg-[#0B1D4A] text-white p-5 sm:p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold block">
                Monto Total a Dispersar ({activeCleanersCount} cleaners con turnos)
              </span>
              <span className="text-3xl sm:text-4xl font-bold font-serif text-[#FFB566] tabular-nums mt-1 block">
                ${totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Modalidad: <strong className="text-white">{periodTypeLabel}</strong> · {dateFilterLabel}
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-xs text-slate-300 border-l border-slate-700/80 pl-6">
              <div>
                <span className="text-slate-400 block font-medium">Horas Acumuladas</span>
                <span className="text-base font-bold text-white tabular-nums">{totalPayrollHours.toFixed(1)} hrs</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Promedio por Hora</span>
                <span className="text-base font-bold text-white tabular-nums">
                  ${totalPayrollHours > 0 ? (totalPayroll / totalPayrollHours).toFixed(2) : '0.00'}/h
                </span>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cleaner en la nómina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white shadow-xs"
            />
          </div>

          {/* Consolidated Cleaners Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Cleaner</th>
                    <th className="px-5 py-3.5 text-center">Turnos Realizados</th>
                    <th className="px-5 py-3.5 text-right">Horas Acumuladas</th>
                    <th className="px-5 py-3.5 text-right">Pago Base</th>
                    <th className="px-5 py-3.5 text-right">Tips</th>
                    <th className="px-5 py-3.5 text-right font-bold text-[#0B1D4A]">Total Liquidación ({periodTypeLabel})</th>
                    <th className="px-5 py-3.5 text-center">Comprobante Individual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollList.map((row) => (
                    <tr
                      key={row.cleaner}
                      onClick={() => setSelectedCleaner(row.cleaner)}
                      className="hover:bg-amber-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0B1D4A] text-[#FFB566] flex items-center justify-center text-[11px] font-bold shrink-0">
                          {row.cleaner[0]}
                        </div>
                        <span className="group-hover:text-[#0B1D4A] group-hover:underline">{row.cleaner}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-600 tabular-nums font-medium">
                        {row.totalServices} turnos
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                        {row.totalHours.toFixed(1)} h
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-700 tabular-nums">
                        ${row.basePay.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-amber-700 font-bold tabular-nums">
                        {row.tips > 0 ? `+$${row.tips.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#0B1D4A] tabular-nums text-sm font-serif">
                        ${row.totalPay.toFixed(2)} CAD
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCleaner(row.cleaner);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-[#FFB566] hover:text-[#0B1D4A] text-slate-700 text-[11px] font-bold rounded-lg transition-colors shadow-2xs"
                        >
                          <span>Ver Voucher</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payrollList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        No se encontraron registros de cleaners para {dateFilterLabel}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
