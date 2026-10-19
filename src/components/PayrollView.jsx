import React, { useState, useMemo } from 'react';
import {
  DollarSign, Download, Users, Clock, Search, Gift,
  Calendar, Check, Copy, UserCheck, ChevronRight, ChevronLeft,
  Sparkles, ArrowLeft, CheckCircle2, Building2, Printer,
  Share2, Camera, Eye, Filter, ArrowRight, Edit2, Ban, Plus, RotateCcw,
  History, CreditCard, AlertCircle, FileText, X, CheckSquare, ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { exportPayrollToCSV } from '../lib/export';
import { formatHoursAndMinutes } from './ServicesList';
import {
  getPayrollPayments,
  getCleanerPaymentStatus,
  markCleanerPayrollAsPaid,
  markCleanerPayrollAsPending,
  getAllPaymentHistory,
  exportPaymentHistoryToCSV,
  formatPaymentDate,
  buildPaymentKey,
} from '../lib/payrollPayments';

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
  currentUser,
}) {
  // Top Level Payroll Tab: 'current' (Control de Nómina) | 'history' (Historial de Pagos)
  const [payrollTab, setPayrollTab] = useState('current');

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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pendiente' | 'pagado'
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);

  // Manual Adjustments per cleaner for this period (e.g. bonus, reimbursement, deduction)
  const [manualAdjustments, setManualAdjustments] = useState({});

  // Payment Status Management (stored in localStorage)
  const [paymentsMap, setPaymentsMap] = useState(() => getPayrollPayments());

  // Payment Modal States
  const [payModalTarget, setPayModalTarget] = useState(null); // { cleaner, amount, hours, servicesCount, periodLabel, periodType, periodKey }
  const [payMethod, setPayMethod] = useState('Interac E-Transfer');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Revert Confirmation Modal State
  const [revertTarget, setRevertTarget] = useState(null); // { cleaner, periodKey, periodLabel }

  // Receipt Modal State (for viewing full payment receipt)
  const [receiptModalRecord, setReceiptModalRecord] = useState(null);

  // History Tab states
  const [historySearch, setHistorySearch] = useState('');
  const [historyCleanerFilter, setHistoryCleanerFilter] = useState('all');

  const adminName = currentUser?.displayName || currentUser?.username || 'Administrador';

  // Compute active date range and descriptive label + stable periodKey
  const { dateFilterLabel, isDateInRange, periodTypeLabel, periodKey } = useMemo(() => {
    if (filterMode === 'all') {
      return {
        dateFilterLabel: 'Histórico Completo (Todos los registros)',
        periodTypeLabel: 'Histórico',
        periodKey: 'all_records',
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
        periodKey: `week_${activeWeek.startStr}_${activeWeek.endStr}`,
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
        periodKey: `quincena_${qRange.startStr}_${qRange.endStr}`,
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
        periodKey: `month_${monthPrefix}`,
        isDateInRange: (fechaStr) => fechaStr && fechaStr.startsWith(monthPrefix)
      };
    }

    if (filterMode === 'custom') {
      return {
        dateFilterLabel: `Rango: ${customStart} al ${customEnd}`,
        periodTypeLabel: 'Personalizado',
        periodKey: `custom_${customStart}_${customEnd}`,
        isDateInRange: (fechaStr) => {
          if (!fechaStr) return false;
          return fechaStr >= customStart && fechaStr <= customEnd;
        }
      };
    }

    return {
      dateFilterLabel: 'Todos los registros',
      periodTypeLabel: 'Total',
      periodKey: 'all_records',
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

  // Status metrics for all cleaners in active period
  const { totalPendientesCount, totalPendientesAmount, totalPagadosCount, totalPagadosAmount } = useMemo(() => {
    let pendCount = 0;
    let pendAmount = 0;
    let pagCount = 0;
    let pagAmount = 0;

    allCleanersList.forEach((cs) => {
      if (cs.totalServices === 0 && cs.totalPay === 0) return;
      const pKey = buildPaymentKey(cs.cleaner, periodKey);
      const isPaid = paymentsMap[pKey]?.status === 'pagado';
      if (isPaid) {
        pagCount += 1;
        pagAmount += cs.totalPay;
      } else {
        pendCount += 1;
        pendAmount += cs.totalPay;
      }
    });

    return {
      totalPendientesCount: pendCount,
      totalPendientesAmount: pendAmount,
      totalPagadosCount: pagCount,
      totalPagadosAmount: pagAmount,
    };
  }, [allCleanersList, paymentsMap, periodKey]);

  // Consolidated table list (sorted by totalPay and filtered by status)
  const payrollList = useMemo(() => {
    const list = allCleanersList
      .map((cs) => {
        const pKey = buildPaymentKey(cs.cleaner, periodKey);
        const record = paymentsMap[pKey] || null;
        const isPaid = record && record.status === 'pagado';
        return {
          ...cs,
          paymentRecord: record,
          isPaid,
          paymentStatus: isPaid ? 'pagado' : 'pendiente',
        };
      })
      .filter((cs) => cs.cleaner.toLowerCase().includes(searchTerm.toLowerCase()));

    let filtered = list;
    if (statusFilter === 'pendiente') {
      filtered = list.filter((cs) => !cs.isPaid);
    } else if (statusFilter === 'pagado') {
      filtered = list.filter((cs) => cs.isPaid);
    }

    return filtered.sort((a, b) => b.totalPay - a.totalPay);
  }, [allCleanersList, searchTerm, paymentsMap, periodKey, statusFilter]);

  // Overall totals in the period
  const totalPayroll = useMemo(() => {
    return allCleanersList.reduce((sum, item) => sum + item.totalPay, 0);
  }, [allCleanersList]);

  const totalPayrollHours = useMemo(() => {
    return allCleanersList.reduce((sum, item) => sum + item.totalHours, 0);
  }, [allCleanersList]);

  const activeCleanersCount = useMemo(() => {
    return allCleanersList.filter((cs) => cs.totalServices > 0).length;
  }, [allCleanersList]);

  // Overall team payout in this period
  const totalTeamPayroll = useMemo(() => {
    return servicesInPeriod.reduce((sum, s) => {
      if (s.status === 'cancelado') return sum;
      return sum + (Number(s.pagoCleaningTeam) || 0);
    }, 0);
  }, [servicesInPeriod]);

  // Active individual cleaner data if selected
  const activeCleanerData = selectedCleaner !== 'all' ? cleanerStatsMap[selectedCleaner] : null;
  const activeCleanerPayment = activeCleanerData ? paymentsMap[buildPaymentKey(activeCleanerData.cleaner, periodKey)] : null;
  const isActiveCleanerPaid = activeCleanerPayment?.status === 'pagado';

  // Handle opening payment modal
  const handleOpenPayModal = (cleanerRow) => {
    setPayModalTarget({
      cleaner: cleanerRow.cleaner,
      amount: cleanerRow.totalPay,
      hours: cleanerRow.totalHours,
      servicesCount: cleanerRow.totalServices,
      periodLabel: dateFilterLabel,
      periodType: periodTypeLabel,
      periodKey: periodKey,
    });
    setPayMethod('Interac E-Transfer');
    setPayReference('');
    setPayNotes('');
  };

  // Confirm payment registration
  const handleConfirmPayment = (e) => {
    e?.preventDefault();
    if (!payModalTarget) return;

    markCleanerPayrollAsPaid(payModalTarget.cleaner, payModalTarget.periodKey, {
      periodLabel: payModalTarget.periodLabel,
      periodType: payModalTarget.periodType,
      amount: payModalTarget.amount,
      hours: payModalTarget.hours,
      servicesCount: payModalTarget.servicesCount,
      paymentMethod: payMethod,
      reference: payReference.trim(),
      notes: payNotes.trim(),
      markedBy: adminName,
    });

    setPaymentsMap(getPayrollPayments());
    setPayModalTarget(null);
  };

  // Revert payment
  const handleConfirmRevert = () => {
    if (!revertTarget) return;
    markCleanerPayrollAsPending(revertTarget.cleaner, revertTarget.periodKey);
    setPaymentsMap(getPayrollPayments());
    setRevertTarget(null);
  };

  // Handle Export CSV of current period
  const handleExport = () => {
    const filename = `nomina_whiteglove_${filterMode}_${selectedCleaner}.csv`;
    exportPayrollToCSV(payrollList, filename);
  };

  // All payment history list
  const fullPaymentHistory = useMemo(() => {
    const all = getAllPaymentHistory();
    return all.filter((rec) => {
      if (historyCleanerFilter !== 'all' && rec.cleaner !== historyCleanerFilter) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const str = `${rec.cleaner} ${rec.periodLabel} ${rec.reference} ${rec.paymentMethod} ${rec.notes} ${rec.id}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [historyCleanerFilter, historySearch, paymentsMap]);

  // Overall history statistics
  const historyStats = useMemo(() => {
    const all = getAllPaymentHistory();
    const totalPaid = all.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const distinctCleaners = new Set(all.map((r) => r.cleaner)).size;
    return {
      totalPaid,
      count: all.length,
      distinctCleaners,
    };
  }, [paymentsMap]);

  // Generate WhatsApp summary text for screenshot / messaging
  const getWhatsAppMessage = () => {
    if (!activeCleanerData) return '';

    let text = `✨ *WHITEGLOVE PROFESSIONAL SERVICES*\n`;
    text += `📋 *RESUMEN DE NÓMINA Y CONTROL DE PAGOS*\n`;
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
    if (isActiveCleanerPaid) {
      text += `✅ *ESTADO:* PAGADO (${activeCleanerPayment?.paidDateFormatted || 'Completado'})\n`;
      if (activeCleanerPayment?.reference) {
        text += `🔖 *Referencia:* ${activeCleanerPayment.reference}\n`;
      }
    } else {
      text += `⏳ *ESTADO:* PENDIENTE DE PAGO\n`;
    }
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
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-serif font-bold text-[#0B1D4A]">
              Nómina y Control de Pagos
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
            Control de nómina semanal, quincenal o mensual. Filtra por cleaner, marca pagos de pendiente a pagado y gestiona comprobantes oficiales
          </p>
        </div>

        {/* View Switcher: Current Period Payroll vs History */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => { setPayrollTab('current'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                payrollTab === 'current'
                  ? 'bg-[#0B1D4A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Control de Nómina</span>
            </button>
            <button
              onClick={() => { setPayrollTab('history'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                payrollTab === 'history'
                  ? 'bg-[#0B1D4A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#FFB566]" />
              <span>Historial de Pagos</span>
              {historyStats.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  payrollTab === 'history' ? 'bg-[#FFB566] text-[#0B1D4A]' : 'bg-slate-200 text-slate-700'
                }`}>
                  {historyStats.count}
                </span>
              )}
            </button>
          </div>

          {payrollTab === 'current' && selectedCleaner !== 'all' && (
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

          {payrollTab === 'current' ? (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar CSV</span>
            </button>
          ) : (
            <button
              onClick={() => exportPaymentHistoryToCSV(fullPaymentHistory)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0B1D4A] hover:bg-[#152e75] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#FFB566]" />
              <span>Exportar Historial CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CURRENT PAYROLL PERIOD VIEW                                        */}
      {/* ========================================================================= */}
      {payrollTab === 'current' && (
        <div className="space-y-6">

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
                      Navegar Semanas
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
                  const pKey = buildPaymentKey(cs.cleaner, periodKey);
                  const isPaid = paymentsMap[pKey]?.status === 'pagado';
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
                      {isPaid && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Nómina Pagada" />
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
            /* INDIVIDUAL CLEANER VOUCHER WITH PAYMENT STATUS & ACTION                   */
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

              {/* PAYMENT STATUS CALLOUT CARD */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all no-print ${
                isActiveCleanerPaid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isActiveCleanerPaid ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {isActiveCleanerPaid ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-bold">
                          Estado de la Nómina:
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          isActiveCleanerPaid
                            ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                            : 'bg-amber-200 text-amber-900 border border-amber-400'
                        }`}>
                          {isActiveCleanerPaid ? 'PAGADO' : 'PENDIENTE DE PAGO'}
                        </span>
                      </div>

                      {isActiveCleanerPaid ? (
                        <p className="text-xs text-emerald-800 mt-1 font-medium">
                          Nómina transferida el <strong>{activeCleanerPayment.paidDateFormatted}</strong> por <strong>{activeCleanerPayment.markedBy || 'Admin'}</strong> mediante <strong>{activeCleanerPayment.paymentMethod}</strong>
                          {activeCleanerPayment.reference && <span> (Ref: <code>{activeCleanerPayment.reference}</code>)</span>}.
                        </p>
                      ) : (
                        <p className="text-xs text-amber-800 mt-1 font-medium">
                          Esta nómina de <strong>${activeCleanerData.totalPay.toFixed(2)} CAD</strong> ({activeCleanerData.totalHours.toFixed(1)} hrs en {activeCleanerData.totalServices} turnos) está pendiente de dispersión para {dateFilterLabel}.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    {isActiveCleanerPaid ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setReceiptModalRecord(activeCleanerPayment)}
                          className="px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Ver Comprobante</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevertTarget({
                            cleaner: activeCleanerData.cleaner,
                            periodKey,
                            periodLabel: dateFilterLabel
                          })}
                          className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-300 text-xs font-semibold rounded-xl transition-all"
                        >
                          Revertir a Pendiente
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenPayModal(activeCleanerData)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Marcar esta Nómina como Pagada</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SCREENSHOT-READY OFFICIAL VOUCHER CARD */}
              <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden print-only">
                
                {/* Watermark in Screenshot Mode */}
                {screenshotMode && (
                  <div className="absolute top-2 right-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#FFB566]" />
                    <span>WhiteGlove Official Payroll Receipt · {periodTypeLabel}</span>
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
                        Comprobante Oficial de Nómina & Pago ({periodTypeLabel})
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block font-medium">Período de Nómina:</span>
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Turnos Auditados WhiteGlove</span>
                        </span>
                        {isActiveCleanerPaid && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
                            PAGADO
                          </span>
                        )}
                      </div>
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
                        +{activeCleanerData.cancelledServices} turnos cancelados
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium block">Horas Efectivas</span>
                    <span className="text-xl font-bold text-[#0B1D4A] tabular-nums mt-0.5 block">
                      {activeCleanerData.totalHours.toFixed(1)} hrs
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {formatHoursAndMinutes(activeCleanerData.totalHours)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium block">Pago Base Turnos</span>
                    <span className="text-xl font-bold text-[#0B1D4A] tabular-nums mt-0.5 block">
                      ${activeCleanerData.basePay.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Sin propinas ni bonos
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium block">Propinas Ganadas</span>
                    <span className="text-xl font-bold text-amber-700 tabular-nums mt-0.5 block">
                      +${activeCleanerData.tips.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      100% para el cleaner
                    </span>
                  </div>
                </div>

                {/* Manual Adjustment Widget */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  activeCleanerData.manualAdjustment !== 0
                    ? 'bg-amber-50/80 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">
                      Ajuste Extra / Bono / Deducción ({periodTypeLabel})
                    </span>
                    <span className="text-[11px] text-amber-700 block">
                      Modifica o agrega un bono especial o ajuste en CAD para la nómina de {activeCleanerData.cleaner}
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
                          {activeCleanerData.servicesList.map((svc) => {
                            const isCancelled = svc.status === 'cancelado';
                            return (
                              <tr
                                key={svc.id}
                                className={`transition-colors ${
                                  isCancelled
                                    ? 'bg-rose-50/50 text-slate-400 line-through'
                                    : 'hover:bg-amber-50/40 text-slate-800'
                                }`}
                              >
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                  {svc.fecha}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{svc.unidad}</span>
                                    {svc.coCleaners?.length > 0 && (
                                      <span className="text-[10px] text-slate-500 font-normal no-underline">
                                        (con {svc.coCleaners.join(', ')})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                    {svc.tipo}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center tabular-nums whitespace-nowrap">
                                  {formatHoursAndMinutes(svc.horas)}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                                  ${svc.pagoBase.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-amber-700 font-semibold tabular-nums whitespace-nowrap">
                                  {svc.tip > 0 ? `+$${svc.tip.toFixed(2)}` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-[#0B1D4A] tabular-nums whitespace-nowrap">
                                  ${svc.subtotal.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  {isCancelled ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                      <Ban className="w-3 h-3 text-rose-600" /> Cancelado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completado
                                    </span>
                                  )}
                                </td>
                                {onEditService && (
                                  <td className="px-4 py-3 text-center no-print whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => onEditService(svc.rawService)}
                                      className="p-1 hover:bg-[#FFB566]/20 text-slate-600 hover:text-[#0B1D4A] rounded-lg transition-colors"
                                      title="Editar monto o turno en el servicio original"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                        {activeCleanerData.servicesList.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-slate-800 font-serif">
                                Total General de Nómina ({activeCleanerData.cleaner}):
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
                  <span>WhiteGlove Professional Services · Nómina y Control de Pagos {periodTypeLabel}</span>
                  <span>Comprobante digital para corroboración de turnos, minutos y pago</span>
                </div>

              </div>
            </div>

          ) : (

            /* ========================================================================= */
            /* CONSOLIDATED ALL-CLEANERS VIEW WITH PAYMENT STATUS COLUMN                 */
            /* ========================================================================= */
            <div className="space-y-6">
              
              {/* Summary Banner with Payment Pending & Paid KPIs */}
              <div className="bg-[#0B1D4A] text-white p-5 sm:p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold block">
                    Monto Total de Nómina ({activeCleanersCount} cleaners con turnos)
                  </span>
                  <span className="text-3xl sm:text-4xl font-bold font-serif text-[#FFB566] tabular-nums mt-1 block">
                    ${totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Modalidad: <strong className="text-white">{periodTypeLabel}</strong> · {dateFilterLabel}
                  </span>
                </div>
                
                <div className="flex items-center gap-6 text-xs text-slate-300 border-l border-slate-700/80 pl-6 flex-wrap">
                  <div>
                    <span className="text-amber-400 block font-bold uppercase tracking-wider text-[10px]">
                      ⏳ Pendiente de Pago
                    </span>
                    <span className="text-base font-bold text-amber-300 tabular-nums">
                      ${totalPendientesAmount.toFixed(2)} CAD
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({totalPendientesCount} cleaners)
                    </span>
                  </div>

                  <div>
                    <span className="text-emerald-400 block font-bold uppercase tracking-wider text-[10px]">
                      ✅ Pagado en Período
                    </span>
                    <span className="text-base font-bold text-emerald-300 tabular-nums">
                      ${totalPagadosAmount.toFixed(2)} CAD
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({totalPagadosCount} cleaners)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Horas Totales</span>
                    <span className="text-base font-bold text-white tabular-nums">{totalPayrollHours.toFixed(1)} hrs</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Pago a Teams</span>
                    <span className="text-base font-bold text-sky-300 tabular-nums">${totalTeamPayroll.toFixed(2)} CAD</span>
                  </div>
                </div>
              </div>

              {/* Status Tabs and Quick Search Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Status Filter Tabs (Todos, Pendientes, Pagados) */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'all'
                        ? 'bg-[#0B1D4A] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({allCleanersList.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('pendiente')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'pendiente'
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'text-amber-900 hover:bg-amber-100/60'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pendientes ({totalPendientesCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('pagado')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'pagado'
                        ? 'bg-emerald-700 text-white shadow-xs font-bold'
                        : 'text-emerald-900 hover:bg-emerald-100/60'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pagados ({totalPagadosCount})</span>
                  </button>
                </div>

                {/* Quick Search */}
                <div className="relative max-w-xs w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar cleaner en la nómina..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white shadow-xs"
                  />
                </div>
              </div>

              {/* Consolidated Cleaners Table with Estado de Pago Column */}
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
                        <th className="px-5 py-3.5 text-right font-bold text-[#0B1D4A]">Total Nómina ({periodTypeLabel})</th>
                        <th className="px-5 py-3.5 text-center">Estado de Pago</th>
                        <th className="px-5 py-3.5 text-center">Comprobante Individual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payrollList.map((row) => {
                        const isPaid = row.isPaid;
                        const rec = row.paymentRecord;
                        return (
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

                            {/* ESTADO DE PAGO COLUMN */}
                            <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              {isPaid ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Pagado</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                    {rec?.paidDateFormatted?.split(',')[0] || 'Completado'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setRevertTarget({
                                      cleaner: row.cleaner,
                                      periodKey,
                                      periodLabel: dateFilterLabel
                                    })}
                                    className="text-[10px] text-slate-400 hover:text-rose-600 underline font-medium"
                                    title="Revertir este pago a pendiente"
                                  >
                                    Revertir
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex flex-col items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Pendiente</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPayModal(row)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-2xs active:scale-95"
                                    title="Marcar nómina de este cleaner como pagada"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Marcar Pagado</span>
                                  </button>
                                </div>
                              )}
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
                        );
                      })}
                      {payrollList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                            No se encontraron registros de cleaners para {dateFilterLabel} con el filtro aplicado.
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIAL DE PAGOS DE NÓMINA                                       */}
      {/* ========================================================================= */}
      {payrollTab === 'history' && (
        <div className="space-y-6">
          
          {/* History KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0B1D4A] text-white p-5 rounded-2xl shadow-sm border border-[#1E3670]">
              <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold block">
                Total Pagado Histórico
              </span>
              <span className="text-3xl font-bold font-serif text-[#FFB566] tabular-nums mt-1 block">
                ${historyStats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Suma acumulada de todas las nóminas registradas como pagadas
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                Comprobantes de Pago Registrados
              </span>
              <span className="text-3xl font-bold font-serif text-[#0B1D4A] tabular-nums mt-1 block">
                {historyStats.count} pagos
              </span>
              <span className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Auditoría de nóminas archivadas</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                Cleaners Beneficiarios
              </span>
              <span className="text-3xl font-bold font-serif text-[#0B1D4A] tabular-nums mt-1 block">
                {historyStats.distinctCleaners} cleaners
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Con al menos una nómina pagada
              </span>
            </div>
          </div>

          {/* History Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative min-w-[260px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar en historial (cleaner, período, referencia, método)..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white"
                />
              </div>

              {/* Cleaner Filter */}
              <select
                value={historyCleanerFilter}
                onChange={(e) => setHistoryCleanerFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
              >
                <option value="all">Todos los cleaners</option>
                {cleaners.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => exportPaymentHistoryToCSV(fullPaymentHistory)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Descargar CSV</span>
            </button>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Cleaner</th>
                    <th className="px-5 py-3.5">Período de Nómina</th>
                    <th className="px-5 py-3.5">Fecha y Hora de Pago</th>
                    <th className="px-5 py-3.5 text-center">Turnos / Horas</th>
                    <th className="px-5 py-3.5 text-right font-bold text-[#0B1D4A]">Monto Pagado</th>
                    <th className="px-5 py-3.5">Método & Ref</th>
                    <th className="px-5 py-3.5">Registrado Por</th>
                    <th className="px-5 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fullPaymentHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0B1D4A] text-[#FFB566] flex items-center justify-center text-[11px] font-bold shrink-0">
                          {rec.cleaner[0]}
                        </div>
                        <span>{rec.cleaner}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        <span className="block font-semibold text-slate-800">{rec.periodLabel}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{rec.periodType}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{rec.paidDateFormatted || rec.paidAt}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-700 font-medium whitespace-nowrap">
                        <span>{rec.servicesCount} turnos</span> · <span className="text-slate-500">{rec.hours.toFixed(1)} h</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#0B1D4A] tabular-nums text-sm font-serif">
                        ${rec.amount.toFixed(2)} CAD
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        <span className="block font-semibold text-slate-800">{rec.paymentMethod}</span>
                        {rec.reference ? (
                          <span className="text-[10px] text-slate-500 font-mono">Ref: {rec.reference}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin referencia</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-[11px] font-medium">
                        {rec.markedBy || 'Admin'}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReceiptModalRecord(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-[#FFB566] hover:text-[#0B1D4A] text-slate-700 text-[11px] font-bold rounded-lg transition-colors shadow-2xs"
                            title="Ver Comprobante Digital Oficial"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Comprobante</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevertTarget({
                              cleaner: rec.cleaner,
                              periodKey: rec.periodKey,
                              periodLabel: rec.periodLabel
                            })}
                            className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[10px] font-bold rounded-lg transition-colors"
                            title="Revertir este pago a pendiente"
                          >
                            Revertir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {fullPaymentHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-2">
                          <History className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-600 text-sm">
                            No hay nóminas registradas como pagadas todavía
                          </p>
                          <p className="text-xs text-slate-400">
                            Ve a la pestaña <strong>Control de Nómina</strong> y usa el botón <strong>"Marcar Pagado"</strong> en cualquier cleaner para que se archive y se guarde automáticamente aquí.
                          </p>
                          <button
                            onClick={() => setPayrollTab('current')}
                            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B1D4A] text-white text-xs font-bold rounded-xl"
                          >
                            Ir a Control de Nómina
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR Y MARCAR PAGO DE NÓMINA                                */}
      {/* ========================================================================= */}
      {payModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            
            {/* Modal Header */}
            <div className="bg-[#0B1D4A] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FFB566] text-[#0B1D4A] rounded-xl font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold leading-tight">
                    Registrar Pago de Nómina
                  </h3>
                  <span className="text-xs text-slate-300 block">
                    {payModalTarget.cleaner} · {payModalTarget.periodLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModalTarget(null)}
                className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              
              {/* Payment Summary Box */}
              <div className="bg-[#FFF8EC] border border-[#FFB566]/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-amber-900 font-bold block">
                    Monto Total a Pagar ({payModalTarget.periodType})
                  </span>
                  <span className="text-3xl font-serif font-bold text-[#0B1D4A] tabular-nums mt-0.5 block">
                    ${payModalTarget.amount.toFixed(2)} CAD
                  </span>
                  <span className="text-xs text-amber-800 mt-0.5 block">
                    {payModalTarget.hours.toFixed(1)} hrs acumuladas en {payModalTarget.servicesCount} turnos
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Estado resultante:</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pagado</span>
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                >
                  <option value="Interac E-Transfer">Interac E-Transfer (Recomendado)</option>
                  <option value="Transferencia Bancaria Directa">Transferencia Bancaria Directa</option>
                  <option value="Efectivo (Cash)">Efectivo (Cash)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Depósito Directo">Depósito Directo</option>
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de Referencia / Folio Bancario (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. ET-948271, Depósito #102, o confirmation code..."
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas u Observaciones del Pago (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Ej. Pagado puntual por e-transfer, propinas agregadas completas..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0B1D4A] bg-[#FFB566] hover:bg-[#E89A45] rounded-xl shadow-xs transition-all active:scale-98 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#0B1D4A]" />
                  <span>Confirmar y Marcar como Pagado</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRMAR REVERTIR PAGO A PENDIENTE                             */}
      {/* ========================================================================= */}
      {revertTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-100 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-slate-900 leading-tight">
                  ¿Revertir estado a Pendiente?
                </h4>
                <span className="text-xs text-slate-500">
                  {revertTarget.cleaner} · {revertTarget.periodLabel}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              El estado de la nómina de <strong>{revertTarget.cleaner}</strong> cambiará de <strong>Pagado</strong> a <strong>Pendiente de Pago</strong>. Esta acción reabrirá la nómina para su dispersión.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevertTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Sí, Revertir a Pendiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: COMPROBANTE DIGITAL OFICIAL DE PAGO                              */}
      {/* ========================================================================= */}
      {receiptModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 space-y-0">
            
            {/* Header */}
            <div className="bg-[#0B1D4A] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.webp"
                  alt="WhiteGlove"
                  className="w-10 h-10 rounded-full object-contain ring-2 ring-[#FFB566]"
                />
                <div>
                  <h3 className="font-serif text-base font-bold text-white leading-tight">
                    Comprobante de Pago de Nómina
                  </h3>
                  <span className="text-[11px] text-[#FFB566] font-mono block">
                    ID: {receiptModalRecord.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalRecord(null)}
                className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Details */}
            <div className="p-6 space-y-4 text-xs">
              
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold block">
                    Monto Transferido
                  </span>
                  <span className="text-3xl font-serif font-bold text-[#0B1D4A] block mt-0.5">
                    ${receiptModalRecord.amount.toFixed(2)} CAD
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-200 text-emerald-900 font-bold rounded-full text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    PAGADO
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Auditado & Aprobado</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[11px] block">Cleaner:</span>
                  <span className="font-bold text-slate-800 text-sm">{receiptModalRecord.cleaner}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Modalidad:</span>
                  <span className="font-bold text-slate-800">{receiptModalRecord.periodType}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Período:</span>
                  <span className="font-bold text-slate-800">{receiptModalRecord.periodLabel}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Horas / Turnos:</span>
                  <span className="font-bold text-slate-800">{receiptModalRecord.hours.toFixed(1)} h ({receiptModalRecord.servicesCount} turnos)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Fecha de Pago:</span>
                  <span className="font-bold text-slate-800">{receiptModalRecord.paidDateFormatted}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Método de Pago:</span>
                  <span className="font-bold text-slate-800">{receiptModalRecord.paymentMethod}</span>
                </div>
              </div>

              {receiptModalRecord.reference && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Referencia / Folio Bancario
                  </span>
                  <span className="font-mono font-bold text-slate-800">{receiptModalRecord.reference}</span>
                </div>
              )}

              {receiptModalRecord.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Notas / Observaciones
                  </span>
                  <p className="text-slate-700 mt-0.5">{receiptModalRecord.notes}</p>
                </div>
              )}

              <div className="pt-2 text-[11px] text-slate-400 text-center">
                Registrado por <strong>{receiptModalRecord.markedBy || 'Administrador'}</strong> · WhiteGlove Suite
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comprobante</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptModalRecord(null)}
                className="px-4 py-1.5 bg-[#0B1D4A] text-white text-xs font-bold rounded-xl"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
