import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Table,
} from 'lucide-react';
import {
  exportScheduleToExcel,
  buildScheduleSpreadsheetRows,
} from '../lib/export';
import { getClientDossier } from '../lib/clientMemory';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatYMD = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ScheduleExportSheetsModal({
  isOpen,
  onClose,
  unifiedCalendarItems = [],
  availableCleaners = [],
  currentDate = new Date(),
  selectedDate = '',
  todayStr = '',
  clientMemory = null,
}) {
  const [periodKey, setPeriodKey] = useState('all'); // 'all' | 'current_month' | 'current_week' | 'next_week' | 'custom'
  const [cleanerFilter, setCleanerFilter] = useState('all');
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [customStart, setCustomStart] = useState(todayStr || formatYMD(new Date()));
  const [customEnd, setCustomEnd] = useState(todayStr || formatYMD(new Date()));
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const safeCurrentDate = currentDate instanceof Date && !Number.isNaN(currentDate.getTime())
    ? currentDate
    : new Date();

  const getPeriodBounds = () => {
    const baseStr = selectedDate || todayStr || formatYMD(new Date());
    const [bY, bM, bD] = String(baseStr).split('-').map(Number);
    const baseDate = new Date(bY || 2026, (bM || 1) - 1, bD || 1);
    const dayOfWeek = (baseDate.getDay() + 6) % 7;

    if (periodKey === 'current_week') {
      const mon = new Date(baseDate);
      mon.setDate(baseDate.getDate() - dayOfWeek);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        start: formatYMD(mon),
        end: formatYMD(sun),
        label: `Esta Semana (${formatYMD(mon)} a ${formatYMD(sun)})`,
      };
    }

    if (periodKey === 'next_week') {
      const [tY, tM, tD] = String(todayStr || baseStr).split('-').map(Number);
      const todayObj = new Date(tY || 2026, (tM || 1) - 1, tD || 1);
      const todayDow = (todayObj.getDay() + 6) % 7;
      const nextMon = new Date(todayObj);
      nextMon.setDate(todayObj.getDate() - todayDow + 7);
      const nextSun = new Date(nextMon);
      nextSun.setDate(nextMon.getDate() + 6);
      return {
        start: formatYMD(nextMon),
        end: formatYMD(nextSun),
        label: `Siguiente Semana (${formatYMD(nextMon)} a ${formatYMD(nextSun)})`,
      };
    }

    if (periodKey === 'current_month') {
      const y = safeCurrentDate.getFullYear();
      const m = safeCurrentDate.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return {
        start: formatYMD(first),
        end: formatYMD(last),
        label: `Mes de ${MONTH_NAMES[m] || ''} ${y}`,
      };
    }

    if (periodKey === 'custom') {
      const s = customStart <= customEnd ? customStart : customEnd;
      const e = customStart <= customEnd ? customEnd : customStart;
      return {
        start: s,
        end: e,
        label: `Del ${s} al ${e}`,
      };
    }

    return {
      start: '',
      end: '',
      label: 'Toda la Programación del Calendario',
    };
  };

  const periodBounds = getPeriodBounds();

  const filteredExportItems = (unifiedCalendarItems || []).filter((item) => {
    if (!item) return false;
    if (!includeCancelled && (item.status === 'cancelled' || item.estado === 'cancelado')) {
      return false;
    }
    if (periodBounds.start && (item.fecha || '') < periodBounds.start) return false;
    if (periodBounds.end && (item.fecha || '') > periodBounds.end) return false;

    if (cleanerFilter !== 'all') {
      const target = cleanerFilter.trim().toLowerCase();
      const list = Array.isArray(item.cleaners) && item.cleaners.length
        ? item.cleaners
        : [item.cleaner || ''];
      const hasMatch = list.some((c) => String(c || '').trim().toLowerCase() === target);
      if (!hasMatch) return false;
    }
    return true;
  });

  const { dataRows } = buildScheduleSpreadsheetRows(
    filteredExportItems,
    (unitName) => getClientDossier(unitName, clientMemory)
  );

  const handleDownloadExcel = (ext = 'xls') => {
    if (filteredExportItems.length === 0) {
      setStatusMsg({
        type: 'error',
        text: 'No hay turnos ni servicios en el periodo seleccionado para descargar.',
      });
      return;
    }
    const cleanDate = todayStr || formatYMD(new Date());
    const filename = `calendario_whiteglove_${cleanDate}.${ext}`;
    exportScheduleToExcel(
      filteredExportItems,
      filename,
      (unitName) => getClientDossier(unitName, clientMemory),
      periodBounds.label
    );
    setStatusMsg({
      type: 'success',
      text: `Archivo ${filename} descargado correctamente con ${filteredExportItems.length} registros.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0B1D4A] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white leading-tight">
                Descargar Programación del Calendario en Excel
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Exporta todos los servicios y turnos agendados a un archivo Excel (.xls) o CSV (.csv) para tu control
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                statusMsg.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-semibold leading-relaxed">{statusMsg.text}</div>
            </div>
          )}

          {/* Filter Bar: Period & Cleaner */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0B1D4A]" />
                <span>Periodo de turnos a incluir ({filteredExportItems.length} registros):</span>
              </span>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCancelled}
                  onChange={(e) => setIncludeCancelled(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B1D4A]"
                />
                <span>Incluir servicios cancelados</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'all', label: 'Todo el Calendario' },
                { id: 'current_month', label: `Mes (${(MONTH_NAMES[safeCurrentDate.getMonth()] || 'Mes').substring(0, 3)})` },
                { id: 'current_week', label: 'Esta Semana' },
                { id: 'next_week', label: 'Siguiente Semana' },
                { id: 'custom', label: 'Rango de Fechas' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodKey(p.id)}
                  className={`px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    periodKey === p.id
                      ? 'bg-[#0B1D4A] text-[#FFB566] border-[#0B1D4A] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {periodKey === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">Desde:</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">Hasta:</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white font-semibold"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-600">Filtrar Cleaner:</span>
              <button
                type="button"
                onClick={() => setCleanerFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  cleanerFilter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Todos
              </button>
              {(availableCleaners || []).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCleanerFilter(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    cleanerFilter === c
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Excel Action Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-[#0B1D4A]">
                Lista para descargar en Excel ({filteredExportItems.length} turnos)
              </h4>
              <p className="text-slate-600 text-[11px]">
                Incluye Fecha, Día, Hora, Cliente/Unidad, Cleaners Asignados, Horas, Estado, Cobranza, Monto, Dirección y Notas.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleDownloadExcel('xls')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Excel (.xls)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadExcel('csv')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B1D4A] border border-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                <Table className="w-4 h-4 text-slate-600" />
                <span>Descargar CSV</span>
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700">
                Vista Previa del Excel ({dataRows.length} filas)
              </span>
              <span className="text-[11px] text-slate-500">{periodBounds.label}</span>
            </div>
            <div className="max-h-64 overflow-auto">
              {dataRows.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold">
                  No hay turnos registrados en este rango de fechas.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#0B1D4A] text-[#FFB566]">
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Fecha</th>
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Hora</th>
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Cliente / Unidad</th>
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Cleaners</th>
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Hrs</th>
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Estado</th>
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Cobranza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dataRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold whitespace-nowrap">
                          {r[0]} {r[1] ? `(${String(r[1]).substring(0, 3)})` : ''}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">{r[2]}</td>
                        <td className="py-2 px-3 font-bold text-[#0B1D4A]">{r[3]}</td>
                        <td className="py-2 px-3">{r[5]}</td>
                        <td className="py-2 px-3 font-bold">{r[6]}h</td>
                        <td className="py-2 px-3">{r[7]}</td>
                        <td className="py-2 px-3 font-bold">{r[8]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Compatible con Microsoft Excel, Google Sheets y Apple Numbers.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
