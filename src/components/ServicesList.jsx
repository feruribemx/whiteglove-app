import React, { useState } from 'react';
import {
  Search, Download, Plus, Edit2, Trash2, User, Clock, DollarSign,
  Sparkles, Ban, RotateCcw, CheckCircle2, Building2, Calendar, BookOpen, X, Filter, Copy
} from 'lucide-react';
import { hasFullAccess, canManagePagos } from '../lib/auth';
import { exportServicesToCSV } from '../lib/export';

// Helper to format decimal hours into hours & minutes
export function formatHoursAndMinutes(decimalHours) {
  const num = Number(decimalHours) || 0;
  const wholeH = Math.floor(num);
  const mins = Math.round((num - wholeH) * 60);

  if (mins === 0) {
    return `${wholeH}h`;
  }
  return `${wholeH}h ${mins}m`;
}

// Accent and case insensitive text normalization for intelligent search
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function ServicesList({
  services = [],
  currentUser,
  onEditService,
  onDeleteService,
  onCancelService,
  onOpenNewService,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cleanerFilter, setCleanerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'activo' | 'cancelado'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  const showFinancials = hasFullAccess(currentUser);
  const canEdit = canManagePagos(currentUser);
  const isCleaner = Boolean(
    currentUser && (
      (currentUser.role || '').toLowerCase() === 'cleaner' ||
      (currentUser.role !== 'admin' && !['fernandouribe', 'michelleadmin', 'fercastil'].includes((currentUser.username || '').toLowerCase()))
    )
  );
  const cleanerName = (currentUser?.displayName || currentUser?.username || '').trim();

  // Extract distinct cleaners for filtering
  const allCleanersSet = new Set();
  services.forEach((s) => {
    (s.cleaners || []).forEach((c) => allCleanersSet.add(c));
    if (s.cleaner) allCleanersSet.add(s.cleaner);
  });
  const cleanersList = Array.from(allCleanersSet).sort();

  // Count services per client to identify recurring clients
  const clientServiceCounts = React.useMemo(() => {
    const counts = {};
    (services || []).forEach((s) => {
      if (s.unidad && s.status !== 'cancelado') {
        const key = s.unidad.trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [services]);

  // Filter logic
  const filteredServices = services.filter((s) => {
    // If logged in as cleaner, only show services where they participated
    if (isCleaner) {
      const target = cleanerName.toLowerCase();
      const matchCleanerStr = (str) => {
        if (!str || typeof str !== 'string') return false;
        const v = str.trim().toLowerCase();
        if (v === target) return true;
        const parts = v.split(/[,/&+yY\s]+/).map(p => p.trim());
        return parts.includes(target);
      };

      const isMine =
        matchCleanerStr(s.cleaner) ||
        (Array.isArray(s.cleaners) && s.cleaners.some((c) => matchCleanerStr(c))) ||
        (s.pagosPorCleaner && Object.keys(s.pagosPorCleaner).some(matchCleanerStr)) ||
        (s.ratesPorCleaner && Object.keys(s.ratesPorCleaner).some(matchCleanerStr));

      if (!isMine) return false;
    }

    if (typeFilter !== 'all' && s.tipo !== typeFilter) return false;
    
    if (statusFilter !== 'all') {
      const isSvcCancelled = s.status === 'cancelado';
      if (statusFilter === 'cancelado' && !isSvcCancelled) return false;
      if (statusFilter === 'activo' && isSvcCancelled) return false;
    }

    if (cleanerFilter !== 'all') {
      const match = (s.cleaners || []).includes(cleanerFilter) || s.cleaner === cleanerFilter;
      if (!match) return false;
    }

    // Free Date Range filter
    if (startDate && s.fecha < startDate) return false;
    if (endDate && s.fecha > endDate) return false;

    if (searchTerm && searchTerm.trim()) {
      const term = normalizeText(searchTerm);
      const tokens = term.split(/\s+/).filter(Boolean);

      // 1. Cliente / Unidad Match (e.g. "CHAND", "Mohammed", "Rohan Unit A", etc.)
      const unitRaw = normalizeText(s.unidad || s.cliente || s.client || '');
      const unitMatch = unitRaw.includes(term) || (tokens.length > 1 && tokens.every((tok) => unitRaw.includes(tok)));

      // 2. Cleaner Match (cleaner name, cleaners list, pagosPorCleaner keys)
      const primaryCleaner = normalizeText(s.cleaner || '');
      const cleanersArr = (s.cleaners || []).map((c) => normalizeText(c));
      const pagosCleaners = s.pagosPorCleaner && typeof s.pagosPorCleaner === 'object'
        ? Object.keys(s.pagosPorCleaner).map((c) => normalizeText(c))
        : [];
      const clMatch =
        primaryCleaner.includes(term) ||
        cleanersArr.some((c) => c.includes(term)) ||
        pagosCleaners.some((c) => c.includes(term)) ||
        (tokens.length > 1 && tokens.every((tok) => primaryCleaner.includes(tok) || cleanersArr.some((c) => c.includes(tok))));

      // 3. Servicio (Tipo de Servicio) Match (e.g. "Limpieza", "Extra Task", etc.)
      const tipoStr = normalizeText(s.tipo || '');
      const tipoMatch = tipoStr.includes(term) || (tokens.length > 1 && tokens.every((tok) => tipoStr.includes(tok)));

      // 4. Fecha Match (YYYY-MM-DD, DD/MM/YYYY, month names in Spanish, etc.)
      const fechaRaw = s.fecha || '';
      let fechaMatch = fechaRaw.includes(term);
      if (!fechaMatch && fechaRaw) {
        const [year, month, day] = fechaRaw.split('-');
        if (year && month && day) {
          const dmySlash = `${day}/${month}/${year}`;
          const dmyDash = `${day}-${month}-${year}`;
          const dmSlash = `${day}/${month}`;
          const dmDash = `${day}-${month}`;
          const monthNames = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
          ];
          const mIdx = parseInt(month, 10) - 1;
          const monthName = monthNames[mIdx] || '';
          const monthShort = monthName.slice(0, 3);
          const fullHuman1 = `${day} ${monthName}`;
          const fullHuman2 = `${day} de ${monthName}`;
          const fullHuman3 = `${monthName} ${year}`;

          fechaMatch =
            dmySlash.includes(term) ||
            dmyDash.includes(term) ||
            dmSlash.includes(term) ||
            dmDash.includes(term) ||
            monthName.includes(term) ||
            monthShort.includes(term) ||
            fullHuman1.includes(term) ||
            fullHuman2.includes(term) ||
            fullHuman3.includes(term);
        }
      }

      // 5. Capturista / Folio ID / Notas / Dirección
      const captMatch = normalizeText(s.capturista || '').includes(term);
      const idMatch = String(s.id || '').includes(term);
      const notesMatch = normalizeText(s.notas || '').includes(term);
      const dirMatch = normalizeText(s.direccion || '').includes(term);

      // 6. Cross-field multi-token match (e.g. "CHAND limpieza", "Carlos 15 Oct", "CHAND 2026")
      const combinedSearchStr = normalizeText(`
        ${s.unidad || ''} ${s.cliente || ''} ${s.client || ''} ${s.direccion || ''}
        ${s.cleaner || ''} ${(s.cleaners || []).join(' ')} ${pagosCleaners.join(' ')}
        ${s.tipo || ''} ${s.fecha || ''} ${s.notas || ''} ${s.capturista || ''} ${s.id || ''}
      `);
      const crossMatch = tokens.length > 1 && tokens.every((tok) => combinedSearchStr.includes(tok));

      if (!unitMatch && !clMatch && !tipoMatch && !fechaMatch && !captMatch && !idMatch && !notesMatch && !dirMatch && !crossMatch) {
        return false;
      }
    }
    return true;
  });

  const handleExport = () => {
    exportServicesToCSV(filteredServices, 'servicios_whiteglove.csv');
  };

  // Financial totals for the filtered services list following the exact business rule
  const totalHours = filteredServices.reduce((sum, s) => sum + (Number(s.horas) || 0), 0);
  const totalCobro = filteredServices.reduce((sum, s) => {
    if (s.status === 'cancelado') return sum;
    return sum + (Number(s.cobro) || 0);
  }, 0);
  const totalCleanerPay = filteredServices.reduce((sum, s) => {
    if (s.status === 'cancelado') return sum;
    if (s.pagosPorCleaner && Object.keys(s.pagosPorCleaner).length > 0) {
      return sum + Object.values(s.pagosPorCleaner).reduce((pSum, v) => pSum + (Number(v) || 0), 0);
    }
    return sum + (Number(s.pagoCleaner) || 0);
  }, 0);
  const totalTeamPay = filteredServices.reduce((sum, s) => {
    if (s.status === 'cancelado') return sum;
    return sum + (Number(s.pagoCleaningTeam) || 0);
  }, 0);
  const totalTips = filteredServices.reduce((sum, s) => {
    if (s.status === 'cancelado') return sum;
    return sum + (Number(s.tip) || 0);
  }, 0);
  const totalNetProfit = filteredServices.reduce((sum, s) => {
    if (s.status === 'cancelado') return sum;
    const cobro = Number(s.cobro) || 0;
    const teamPay = Number(s.pagoCleaningTeam) || 0;
    const cleanerPay = s.pagosPorCleaner && Object.keys(s.pagosPorCleaner).length > 0
      ? Object.values(s.pagosPorCleaner).reduce((a, b) => a + (Number(b) || 0), 0)
      : (Number(s.pagoCleaner) || 0);
    const cost = teamPay > 0 ? teamPay : cleanerPay;
    return sum + (cobro - cost);
  }, 0);

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search Input */}
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar cliente (ej. CHAND), cleaner, servicio, fecha..."
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

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
          >
            <option value="all">Todos los tipos</option>
            <option value="Limpieza">Limpieza</option>
            <option value="Extra Task">Extra Task</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Solo Activos</option>
            <option value="cancelado">Solo Cancelados</option>
          </select>

          {/* Cleaner Filter (Admins only) */}
          {!isCleaner && (
            <select
              value={cleanerFilter}
              onChange={(e) => setCleanerFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
            >
              <option value="all">Todos los cleaners</option>
              {cleanersList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {showFinancials && (
            <button
              onClick={() => setShowGlossaryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#0B1D4A] border border-amber-300/80 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Abrir glosario de fórmulas y criterios de cálculo financiero"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0B1D4A]" />
              <span>Glosario de Fórmulas</span>
            </button>
          )}

          {showFinancials && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={onOpenNewService}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B1D4A] hover:bg-[#1E3670] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#FFB566] stroke-[3]" />
              <span>Nuevo Servicio</span>
            </button>
          )}
        </div>
      </div>

      {/* Free Date Range Picker Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1D4A]">
            <Calendar className="w-4 h-4 text-[#FFB566]" />
            <span>Filtro de Rango Libre de Fechas:</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-xl bg-slate-50/70 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-xl bg-slate-50/70 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                setStartDate(firstDay);
                setEndDate(lastDay);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                setStartDate(firstDay);
                setEndDate(lastDay);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
            >
              Mes Pasado
            </button>
          </div>
        </div>

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Quitar Rango ({filteredServices.length} servicios)</span>
          </button>
        )}
      </div>

      {/* Active Search Results Banner */}
      {searchTerm && searchTerm.trim() && (
        <div className="bg-sky-50 border border-sky-200 text-sky-950 p-3 rounded-2xl shadow-2xs flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-7 h-7 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-sky-950">
                  Resultados para: <span className="bg-white px-2 py-0.5 rounded-lg border border-sky-300 font-mono text-sky-900 font-bold">"{searchTerm}"</span>
                </span>
                <span className="text-sky-300">•</span>
                <span className="text-xs font-semibold text-sky-800">
                  {filteredServices.length} {filteredServices.length === 1 ? 'servicio encontrado' : 'servicios encontrados'}
                </span>
                {filteredServices.length > 0 && showFinancials && (
                  <span className="text-sky-700 text-[11px] font-medium">
                    (Cobro total: ${totalCobro.toFixed(2)} CAD · Horas: {totalHours.toFixed(1)}h)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-sky-700 block mt-0.5">
                Búsqueda en vivo por: Cliente / Unidad, Cleaner, Tipo de servicio y Fecha
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-sky-800 bg-white hover:bg-sky-100 rounded-xl border border-sky-300 shadow-2xs transition-colors cursor-pointer"
          >
            <X className="w-3 h-3 text-sky-600" />
            <span>Limpiar búsqueda</span>
          </button>
        </div>
      )}

      {/* Financial Summary Bar (Clean, without displaying raw internal formulas publicly) */}
      {showFinancials && (
        <div className="bg-[#0B1D4A] text-white p-3.5 rounded-2xl border border-[#1E3670] shadow-xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
              Resumen Financiero del Filtro ({filteredServices.length} servicios)
            </span>
            <button
              type="button"
              onClick={() => setShowGlossaryModal(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFB566]/20 hover:bg-[#FFB566]/30 text-[#FFB566] text-[11px] font-bold border border-[#FFB566]/40 transition-colors cursor-pointer"
              title="Abrir glosario de fórmulas y criterios de cálculo"
            >
              <BookOpen className="w-3 h-3" />
              <span>Glosario de Fórmulas</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300 flex-wrap">
            <span>Cobro: <strong className="text-white">${totalCobro.toFixed(2)}</strong></span>
            <span>Pago Teams: <strong className="text-sky-300">${totalTeamPay.toFixed(2)}</strong></span>
            <span>Pago Cleaners: <strong className="text-amber-300">${totalCleanerPay.toFixed(2)}</strong></span>
            <span>Utilidad Neta: <strong className="text-[#FFB566] font-bold">${totalNetProfit.toFixed(2)}</strong></span>
          </div>
        </div>
      )}

      {/* Main High-Density Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Unidad / Residencia</th>
                <th className="px-4 py-3">Cleaners</th>
                <th className="px-4 py-3 text-center">Duración</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-center">Estado</th>
                {showFinancials && <th className="px-4 py-3 text-right">Cobro Cliente</th>}
                <th className="px-4 py-3 text-right">Pago Cleaner</th>
                {!isCleaner && <th className="px-4 py-3 text-right text-sky-900 bg-sky-50/60 font-bold">Pago Team</th>}
                {showFinancials && <th className="px-4 py-3 text-right text-emerald-900 bg-emerald-50/60 font-bold">Utilidad Neta</th>}
                <th className="px-4 py-3 text-right">Tip</th>
                <th className="px-4 py-3">Capturista</th>
                {canEdit && <th className="px-4 py-3 text-center min-w-[210px]">Acciones de Administrador</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((svc) => {
                const cleaners = svc.cleaners?.length ? svc.cleaners : (svc.cleaner ? [svc.cleaner] : []);
                const cleanerPay = svc.pagosPorCleaner && Object.keys(svc.pagosPorCleaner).length > 0
                  ? Object.values(svc.pagosPorCleaner).reduce((a, b) => a + (Number(b) || 0), 0)
                  : (Number(svc.pagoCleaner) || 0);
                const teamPay = Number(svc.pagoCleaningTeam) || 0;
                const cobro = svc.cobro != null ? Number(svc.cobro) : null;
                const isCancelled = svc.status === 'cancelado';
                const formattedDuration = formatHoursAndMinutes(svc.horas);

                // Exact business rule from user:
                // If pagoCleaningTeam > 0, deduct pagoCleaningTeam from cobro.
                // Otherwise, deduct cleanerPay from cobro.
                let utilidad = null;
                let deduccionTipo = '';
                if (cobro != null && !isCancelled) {
                  if (teamPay > 0) {
                    utilidad = cobro - teamPay;
                    deduccionTipo = 'Cobro - Team';
                  } else {
                    utilidad = cobro - cleanerPay;
                    deduccionTipo = 'Cobro - Cleaner';
                  }
                }

                return (
                  <tr
                    key={svc.id}
                    className={`transition-colors ${
                      isCancelled
                        ? 'bg-rose-50/40 text-slate-400'
                        : 'hover:bg-amber-50/30 text-slate-800'
                    }`}
                  >
                    {/* Fecha */}
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900 tabular-nums">
                      <span className={isCancelled ? 'line-through text-slate-400' : ''}>
                        {svc.fecha}
                      </span>
                    </td>

                    {/* Unidad */}
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={isCancelled ? 'line-through text-slate-400' : ''}>{svc.unidad}</span>
                        {clientServiceCounts[svc.unidad?.trim()] > 1 && !isCancelled && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs"
                            title={`Cliente recurrente: ${clientServiceCounts[svc.unidad?.trim()]} servicios registrados`}
                          >
                            <Copy className="w-2.5 h-2.5 text-sky-600" />
                            <span>Recurrente</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cleaners */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {cleaners.map((c) => (
                          <span
                            key={c}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isCancelled
                                ? 'bg-slate-200 text-slate-500'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Duración (Horas y Minutos) */}
                    <td className="px-4 py-3 text-center tabular-nums whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isCancelled ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-[#0B1D4A]'
                      }`}>
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formattedDuration}</span>
                      </span>
                      {Number(svc.horas) % 1 !== 0 && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ({svc.horas}h)
                        </span>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] text-slate-600 font-semibold px-2 py-0.5 rounded-md bg-slate-100">
                        {svc.tipo}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCancelled
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {isCancelled ? 'Cancelado' : 'Activo'}
                      </span>
                    </td>

                    {/* Cobro Cliente */}
                    {showFinancials && (
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-emerald-800'}`}>
                        {cobro != null ? `$${cobro.toFixed(2)}` : '—'}
                      </td>
                    )}

                    {/* Pago Cleaner */}
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {cleanerPay > 0 ? `$${cleanerPay.toFixed(2)}` : '—'}
                    </td>

                    {/* Pago Team */}
                    {!isCleaner && (
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold bg-sky-50/20 ${isCancelled ? 'text-slate-400 line-through' : ''}`}>
                        {teamPay > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded-md border border-sky-300">
                            ${teamPay.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    )}

                    {/* Utilidad Neta (Cobro - Pago Team si existe, o Cobro - Pago Cleaner si no existe) */}
                    {showFinancials && (
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/20">
                        {isCancelled ? (
                          <span className="text-slate-400 line-through text-[11px]">Cancelado</span>
                        ) : utilidad != null ? (
                          <div className="flex flex-col items-end">
                            <span
                              className={`font-bold text-xs ${
                                utilidad >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {utilidad >= 0 ? `+$${utilidad.toFixed(2)}` : `-$${Math.abs(utilidad).toFixed(2)}`}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {teamPay > 0 ? '(deduce team)' : '(deduce cleaner)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    )}

                    {/* Tip */}
                    <td className={`px-4 py-3 text-right tabular-nums font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-amber-700'}`}>
                      {svc.tip ? `+$${svc.tip}` : '—'}
                    </td>

                    {/* Capturista */}
                    <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {svc.capturista || 'WhiteGlove'}
                    </td>

                    {/* ACTIONS FOR ADMINISTRATOR (EDITAR, CANCELAR, ELIMINAR) */}
                    {canEdit && (
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* 1. EDITAR BUTTON */}
                          <button
                            onClick={() => onEditService(svc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#0B1D4A] bg-slate-100 hover:bg-[#FFB566] hover:text-[#0B1D4A] rounded-lg transition-colors shadow-2xs"
                            title="Editar toda la información del servicio"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          {/* 2. CANCELAR / REACTIVAR BUTTON */}
                          <button
                            onClick={() => {
                              if (onCancelService) {
                                onCancelService(svc.id, isCancelled ? 'activo' : 'cancelado');
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors shadow-2xs ${
                              isCancelled
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                            }`}
                            title={isCancelled ? 'Reactivar servicio' : 'Marcar servicio como cancelado'}
                          >
                            {isCancelled ? (
                              <>
                                <RotateCcw className="w-3 h-3" />
                                <span>Reactivar</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3" />
                                <span>Cancelar</span>
                              </>
                            )}
                          </button>

                          {/* 3. DUPLICAR BUTTON (Para clientes recurrentes) */}
                          {onOpenNewService && (
                            <button
                              onClick={() => onOpenNewService({
                                unidad: svc.unidad,
                                horas: svc.horas,
                                cleaner: svc.cleaner,
                                cleaners: svc.cleaners,
                                tipo: svc.tipo,
                                cobro: svc.cobro,
                                pagoCleaningTeam: svc.pagoCleaningTeam,
                                pagosPorCleaner: svc.pagosPorCleaner,
                                ratesPorCleaner: svc.ratesPorCleaner,
                                fecha: new Date().toISOString().split('T')[0],
                                capturista: currentUser?.displayName || currentUser?.username || 'WhiteGlove',
                                isDuplicate: true,
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 hover:text-sky-950 rounded-lg transition-colors border border-sky-200 shadow-2xs cursor-pointer"
                              title="Duplicar servicio con cargo y datos pre-llenados en automático para este cliente recurrente"
                            >
                              <Copy className="w-3 h-3 text-sky-600" />
                              <span>Duplicar</span>
                            </button>
                          )}

                          {/* 4. ELIMINAR BUTTON */}
                          <button
                            onClick={() => onDeleteService(svc.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shadow-2xs"
                            title="Eliminar permanentemente este servicio"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={showFinancials ? 13 : (!isCleaner ? 11 : 8)} className="px-4 py-12 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-2xs">
                        <Search className="w-6 h-6 text-slate-400" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">No se encontraron servicios</span>
                      <p className="text-xs text-slate-500">
                        {searchTerm
                          ? `No hay registros que coincidan con "${searchTerm}". Puedes buscar por nombre de cliente (ej. CHAND), cleaner, tipo de servicio o fecha.`
                          : 'No se encontraron servicios que coincidan con los filtros aplicados.'}
                      </p>
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="mt-1 px-3.5 py-1.5 bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          Mostrar todos los servicios
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Financial & Operational Summary Totals Footer */}
            {filteredServices.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-900">Totales Acumulados</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        ({filteredServices.length} servicios)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-bold">
                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {formatHoursAndMinutes(totalHours)}
                    </span>
                  </td>
                  <td className="px-4 py-3" colSpan={2}></td>
                  
                  {/* Cobro Cliente Total */}
                  {showFinancials && (
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-800 font-bold">
                      ${totalCobro.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}

                  {/* Pago Cleaner Total */}
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 font-bold">
                    ${totalCleanerPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Pago Team Total */}
                  {!isCleaner && (
                    <td className="px-4 py-3 text-right tabular-nums text-sky-900 font-bold bg-sky-50/50">
                      ${totalTeamPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}

                  {/* Utilidad Neta Total */}
                  {showFinancials && (
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-bold bg-emerald-50/50">
                      ${totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}

                  {/* Tips Total */}
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700 font-bold">
                    {totalTips > 0 ? `+$${totalTips.toFixed(2)}` : '—'}
                  </td>

                  <td className="px-4 py-3" colSpan={canEdit ? 2 : 1}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Glosario de Fórmulas y Datos Modal */}
      {showGlossaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFB566]/20 border border-[#FFB566]/40 flex items-center justify-center text-[#FFB566]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#FAF7F1]">
                    Glosario de Fórmulas y Métricas Financieras
                  </h3>
                  <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                    Documentación y Reglas de Negocio WhiteGlove
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlossaryModal(false)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Formula Maestra de Utilidad */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B1D4A] to-[#1E3670] text-white space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#FFB566] text-[#0B1D4A] font-bold text-[11px]">
                    Fórmula Maestra
                  </span>
                  <span className="font-serif font-bold text-sm text-[#FFB566]">
                    Cálculo de Utilidad Neta
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed text-[11.5px]">
                  La utilidad neta de cada servicio se calcula deduciendo los costos operativos asumidos del monto cobrado al cliente:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                    <span className="font-bold text-[#FFB566] block mb-1">
                      1. Cuando existe Pago a Team (&gt; $0):
                    </span>
                    <div className="font-mono bg-black/30 p-2 rounded-lg text-[11px] text-emerald-300 font-bold mb-1.5">
                      Utilidad = Cobro - Pago a Team
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Al contratar a un Cleaning Team (equipo externo), ese cargo específico se deduce íntegramente del cobro facturado al cliente.
                    </p>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                    <span className="font-bold text-[#FFB566] block mb-1">
                      2. Cuando NO existe Pago a Team ($0):
                    </span>
                    <div className="font-mono bg-black/30 p-2 rounded-lg text-[11px] text-amber-300 font-bold mb-1.5">
                      Utilidad = Cobro - Pago Cleaner
                    </div>
                    <p className="text-[11px] text-slate-300">
                      El servicio fue cubierto por personal interno (cleaner). Se deduce la retribución acumulada de los cleaners al cobro del cliente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conceptos y Columnas */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Definición de Columnas y Variables del Sistema
                </h4>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Cobro al Cliente (CAD)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Ingreso Bruto</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Tarifa bruta total pactada y facturada al cliente por la atención del servicio en su unidad o residencia.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Pago a Cleaner(s)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Nómina Interna</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Retribución pagada a cada cleaner asignado según sus horas trabajadas y su tarifa por hora acordada (o suma de pagos individuales si hubo múltiples cleaners).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Pago a Cleaning Team</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">Costo Externo</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Costo pactado cuando un equipo externo realiza la limpieza. Este monto reemplaza el costo del cleaner para el cálculo de la utilidad.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Duración del Turno (Horas y Minutos)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">Tiempo Real</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Registrado en horas y minutos exactos (ej. 2h 30m = 2.50 hrs) para cálculo preciso de nómina y reportes de productividad.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Propina / Tip</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">100% Cleaner</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Bonificación voluntaria del cliente que se transfiere íntegramente al personal operativo y no afecta la utilidad neta de la empresa.
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowGlossaryModal(false)}
                className="px-4 py-2 font-bold text-xs bg-[#0B1D4A] hover:bg-[#1E3670] text-white rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Cerrar Glosario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
