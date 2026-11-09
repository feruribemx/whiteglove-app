import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Play, Square, Pause, RotateCcw, Building2, Calendar,
  CheckCircle2, Sparkles, MapPin, KeyRound, FileText, AlertCircle,
  Timer, DollarSign, ChevronRight, ShieldCheck, ArrowRight, Compass
} from 'lucide-react';
import { TYPES } from '../lib/supabase';
import {
  getSavedRatesConfig,
  resolveCleanerHourlyRate,
  resolveClientHourlyRate,
} from '../lib/ratesConfig';
import { resolveClientMemory } from '../lib/clientMemory';
import { saveSettingToFirestore } from '../lib/firebase';
import { formatHoursAndMinutes } from './ServicesList';

function formatStopwatch(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return {
    hh: String(h).padStart(2, '0'),
    mm: String(m).padStart(2, '0'),
    ss: String(s).padStart(2, '0'),
    formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    hoursWhole: h,
    minutesWhole: m,
    secondsRem: s,
  };
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime12h(dateObj) {
  if (!dateObj) return '';
  try {
    const d = typeof dateObj === 'string' || typeof dateObj === 'number' ? new Date(dateObj) : dateObj;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export default function CleanerTimeClock({
  currentUser,
  availableUnits = [],
  services = [],
  schedule = [],
  rates = {},
  ratesConfig = null,
  clientMemory = null,
  onSaveService,
  onUpdateSchedule,
  onOpenClientDossier,
  onOpenCalendar,
}) {
  const cleanerName = currentUser?.displayName || currentUser?.username || 'Cleaner';
  const storageKey = `wg_active_clock_${cleanerName.toLowerCase().trim()}`;
  const activeRatesConfig = ratesConfig || getSavedRatesConfig();
  const todayStr = getTodayStr();

  // Today's scheduled shifts for this cleaner
  const todaysScheduledShifts = useMemo(() => {
    const cNorm = cleanerName.toLowerCase().trim();
    return (schedule || []).filter((sc) => {
      if (sc.fecha !== todayStr) return false;
      const st = (sc.estado || sc.status || '').toLowerCase();
      if (st === 'cancelado' || st === 'cancelled') return false;
      const list = Array.isArray(sc.cleaners) && sc.cleaners.length > 0 ? sc.cleaners : [sc.cleaner];
      return list.some((n) => (n || '').toLowerCase().trim() === cNorm);
    });
  }, [schedule, cleanerName, todayStr]);

  // Selection state before starting clock
  const [selectedUnit, setSelectedUnit] = useState(() => {
    if (todaysScheduledShifts.length > 0) return todaysScheduledShifts[0].unidad || '';
    return availableUnits[0] || '';
  });
  const [selectedTipo, setSelectedTipo] = useState(() => {
    if (todaysScheduledShifts.length > 0) return todaysScheduledShifts[0].tipo || 'Limpieza';
    return 'Limpieza';
  });
  const [selectedScheduleId, setSelectedScheduleId] = useState(() => {
    if (todaysScheduledShifts.length > 0) return todaysScheduledShifts[0].id || null;
    return null;
  });

  // Active Clock State persisted in localStorage so refreshing or locking phone never loses timer
  const [clockState, setClockState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isActive) return parsed;
      }
    } catch {}
    return null;
  });

  // Tick counter for live stopwatch UI
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Checkout confirmation modal state
  const [checkoutConfirm, setCheckoutConfirm] = useState(null);
  // Last registered service banner
  const [lastCompletedSummary, setLastCompletedSummary] = useState(null);

  // Sync selectedUnit default if todaysScheduledShifts loads asynchronously
  useEffect(() => {
    if (!clockState && todaysScheduledShifts.length > 0 && !selectedUnit) {
      setSelectedUnit(todaysScheduledShifts[0].unidad || availableUnits[0] || '');
      setSelectedTipo(todaysScheduledShifts[0].tipo || 'Limpieza');
      setSelectedScheduleId(todaysScheduledShifts[0].id || null);
    } else if (!clockState && !selectedUnit && availableUnits.length > 0) {
      setSelectedUnit(availableUnits[0]);
    }
  }, [todaysScheduledShifts, availableUnits, clockState, selectedUnit]);

  // 1-second interval while clock is active
  useEffect(() => {
    if (!clockState?.isActive) return;
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [clockState?.isActive, clockState?.isPaused]);

  // Persist clockState to localStorage & Firestore active_clocks
  const saveClockState = (nextState) => {
    setClockState(nextState);
    try {
      if (nextState) {
        localStorage.setItem(storageKey, JSON.stringify(nextState));
      } else {
        localStorage.removeItem(storageKey);
      }
      // Also mirror active clock status to cloud so Admin can see active clocks
      const allClocksRaw = localStorage.getItem('wg_all_active_clocks');
      const allClocks = allClocksRaw ? JSON.parse(allClocksRaw) : {};
      if (nextState) {
        allClocks[cleanerName] = nextState;
      } else {
        delete allClocks[cleanerName];
      }
      localStorage.setItem('wg_all_active_clocks', JSON.stringify(allClocks));
      saveSettingToFirestore('active_clocks', allClocks).catch(() => {});
    } catch {}
  };

  // Calculate live elapsed seconds
  const elapsedSeconds = useMemo(() => {
    if (!clockState || !clockState.isActive) return 0;
    const accumulated = Number(clockState.accumulatedSeconds) || 0;
    if (clockState.isPaused || !clockState.lastResumeMs) {
      return accumulated;
    }
    const currentRunSec = Math.max(0, Math.floor((nowMs - clockState.lastResumeMs) / 1000));
    return accumulated + currentRunSec;
  }, [clockState, nowMs]);

  const stopwatch = useMemo(() => formatStopwatch(elapsedSeconds), [elapsedSeconds]);

  // Resolve property dossier info for quick access (Address, Lockbox, Notes) safely
  const activeUnitName = clockState?.isActive ? clockState.unidad : selectedUnit;
  const activeUnitDossier = useMemo(() => {
    if (!activeUnitName) return null;
    try {
      return resolveClientMemory(activeUnitName, services, clientMemory);
    } catch {
      return null;
    }
  }, [activeUnitName, services, clientMemory]);

  // Start Clock (Check-In)
  const handleStartClock = (customShift = null) => {
    const unitToStart = customShift?.unidad || selectedUnit || availableUnits[0] || 'Cliente General';
    const tipoToStart = customShift?.tipo || selectedTipo || 'Limpieza';
    const schedId = customShift?.id || selectedScheduleId || null;
    const startMs = Date.now();
    const nextState = {
      isActive: true,
      isPaused: false,
      cleaner: cleanerName,
      unidad: unitToStart,
      tipo: tipoToStart,
      scheduleId: schedId,
      fecha: getTodayStr(),
      startTimeMs: startMs,
      lastResumeMs: startMs,
      accumulatedSeconds: 0,
      clockInLabel: formatTime12h(startMs),
    };
    setLastCompletedSummary(null);
    saveClockState(nextState);
  };

  // Pause / Resume Clock
  const handleTogglePause = () => {
    if (!clockState || !clockState.isActive) return;
    const now = Date.now();
    if (clockState.isPaused) {
      // Resume
      saveClockState({
        ...clockState,
        isPaused: false,
        lastResumeMs: now,
      });
    } else {
      // Pause
      const currentRunSec = Math.max(0, Math.floor((now - (clockState.lastResumeMs || now)) / 1000));
      saveClockState({
        ...clockState,
        isPaused: true,
        accumulatedSeconds: (Number(clockState.accumulatedSeconds) || 0) + currentRunSec,
        lastResumeMs: null,
      });
    }
  };

  // Prepare Stop Clock (Open Check-Out summary & confirmation)
  const handleRequestStopClock = () => {
    if (!clockState || !clockState.isActive) return;
    const endMs = Date.now();
    const totalSec = Math.max(60, elapsedSeconds); // Minimum 1 minute
    let wholeHours = Math.floor(totalSec / 3600);
    let exactMins = Math.round((totalSec % 3600) / 60);
    if (exactMins >= 60) {
      wholeHours += 1;
      exactMins = 0;
    }
    if (wholeHours === 0 && exactMins === 0) {
      exactMins = 1;
    }

    const decimalHours = parseFloat((wholeHours + exactMins / 60).toFixed(2));
    const fallbackCleanerRate = Number(rates?.[clockState.tipo]?.amount) || 20;
    const cleanerHourlyRate = resolveCleanerHourlyRate(
      cleanerName,
      clockState.unidad,
      activeRatesConfig,
      fallbackCleanerRate
    );
    const calculatedCleanerPay = parseFloat((decimalHours * cleanerHourlyRate).toFixed(2));

    // Also calculate Client Billing (cobro)
    const clientHourlyRate = resolveClientHourlyRate(clockState.unidad, activeRatesConfig);
    const memory = activeUnitDossier;
    let calculatedClientCobro = 0;
    if (clientHourlyRate !== null && clientHourlyRate > 0) {
      calculatedClientCobro = parseFloat((decimalHours * clientHourlyRate).toFixed(2));
    } else if (memory?.cobro && Number(memory.cobro) > 0) {
      calculatedClientCobro = Number(memory.cobro);
    }

    setCheckoutConfirm({
      unidad: clockState.unidad,
      tipo: clockState.tipo,
      fecha: clockState.fecha || getTodayStr(),
      clockIn: clockState.clockInLabel || formatTime12h(clockState.startTimeMs),
      clockOut: formatTime12h(endMs),
      startTimeMs: clockState.startTimeMs,
      endTimeMs: endMs,
      totalSeconds: totalSec,
      horasEnteras: wholeHours,
      minutos: exactMins,
      horasDecimal: decimalHours,
      cleanerHourlyRate,
      calculatedCleanerPay,
      calculatedClientCobro,
      scheduleId: clockState.scheduleId,
      notasTurno: '',
    });
  };

  // Confirm Check-Out and Save to Services + Payroll + Schedule
  const handleConfirmCheckout = async () => {
    if (!checkoutConfirm || !onSaveService) return;

    const {
      unidad,
      tipo,
      fecha,
      clockIn,
      clockOut,
      horasEnteras,
      minutos,
      cleanerHourlyRate,
      calculatedClientCobro,
      scheduleId,
    } = checkoutConfirm;

    const decHours = parseFloat(((Number(horasEnteras) || 0) + (Number(minutos) || 0) / 60).toFixed(2));
    const finalCleanerPay = parseFloat((decHours * cleanerHourlyRate).toFixed(2));
    const clientHourlyRate = resolveClientHourlyRate(unidad, activeRatesConfig);
    const finalCobro =
      clientHourlyRate !== null && clientHourlyRate > 0
        ? parseFloat((decHours * clientHourlyRate).toFixed(2))
        : calculatedClientCobro;

    const servicePayload = {
      fecha,
      unidad,
      cleaner: cleanerName,
      cleaners: [cleanerName],
      horas: decHours,
      horasEnteras: Number(horasEnteras) || 0,
      minutos: Number(minutos) || 0,
      horasPorCleaner: { [cleanerName]: decHours },
      pagosPorCleaner: { [cleanerName]: finalCleanerPay },
      ratesPorCleaner: { [cleanerName]: cleanerHourlyRate },
      pagoCleaner: finalCleanerPay,
      pagoCleaningTeam: 0,
      tip: 0,
      cobro: finalCobro,
      cobranzaStatus: 'pendiente',
      metodoCobro: 'E-Transfer',
      tipo: tipo || 'Limpieza',
      status: 'activo',
      capturista: `${cleanerName} (Reloj Checador)`,
      clockIn,
      clockOut,
      clockedSeconds: checkoutConfirm.totalSeconds,
      isClockedService: true,
    };

    await onSaveService(servicePayload);

    // If linked to a scheduled shift, mark completed
    const matchingShift =
      (scheduleId && schedule.find((s) => String(s.id) === String(scheduleId))) ||
      todaysScheduledShifts.find((s) => (s.unidad || '').toLowerCase() === (unidad || '').toLowerCase());

    if (matchingShift && onUpdateSchedule) {
      onUpdateSchedule(matchingShift.id, {
        estado: 'completado',
        status: 'completed',
        clockIn,
        clockOut,
        horasReales: decHours,
      });
    }

    saveClockState(null);
    setCheckoutConfirm(null);
    setLastCompletedSummary({
      unidad,
      tipo,
      fecha,
      clockIn,
      clockOut,
      horas: decHours,
      horasEnteras,
      minutos,
    });
  };

  // Cancel active clock without saving
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const handleDiscardClock = () => {
    saveClockState(null);
    setShowCancelConfirm(false);
    setCheckoutConfirm(null);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0B1D4A]/95 via-[#11235A]/90 to-[#071330]/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(7,19,48,0.7)] text-white transition-all duration-300">
      
      {/* Subtle Ambient Glow Orbs */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar: Elegant Luxury Branding */}
      <div className="relative border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-3 h-3 rounded-full ${
                clockState?.isActive
                  ? clockState.isPaused
                    ? 'bg-amber-400 animate-pulse ring-4 ring-amber-400/20'
                    : 'bg-emerald-400 animate-ping ring-4 ring-emerald-400/20'
                  : 'bg-[#FFB566] ring-4 ring-[#FFB566]/20'
              }`}
            />
            {clockState?.isActive && !clockState.isPaused && (
              <span className="absolute w-3 h-3 rounded-full bg-emerald-400" />
            )}
          </div>
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-[#FFB566] block">
              WhiteGlove Concierge Chronometer
            </span>
            <h2 className="font-serif text-base sm:text-lg text-[#FAF7F1] tracking-wide font-medium">
              {clockState?.isActive
                ? clockState.isPaused
                  ? 'Turno en Pausa · Tiempo Resguardado'
                  : 'Servicio en Curso · Registro Activo de Horas'
                : 'Reloj Checador de Turno'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300/90 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md">
          <span className="font-serif italic text-white text-sm">{cleanerName}</span>
          <span className="text-white/30">•</span>
          <span className="text-[11px] font-medium tracking-wide">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>

      <div className="relative p-6 sm:p-8 space-y-6">
        
        {/* Completed Shift Banner */}
        {lastCompletedSummary && !clockState?.isActive && (
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-teal-950/40 border border-emerald-400/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300 shadow-lg">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-serif text-base text-emerald-100 font-semibold tracking-wide">
                  Servicio Concluido con Éxito
                </h4>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Propiedad <strong className="text-white">{lastCompletedSummary.unidad}</strong> vinculada a tu nómina.
                  Horario checado: <span className="font-mono text-emerald-300">{lastCompletedSummary.clockIn} → {lastCompletedSummary.clockOut}</span> ({formatHoursAndMinutes(lastCompletedSummary.horas)}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastCompletedSummary(null)}
              className="text-xs font-semibold text-emerald-300 hover:text-white underline self-end sm:self-center cursor-pointer transition-colors"
            >
              Cerrar aviso
            </button>
          </div>
        )}

        {/* STATE A: CLOCK IS CURRENTLY RUNNING */}
        {clockState?.isActive ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Elegant Luxury Timepiece Dial (Glassmorphic) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-md rounded-3xl p-8 text-center bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/20 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden">
                
                {/* Dial ambient ring */}
                <div className="absolute inset-0 bg-radial from-amber-400/10 via-transparent to-transparent pointer-events-none" />

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200 backdrop-blur-md mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-medium tracking-wide">
                    Check-In registrado: <strong className="font-mono text-white">{clockState.clockInLabel || formatTime12h(clockState.startTimeMs)}</strong>
                  </span>
                </div>

                {/* Haute-Horlogerie Display */}
                <div className="flex items-baseline justify-center gap-2 sm:gap-3 my-2 text-white">
                  <div className="flex flex-col items-center">
                    <span className="font-serif text-5xl sm:text-6xl font-light tracking-tight tabular-nums text-white drop-shadow-sm">
                      {stopwatch.hh}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mt-1 font-semibold">
                      Horas
                    </span>
                  </div>

                  <span className="font-serif text-3xl sm:text-4xl text-[#FFB566]/70 pb-4 animate-pulse">
                    :
                  </span>

                  <div className="flex flex-col items-center">
                    <span className="font-serif text-5xl sm:text-6xl font-light tracking-tight tabular-nums text-white drop-shadow-sm">
                      {stopwatch.mm}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mt-1 font-semibold">
                      Minutos
                    </span>
                  </div>

                  <span className="font-serif text-3xl sm:text-4xl text-[#FFB566]/70 pb-4 animate-pulse">
                    :
                  </span>

                  <div className="flex flex-col items-center">
                    <span className="font-serif text-5xl sm:text-6xl font-light tracking-tight tabular-nums text-[#FFB566] drop-shadow-sm">
                      {stopwatch.ss}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.25em] text-[#FFB566]/70 mt-1 font-semibold">
                      Segundos
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB566]" />
                  <span>Servicio en curso:</span>
                  <span className="font-serif font-bold text-white text-sm">{clockState.unidad}</span>
                  <span className="text-slate-500">({clockState.tipo})</span>
                </div>
              </div>
            </div>

            {/* Active Controls & Property Card */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Property Details Glass Card */}
              <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/15 backdrop-blur-xl shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400">
                    Ficha de la Propiedad
                  </span>
                  {onOpenClientDossier && (
                    <button
                      type="button"
                      onClick={() => onOpenClientDossier(clockState.unidad)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFB566] hover:text-[#ffca88] transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ficha Técnica</span>
                    </button>
                  )}
                </div>

                <div className="font-serif text-lg font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFB566]/15 border border-[#FFB566]/30 flex items-center justify-center text-[#FFB566]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span>{clockState.unidad}</span>
                </div>

                {activeUnitDossier && (activeUnitDossier.direccion || activeUnitDossier.codigoAcceso) && (
                  <div className="pt-2.5 border-t border-white/10 space-y-2 text-xs text-slate-300">
                    {activeUnitDossier.direccion && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{activeUnitDossier.direccion}</span>
                      </div>
                    )}
                    {activeUnitDossier.codigoAcceso && (
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Acceso / Lockbox: <strong className="text-white font-mono">{activeUnitDossier.codigoAcceso}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Stop & Pause */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleRequestStopClock}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-serif font-bold text-base shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Concluir Servicio · Detener Reloj</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className={`py-3 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border transition-all duration-200 cursor-pointer ${
                      clockState.isPaused
                        ? 'bg-[#FFB566] text-[#0B1D4A] border-[#FFB566] font-bold shadow-md'
                        : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border-white/15 backdrop-blur-md'
                    }`}
                  >
                    {clockState.isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Reanudar Turno</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar Descanso</span>
                      </>
                    )}
                  </button>

                  {!showCancelConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(true)}
                      className="py-3 px-4 rounded-xl font-medium text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 backdrop-blur-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Descartar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDiscardClock}
                      className="py-3 px-4 rounded-xl font-bold text-xs bg-rose-600 text-white flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg"
                    >
                      <span>¿Confirmar Descarte?</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* STATE B: READY TO START SERVICE (CHECK-IN) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Side: Welcoming Luxury Concierge Tone & Today's Appointments */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#FFB566] block mb-1">
                  Atención Exclusiva · WhiteGlove
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-white leading-tight">
                  Bienvenida, <span className="font-serif italic text-[#FFB566]">{cleanerName}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300/90 mt-2 leading-relaxed">
                  Al llegar al servicio, pulsa <strong className="text-white font-semibold">Iniciar Reloj Checador</strong>. Tu tiempo se contabilizará automáticamente al segundo para garantizar una liquidación transparente y precisa de tu nómina.
                </p>
              </div>

              {/* Today's Scheduled Appointments */}
              {todaysScheduledShifts.length > 0 ? (
                <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/15 backdrop-blur-xl shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#FFB566] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Turnos Asignados para Hoy ({todaysScheduledShifts.length})</span>
                    </span>
                    {onOpenCalendar && (
                      <button
                        type="button"
                        onClick={onOpenCalendar}
                        className="text-xs text-slate-300 hover:text-white underline cursor-pointer transition-colors"
                      >
                        Ver agenda completa →
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {todaysScheduledShifts.map((shift) => {
                      const isDone =
                        (shift.estado || '').toLowerCase() === 'completado' ||
                        shift.status === 'completed';
                      const isSelected = selectedUnit === shift.unidad;
                      return (
                        <div
                          key={shift.id}
                          onClick={() => {
                            setSelectedUnit(shift.unidad);
                            setSelectedTipo(shift.tipo || 'Limpieza');
                            setSelectedScheduleId(shift.id);
                          }}
                          className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#FFB566]/15 border-[#FFB566] shadow-[0_0_20px_rgba(255,181,102,0.15)]'
                              : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-serif font-bold text-sm text-white truncate flex items-center gap-2">
                              <span>{shift.unidad}</span>
                              {isDone && (
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-sans font-semibold">
                                  Hecho
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1">
                              {shift.horaInicio ? `🕒 ${shift.horaInicio}` : 'Horario programado'} • {shift.tipo || 'Limpieza'}
                            </div>
                          </div>

                          {!isDone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartClock(shift);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#FFB566] hover:bg-[#ffc680] text-[#0B1D4A] font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                            >
                              <Play className="w-3 h-3 fill-[#0B1D4A]" />
                              <span>Iniciar</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-3">
                    <Compass className="w-4 h-4 text-[#FFB566] shrink-0" />
                    <span>Selecciona el nombre del cliente o servicio que estás por iniciar.</span>
                  </div>
                  {onOpenCalendar && (
                    <button
                      type="button"
                      onClick={onOpenCalendar}
                      className="text-xs font-semibold text-[#FFB566] hover:underline shrink-0 cursor-pointer"
                    >
                      Ver Calendario
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Side: Check-In Setup Form (Frosted Glass) */}
            <div className="lg:col-span-5 rounded-3xl p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/20 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.4)] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#FFB566] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Check-In de Servicio</span>
                </span>
                {selectedUnit && onOpenClientDossier && (
                  <button
                    type="button"
                    onClick={() => onOpenClientDossier(selectedUnit)}
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Ficha Técnica</span>
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Propiedad o Cliente:
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => {
                      setSelectedUnit(e.target.value);
                      setSelectedScheduleId(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[#071330]/80 border border-white/20 text-white text-sm font-serif font-medium focus:outline-none focus:border-[#FFB566] transition-colors"
                  >
                    {availableUnits.map((u) => (
                      <option key={u} value={u} className="bg-[#0B1D4A] text-white">
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Modalidad del Servicio:
                  </label>
                  <select
                    value={selectedTipo}
                    onChange={(e) => setSelectedTipo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#071330]/80 border border-white/20 text-white text-xs font-medium focus:outline-none focus:border-[#FFB566] transition-colors"
                  >
                    {(TYPES || ['Limpieza', 'Deep Clean', 'Move-Out', 'Airbnb']).map((t) => (
                      <option key={t} value={t} className="bg-[#0B1D4A] text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick preview of address and lockbox if available */}
                {activeUnitDossier && (activeUnitDossier.direccion || activeUnitDossier.codigoAcceso) && (
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 space-y-1.5">
                    {activeUnitDossier.direccion && (
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{activeUnitDossier.direccion}</span>
                      </div>
                    )}
                    {activeUnitDossier.codigoAcceso && (
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Acceso: <strong className="text-white font-mono">{activeUnitDossier.codigoAcceso}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleStartClock()}
                  className="w-full mt-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FFB566] via-[#F4A261] to-[#E76F51] hover:brightness-105 text-[#0B1D4A] font-serif font-bold text-sm sm:text-base tracking-wide shadow-[0_10px_25px_-5px_rgba(255,181,102,0.4)] flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-[#0B1D4A]" />
                  <span>INICIAR RELOJ (CHECK-IN)</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* CHECK-OUT CONFIRMATION MODAL */}
      {checkoutConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white text-[#0B1D4A] rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            
            <div className="bg-[#0B1D4A] text-white p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#FFB566] font-semibold block">
                  Cierre de Servicio
                </span>
                <h3 className="font-serif text-lg font-bold text-white">
                  Confirmación de Check-Out
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Cleaner:</span>
                  <span className="font-serif font-bold text-[#0B1D4A] text-sm">{cleanerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Propiedad:</span>
                  <span className="font-bold text-[#0B1D4A]">{checkoutConfirm.unidad}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Horario Registrado:</span>
                  <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-semibold">
                    {checkoutConfirm.clockIn} → {checkoutConfirm.clockOut}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Duración Total:</span>
                  <span className="font-serif text-base font-bold text-[#0B1D4A]">
                    {checkoutConfirm.horasEnteras}h {checkoutConfirm.minutos}m{' '}
                    <span className="text-xs font-normal text-slate-500 font-sans">
                      ({checkoutConfirm.horasDecimal} hrs)
                    </span>
                  </span>
                </div>
              </div>

              {/* Adjust minutes if needed before saving */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
                <span className="text-xs font-medium text-amber-900 block">
                  ¿Deseas ajustar las horas o minutos antes de enviar a Nómina?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Horas</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={checkoutConfirm.horasEnteras}
                      onChange={(e) => {
                        const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                        const dec = parseFloat((h + (Number(checkoutConfirm.minutos) || 0) / 60).toFixed(2));
                        setCheckoutConfirm((prev) => ({
                          ...prev,
                          horasEnteras: h,
                          horasDecimal: dec,
                        }));
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-bold text-[#0B1D4A] focus:outline-none focus:border-[#0B1D4A]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Minutos (0–59)</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={checkoutConfirm.minutos}
                      onChange={(e) => {
                        const m = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                        const dec = parseFloat(((Number(checkoutConfirm.horasEnteras) || 0) + m / 60).toFixed(2));
                        setCheckoutConfirm((prev) => ({
                          ...prev,
                          minutos: m,
                          horasDecimal: dec,
                        }));
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-bold text-[#0B1D4A] focus:outline-none focus:border-[#0B1D4A]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutConfirm(null)}
                  className="px-4 py-2.5 rounded-xl font-medium text-xs text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Seguir en Turno
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  className="px-5 py-2.5 rounded-xl font-serif font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar y Enviar a Nómina</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
