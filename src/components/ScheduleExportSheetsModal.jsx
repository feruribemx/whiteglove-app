import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  LogOut,
  Table,
  Link2,
} from 'lucide-react';
import {
  exportScheduleToExcel,
  buildScheduleSpreadsheetRows,
} from '../lib/export';
import {
  initGoogleSheetsAuth,
  googleSheetsSignIn,
  googleSheetsLogout,
  getGoogleSheetsAccessToken,
  extractSpreadsheetId,
  getSavedSheetsConfig,
  saveSheetsConfig,
  fetchSpreadsheetMetadata,
  createNewGoogleSpreadsheet,
  createSheetTabInSpreadsheet,
  readGoogleSheetTab,
  syncScheduleRowsToGoogleSheet,
} from '../lib/googleSheets';
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
  onAddSchedule,
  initialTab = 'excel', // 'excel' | 'sheets'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [periodKey, setPeriodKey] = useState('all'); // 'all' | 'current_month' | 'current_week' | 'next_week' | 'custom'
  const [cleanerFilter, setCleanerFilter] = useState('all');
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [customStart, setCustomStart] = useState(todayStr || formatYMD(new Date()));
  const [customEnd, setCustomEnd] = useState(todayStr || formatYMD(new Date()));

  // Google Sheets OAuth & Connection State
  const [needsAuth, setNeedsAuth] = useState(true);
  const [googleUser, setGoogleUser] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const savedConfig = useMemo(() => getSavedSheetsConfig() || {}, []);
  const [spreadsheetInput, setSpreadsheetInput] = useState(
    savedConfig.spreadsheetUrl || savedConfig.spreadsheetId || ''
  );
  const [spreadsheetMeta, setSpreadsheetMeta] = useState(null);
  const [selectedTabName, setSelectedTabName] = useState(savedConfig.sheetTabName || '');
  const [syncMode, setSyncMode] = useState('replace'); // 'replace' | 'append'
  const [newTabNameInput, setNewTabNameInput] = useState('');
  const [showNewTabInput, setShowNewTabInput] = useState(false);

  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmingSync, setConfirmingSync] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  // Read / Import from Google Sheet state
  const [sheetPreviewRows, setSheetPreviewRows] = useState(null);
  const [isReadingSheet, setIsReadingSheet] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const unsubscribe = initGoogleSheetsAuth(
      (user) => {
        setGoogleUser(user);
        setNeedsAuth(false);
      },
      () => {
        setGoogleUser(null);
        setNeedsAuth(true);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Automatically load metadata if already authenticated and spreadsheetInput is saved
  useEffect(() => {
    if (!needsAuth && spreadsheetInput && !spreadsheetMeta && isOpen) {
      handleConnectSpreadsheet(spreadsheetInput, true);
    }
  }, [needsAuth, isOpen]);

  if (!isOpen) return null;

  const getPeriodBounds = () => {
    const baseStr = selectedDate || todayStr || formatYMD(new Date());
    const [bY, bM, bD] = baseStr.split('-').map(Number);
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
      const [tY, tM, tD] = (todayStr || baseStr).split('-').map(Number);
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
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return {
        start: formatYMD(first),
        end: formatYMD(last),
        label: `Mes de ${MONTH_NAMES[m]} ${y}`,
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
    if (!includeCancelled && (item.status === 'cancelled' || item.estado === 'cancelado')) {
      return false;
    }
    if (periodBounds.start && item.fecha < periodBounds.start) return false;
    if (periodBounds.end && item.fecha > periodBounds.end) return false;

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

  const { headers, dataRows } = buildScheduleSpreadsheetRows(
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

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMsg(null);
    try {
      const result = await googleSheetsSignIn();
      if (result) {
        setGoogleUser(result.user);
        setNeedsAuth(false);
        if (spreadsheetInput) {
          await handleConnectSpreadsheet(spreadsheetInput, true);
        }
      }
    } catch (error) {
      setStatusMsg({
        type: 'error',
        text: error?.message || 'Error al iniciar sesión con Google.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSheetsLogout();
    setGoogleUser(null);
    setNeedsAuth(true);
    setSpreadsheetMeta(null);
    setSheetPreviewRows(null);
    setConfirmingSync(false);
  };

  const handleConnectSpreadsheet = async (inputVal = spreadsheetInput, silent = false) => {
    const token = await getGoogleSheetsAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const cleanId = extractSpreadsheetId(inputVal);
    if (!cleanId) {
      if (!silent) {
        setStatusMsg({
          type: 'error',
          text: 'Pega el enlace (URL) de tu archivo de Google Sheets o su ID.',
        });
      }
      return;
    }

    setIsLoadingMeta(true);
    if (!silent) setStatusMsg(null);
    try {
      const meta = await fetchSpreadsheetMetadata(cleanId);
      setSpreadsheetMeta(meta);
      const savedTab = savedConfig.sheetTabName;
      const availableTabs = (meta.sheets || []).map((s) => s.title);
      const chosenTab =
        selectedTabName && availableTabs.includes(selectedTabName)
          ? selectedTabName
          : savedTab && availableTabs.includes(savedTab)
          ? savedTab
          : availableTabs[0] || 'Hoja 1';

      setSelectedTabName(chosenTab);
      saveSheetsConfig({
        spreadsheetId: meta.spreadsheetId,
        spreadsheetUrl: meta.spreadsheetUrl,
        spreadsheetTitle: meta.title,
        sheetTabName: chosenTab,
      });

      if (!silent) {
        setStatusMsg({
          type: 'success',
          text: `Conectado a "${meta.title}" (${meta.sheets.length} pestañas disponibles).`,
        });
      }
    } catch (err) {
      if (err?.code === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else if (!silent) {
        setStatusMsg({
          type: 'error',
          text: err?.message || 'No se pudo conectar con la hoja de cálculo.',
        });
      }
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    const token = await getGoogleSheetsAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setIsLoadingMeta(true);
    setStatusMsg(null);
    try {
      const created = await createNewGoogleSpreadsheet(
        `Control Calendario WhiteGlove (${todayStr || formatYMD(new Date())})`
      );
      setSpreadsheetInput(created.spreadsheetUrl);
      setSpreadsheetMeta(created);
      const firstTab = created.sheets?.[0]?.title || 'Calendario WhiteGlove';
      setSelectedTabName(firstTab);
      saveSheetsConfig({
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        spreadsheetTitle: created.title,
        sheetTabName: firstTab,
      });
      setStatusMsg({
        type: 'success',
        text: `¡Nueva hoja "${created.title}" creada en tu Google Drive y vinculada!`,
      });
    } catch (err) {
      if (err?.code === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setStatusMsg({
          type: 'error',
          text: err?.message || 'No se pudo crear la hoja de cálculo.',
        });
      }
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleCreateNewTab = async () => {
    const tabTitle = (newTabNameInput || 'Calendario WhiteGlove').trim();
    if (!tabTitle || !spreadsheetMeta?.spreadsheetId) return;
    setIsLoadingMeta(true);
    setStatusMsg(null);
    try {
      const updatedMeta = await createSheetTabInSpreadsheet(
        spreadsheetMeta.spreadsheetId,
        tabTitle
      );
      setSpreadsheetMeta(updatedMeta);
      setSelectedTabName(tabTitle);
      setShowNewTabInput(false);
      setNewTabNameInput('');
      saveSheetsConfig({
        sheetTabName: tabTitle,
      });
      setStatusMsg({
        type: 'success',
        text: `Pestaña "${tabTitle}" creada y seleccionada.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'No se pudo crear la pestaña.',
      });
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // Executes after explicit user confirmation in the UI
  const handleConfirmedSyncToSheets = async () => {
    if (!spreadsheetMeta?.spreadsheetId || !selectedTabName) return;
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      await syncScheduleRowsToGoogleSheet({
        spreadsheetId: spreadsheetMeta.spreadsheetId,
        tabName: selectedTabName,
        headers,
        dataRows,
        mode: syncMode,
      });
      const nowIso = new Date().toISOString();
      saveSheetsConfig({
        spreadsheetId: spreadsheetMeta.spreadsheetId,
        spreadsheetUrl: spreadsheetMeta.spreadsheetUrl,
        spreadsheetTitle: spreadsheetMeta.title,
        sheetTabName: selectedTabName,
        lastSyncedAt: nowIso,
      });
      setConfirmingSync(false);
      setStatusMsg({
        type: 'success',
        text: `¡Sincronización exitosa! Se enviaron ${dataRows.length} turnos a "${spreadsheetMeta.title}" → pestaña "${selectedTabName}".`,
      });
    } catch (err) {
      if (err?.code === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setStatusMsg({
          type: 'error',
          text: err?.message || 'Error al sincronizar con Google Sheets.',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReadFromSheet = async () => {
    if (!spreadsheetMeta?.spreadsheetId || !selectedTabName) return;
    setIsReadingSheet(true);
    setStatusMsg(null);
    try {
      const values = await readGoogleSheetTab(
        spreadsheetMeta.spreadsheetId,
        selectedTabName
      );
      setSheetPreviewRows(values);
      setStatusMsg({
        type: 'info',
        text:
          values.length > 0
            ? `Se leyeron ${values.length} filas de la pestaña "${selectedTabName}".`
            : `La pestaña "${selectedTabName}" está vacía actualmente.`,
      });
    } catch (err) {
      if (err?.code === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setStatusMsg({
          type: 'error',
          text: err?.message || 'Error al leer la hoja de Google Sheets.',
        });
      }
    } finally {
      setIsReadingSheet(false);
    }
  };

  // Parse rows from Google Sheets to import into WhiteGlove Schedule
  const importableShiftsFromSheet = useMemo(() => {
    if (!sheetPreviewRows || sheetPreviewRows.length < 2) return [];
    const headerRow = sheetPreviewRows[0].map((h) => String(h || '').toLowerCase());
    const fechaIdx = headerRow.findIndex((h) => h.includes('fecha') || h.includes('date'));
    const horaIdx = headerRow.findIndex((h) => h.includes('hora') || h.includes('time'));
    const unidadIdx = headerRow.findIndex(
      (h) => h.includes('cliente') || h.includes('unidad') || h.includes('unit')
    );
    const cleanerIdx = headerRow.findIndex((h) => h.includes('cleaner') || h.includes('personal'));
    const tipoIdx = headerRow.findIndex((h) => h.includes('tipo') || h.includes('servicio'));
    const horasIdx = headerRow.findIndex((h) => h.includes('horas') || h.includes('duracion'));
    const notasIdx = headerRow.findIndex((h) => h.includes('nota'));

    if (fechaIdx === -1 || unidadIdx === -1) return [];

    const existingKeys = new Set(
      (unifiedCalendarItems || []).map(
        (it) => `${it.fecha}|${(it.unidad || '').trim().toLowerCase()}|${it.hora || '09:00'}`
      )
    );

    const parsed = [];
    for (let i = 1; i < sheetPreviewRows.length; i++) {
      const r = sheetPreviewRows[i];
      const rawFecha = String(r[fechaIdx] || '').trim();
      const rawUnidad = String(r[unidadIdx] || '').trim();
      if (!rawFecha || !rawUnidad || !/^\d{4}-\d{2}-\d{2}$/.test(rawFecha)) continue;

      const rawHora = horaIdx >= 0 && r[horaIdx] ? String(r[horaIdx]).trim() : '09:00';
      const key = `${rawFecha}|${rawUnidad.toLowerCase()}|${rawHora}`;
      if (existingKeys.has(key)) continue;

      const rawCleaners =
        cleanerIdx >= 0 && r[cleanerIdx]
          ? String(r[cleanerIdx])
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : ['Maria'];

      parsed.push({
        fecha: rawFecha,
        hora: rawHora,
        unidad: rawUnidad,
        cleaners: rawCleaners.length ? rawCleaners : ['Maria'],
        cleaner: rawCleaners[0] || 'Maria',
        tipo: tipoIdx >= 0 && r[tipoIdx] ? String(r[tipoIdx]).trim() : 'Limpieza',
        horas: horasIdx >= 0 && Number(r[horasIdx]) > 0 ? Number(r[horasIdx]) : 2,
        notas: notasIdx >= 0 && r[notasIdx] ? String(r[notasIdx]).trim() : 'Importado desde Google Sheets',
        estado: 'programado',
        status: 'pending',
      });
    }
    return parsed;
  }, [sheetPreviewRows, unifiedCalendarItems]);

  const handleConfirmImportFromSheets = () => {
    if (!onAddSchedule || importableShiftsFromSheet.length === 0) return;
    importableShiftsFromSheet.forEach((shift) => {
      onAddSchedule(shift);
    });
    setConfirmingImport(false);
    setStatusMsg({
      type: 'success',
      text: `Se importaron ${importableShiftsFromSheet.length} turnos nuevos desde Google Sheets al Calendario.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0B1D4A] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white leading-tight">
                Exportar Excel y Sincronizar con Google Sheets
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Descarga la programación del calendario en Excel o vincúlala con tu archivo de control en Google Drive
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

        {/* Mode Tabs */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('excel');
              setStatusMsg(null);
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-white text-[#0B1D4A] border-[#0B1D4A] shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>1. Descargar Excel (.xls / .csv)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('sheets');
              setStatusMsg(null);
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'sheets'
                ? 'bg-white text-[#0B1D4A] border-emerald-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4 text-emerald-600" />
            <span>2. Vincular con Google Sheets (Drive)</span>
            {spreadsheetMeta && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                Conectado
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Status Banner */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                statusMsg.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
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

          {/* Shared Filter Bar: Period & Cleaner */}
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
                { id: 'current_month', label: `Mes (${MONTH_NAMES[currentDate.getMonth()].substring(0, 3)})` },
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
              {availableCleaners.map((c) => (
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

          {/* TAB 1: EXCEL DOWNLOAD */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
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
                            <td className="py-2 px-3 font-semibold whitespace-nowrap">{r[0]} ({r[1].substring(0, 3)})</td>
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
          )}

          {/* TAB 2: GOOGLE SHEETS SYNC */}
          {activeTab === 'sheets' && (
            <div className="space-y-5">
              {/* Step 1: Google Authentication */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0B1D4A]">
                      Paso 1: Conexión con tu cuenta de Google Sheets
                    </span>
                    {!needsAuth && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Activa
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {needsAuth
                      ? 'Inicia sesión con tu cuenta de Google para permitir leer y actualizar tu hoja de cálculo de control.'
                      : `Sesión iniciada como ${googleUser?.email || 'Usuario de Google'}`}
                  </p>
                </div>

                {needsAuth ? (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="gsi-material-button"
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 48 48"
                          xmlnsXlink="http://www.w3.org/1999/xlink"
                          style={{ display: 'block' }}
                        >
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          ></path>
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          ></path>
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          ></path>
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          ></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">
                        {isLoggingIn ? 'Conectando...' : 'Sign in with Google'}
                      </span>
                      <span style={{ display: 'none' }}>Sign in with Google</span>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar cuenta</span>
                  </button>
                )}
              </div>

              {/* Step 2: Paste Google Sheet Link or Create New */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-[#0B1D4A] block">
                      Paso 2: Vincula tu archivo de Google Sheets (Google Drive)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Pega el link de tu hoja de cálculo de Google Drive o crea una hoja nueva automáticamente.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={needsAuth || isLoadingMeta}
                    onClick={handleCreateNewSpreadsheet}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Nueva Hoja en mi Drive</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Pega aquí el enlace: https://docs.google.com/spreadsheets/d/..."
                    value={spreadsheetInput}
                    onChange={(e) => setSpreadsheetInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  />
                  <button
                    type="button"
                    disabled={needsAuth || isLoadingMeta}
                    onClick={() => handleConnectSpreadsheet(spreadsheetInput, false)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] font-bold text-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMeta ? 'animate-spin' : ''}`} />
                    <span>{isLoadingMeta ? 'Verificando...' : 'Vincular Hoja'}</span>
                  </button>
                </div>

                {/* Connected Spreadsheet Details & Sheet Tab Selector */}
                {spreadsheetMeta && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                          Archivo de Google Drive Vinculado
                        </span>
                        <div className="font-bold text-sm text-[#0B1D4A] flex items-center gap-2">
                          <span>{spreadsheetMeta.title}</span>
                          <a
                            href={spreadsheetMeta.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                          >
                            <span>Abrir en Google Sheets</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1 border-t border-emerald-200/70">
                      <div className="flex-1">
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          Selecciona la Pestaña (Hoja) donde se guardará el control:
                        </label>
                        <select
                          value={selectedTabName}
                          onChange={(e) => {
                            setSelectedTabName(e.target.value);
                            saveSheetsConfig({ sheetTabName: e.target.value });
                            setSheetPreviewRows(null);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-[#0B1D4A] text-xs"
                        >
                          {(spreadsheetMeta.sheets || []).map((s) => (
                            <option key={s.sheetId || s.title} value={s.title}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          Modo de escritura en la pestaña:
                        </label>
                        <select
                          value={syncMode}
                          onChange={(e) => setSyncMode(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 text-xs"
                        >
                          <option value="replace">
                            Actualizar tabla completa (Reemplazar datos en la pestaña)
                          </option>
                          <option value="append">
                            Anexar al final (Agregar filas sin borrar las existentes)
                          </option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowNewTabInput((v) => !v)}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-[#0B1D4A] font-bold text-xs cursor-pointer shrink-0"
                      >
                        + Nueva Pestaña
                      </button>
                    </div>

                    {showNewTabInput && (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Nombre de la nueva pestaña (ej. Calendario WhiteGlove)"
                          value={newTabNameInput}
                          onChange={(e) => setNewTabNameInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleCreateNewTab}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Crear Pestaña
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Sync & Read Actions with Mandatory Confirmation Dialog */}
              {spreadsheetMeta && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#0B1D4A]">
                        Paso 3: Sincronizar Programación ({dataRows.length} turnos seleccionados)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Envía los turnos del calendario a la pestaña <strong>"{selectedTabName}"</strong> o lee los datos actuales de tu hoja.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={isReadingSheet || isSyncing}
                        onClick={handleReadFromSheet}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0B1D4A] border border-slate-300 font-bold text-xs cursor-pointer"
                      >
                        <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                        <span>{isReadingSheet ? 'Leyendo...' : 'Leer Datos de la Hoja'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSyncing || dataRows.length === 0}
                        onClick={() => setConfirmingSync(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Sincronizar Calendario a Google Sheets</span>
                      </button>
                    </div>
                  </div>

                  {/* MANDATORY USER CONFIRMATION DIALOG FOR MUTATING GOOGLE SHEETS DATA */}
                  {confirmingSync && (
                    <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 space-y-3 shadow-sm">
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="font-bold text-xs text-amber-950">
                            Confirmar actualización en tu archivo de Google Sheets
                          </h5>
                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            Estás por{' '}
                            <strong>
                              {syncMode === 'replace'
                                ? 'reemplazar el contenido de la pestaña'
                                : 'anexar nuevas filas al final de la pestaña'}
                            </strong>{' '}
                            <strong>"{selectedTabName}"</strong> dentro del archivo{' '}
                            <strong>"{spreadsheetMeta.title}"</strong> con{' '}
                            <strong>{dataRows.length} turnos programados</strong> ({periodBounds.label}).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={() => setConfirmingSync(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={handleConfirmedSyncToSheets}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {isSyncing
                              ? 'Actualizando Google Sheets...'
                              : `Confirmar y Actualizar (${dataRows.length} turnos)`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preview of data read from Google Sheet */}
                  {sheetPreviewRows && (
                    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden space-y-2">
                      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-slate-800">
                          Contenido actual en "{selectedTabName}" ({sheetPreviewRows.length} filas)
                        </span>
                        {importableShiftsFromSheet.length > 0 && !confirmingImport && (
                          <button
                            type="button"
                            onClick={() => setConfirmingImport(true)}
                            className="px-3 py-1 rounded-lg bg-[#0B1D4A] text-[#FFB566] font-bold text-[11px] cursor-pointer"
                          >
                            Importar {importableShiftsFromSheet.length} turnos nuevos al Calendario
                          </button>
                        )}
                      </div>

                      {confirmingImport && (
                        <div className="m-3 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 flex-wrap">
                          <span className="font-semibold text-blue-950 text-[11px]">
                            ¿Deseas agregar {importableShiftsFromSheet.length} turnos encontrados en tu Google Sheet al calendario de WhiteGlove?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmingImport(false)}
                              className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-[11px] cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmImportFromSheets}
                              className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Confirmar Importación
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="max-h-48 overflow-auto">
                        {sheetPreviewRows.length === 0 ? (
                          <div className="p-6 text-center text-slate-400">
                            La pestaña seleccionada no tiene filas registradas.
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse text-[11px]">
                            <tbody>
                              {sheetPreviewRows.slice(0, 25).map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className={
                                    rIdx === 0
                                      ? 'bg-slate-800 text-white font-bold'
                                      : 'border-b border-slate-100 hover:bg-slate-50'
                                  }
                                >
                                  {row.slice(0, 8).map((cell, cIdx) => (
                                    <td key={cIdx} className="py-1.5 px-2.5 truncate max-w-[160px]">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Los cambios programados en el calendario están listos para exportarse en cualquier momento.
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
