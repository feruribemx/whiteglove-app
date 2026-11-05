import React, { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, DollarSign, Clock, User, Building2, AlertCircle, Ban,
  CheckCircle2, RotateCcw, Sparkles, Copy, RefreshCw, BookmarkCheck, Sliders
} from 'lucide-react';
import { hasFullAccess, canManagePagos, isSupervisorFerCastil } from '../lib/auth';
import { TYPES } from '../lib/supabase';
import { resolveClientMemory, saveClientMemory } from '../lib/clientMemory';
import {
  getSavedRatesConfig,
  resolveCleanerHourlyRate,
  resolveClientHourlyRate
} from '../lib/ratesConfig';

export default function ServiceModal({
  isOpen,
  onClose,
  serviceToEdit,
  onSave,
  onDeleteService,
  onAddClient,
  onOpenAddCleaner,
  onOpenRatesConfig,
  availableUnits = [],
  availableCleaners = [],
  rates,
  ratesConfig,
  currentUser,
  services = [],
  clientMemory = null,
}) {
  const showFinancials = hasFullAccess(currentUser);
  const activeRatesConfig = ratesConfig || getSavedRatesConfig();
  const canEditPay = canManagePagos(currentUser);
  const isSupervisorFer = isSupervisorFerCastil(currentUser);
  const isCleaner = currentUser?.role === 'cleaner';
  const loggedCleanerName = currentUser?.displayName || currentUser?.username || 'Cleaner';
  const isDuplicateMode = Boolean(serviceToEdit?.isDuplicate);
  const isRealEdit = Boolean(serviceToEdit && serviceToEdit.id && !serviceToEdit.isDuplicate && !serviceToEdit.nativeEvent);

  // Form State
  const [fecha, setFecha] = useState('');
  const [unidad, setUnidad] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [selectedCleaners, setSelectedCleaners] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Duration: Hours & Minutes
  const [horasEnteras, setHorasEnteras] = useState(2);
  const [minutos, setMinutos] = useState(0);

  const [tipo, setTipo] = useState('Limpieza');
  const [status, setStatus] = useState('activo'); // 'activo' | 'cancelado'
  const [cobro, setCobro] = useState('');
  const [pagoCleaner, setPagoCleaner] = useState('');
  const [pagoCleaningTeam, setPagoCleaningTeam] = useState('');
  const [tip, setTip] = useState('');
  const [ratesPorCleaner, setRatesPorCleaner] = useState({});
  const [pagosPorCleaner, setPagosPorCleaner] = useState({});
  const [capturista, setCapturista] = useState('');
  const [validationError, setValidationError] = useState('');

  // Memory & Recurring Client State
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [autofillBanner, setAutofillBanner] = useState(null);

  // New Client Modal State
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState('Limpieza');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientRate, setNewClientRate] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);

  // Calculate decimal hours from hours + minutes
  const computeDecimalHours = (h, m) => {
    const hours = Number(h) || 0;
    const mins = Number(m) || 0;
    return parseFloat((hours + mins / 60).toFixed(2));
  };

  // Default suggested pay rate calculation using Cleaner + Client rules
  const getRateForCleaner = (cleanerName, targetUnit = unidad, currentRatesMap = ratesPorCleaner) => {
    const fallback = Number(rates?.[tipo]?.amount) || 20;
    const configured = resolveCleanerHourlyRate(cleanerName, targetUnit, activeRatesConfig, fallback);
    if (currentRatesMap && currentRatesMap[cleanerName] != null && currentRatesMap[cleanerName] !== '') {
      return Number(currentRatesMap[cleanerName]);
    }
    return configured;
  };

  useEffect(() => {
    // Determine if serviceToEdit is a real existing service with an ID, or a template/null
    const isReal = Boolean(serviceToEdit && serviceToEdit.id && !serviceToEdit.isDuplicate && !serviceToEdit.nativeEvent);
    const prefill = (serviceToEdit && typeof serviceToEdit === 'object' && !serviceToEdit.nativeEvent) ? serviceToEdit : null;

    if (isReal) {
      setFecha(serviceToEdit.fecha || '');
      const selectedUnit = serviceToEdit.unidad || availableUnits[0] || 'Cliente General';
      setUnidad(selectedUnit);
      const cls = isCleaner
        ? [loggedCleanerName]
        : (serviceToEdit.cleaners?.length
        ? serviceToEdit.cleaners
        : serviceToEdit.cleaner
        ? [serviceToEdit.cleaner]
        : (isSupervisorFer ? ['Maria'] : [availableCleaners[0] || 'Maria']));
      setSelectedCleaners(cls);

      // Parse hours and minutes from decimal
      const totalH = Number(serviceToEdit.horas) || 2;
      const whole = Math.floor(totalH);
      const dec = totalH - whole;
      const mins = Math.round(dec * 60);
      setHorasEnteras(whole);
      setMinutos(mins);

      setTipo(serviceToEdit.tipo || 'Limpieza');
      setStatus(serviceToEdit.status || 'activo');
      setCobro(serviceToEdit.cobro != null ? String(serviceToEdit.cobro) : '');
      setPagoCleaner(serviceToEdit.pagoCleaner != null ? String(serviceToEdit.pagoCleaner) : '');
      setPagoCleaningTeam(serviceToEdit.pagoCleaningTeam != null ? String(serviceToEdit.pagoCleaningTeam) : '');
      setTip(serviceToEdit.tip != null ? String(serviceToEdit.tip) : '');

      const fallbackRate = Number(rates?.[serviceToEdit.tipo || 'Limpieza']?.amount) || 20;
      const loadedRates = { ...(serviceToEdit.ratesPorCleaner || {}) };
      cls.forEach((cl) => {
        if (!loadedRates[cl]) {
          loadedRates[cl] = resolveCleanerHourlyRate(cl, selectedUnit, activeRatesConfig, fallbackRate);
        }
      });
      setRatesPorCleaner(loadedRates);
      setPagosPorCleaner(serviceToEdit.pagosPorCleaner || {});
      setCapturista(serviceToEdit.capturista || loggedCleanerName);

      const mem = resolveClientMemory(selectedUnit, services, clientMemory);
      setMemoryInfo(mem);

      if (serviceToEdit.isDuplicate && showFinancials) {
        setAutofillBanner(
          `Servicio duplicado para "${selectedUnit}". Cargo al cliente de $${serviceToEdit.cobro || 0} CAD y datos cargados en automático.`
        );
      } else {
        setAutofillBanner(null);
      }
    } else {
      // New service or prefilled template defaults
      const today = new Date().toISOString().split('T')[0];
      setFecha(prefill?.fecha || today);
      const initialUnit = prefill?.unidad || availableUnits[0] || 'Cliente General';
      setUnidad(initialUnit);

      let targetCleaners = [];
      if (isCleaner) {
        targetCleaners = [loggedCleanerName];
      } else if (isSupervisorFer) {
        targetCleaners = ['Maria'];
      } else if (prefill?.cleaners?.length) {
        targetCleaners = prefill.cleaners;
      } else if (prefill?.cleaner) {
        targetCleaners = [prefill.cleaner];
      } else if (availableCleaners.length) {
        targetCleaners = [availableCleaners[0]];
      } else {
        targetCleaners = ['Maria'];
      }
      setSelectedCleaners(targetCleaners);
      setStatus('activo');
      setTip(prefill?.tip != null ? String(prefill.tip) : '');
      setCapturista(currentUser?.displayName || currentUser?.username || loggedCleanerName || 'WhiteGlove');

      // Automatic memory recall & hourly rate for default client
      const mem = resolveClientMemory(initialUnit, services, clientMemory);
      setMemoryInfo(mem);
      const clientHrRate = resolveClientHourlyRate(initialUnit, activeRatesConfig);

      let initialWhole = 2;
      let initialMins = 0;

      if (mem && mem.horas) {
        initialWhole = Math.floor(mem.horas || 2);
        initialMins = Math.round(((mem.horas || 2) - initialWhole) * 60);
      } else if (prefill?.horas) {
        const prefH = Number(prefill.horas) || 2;
        initialWhole = Math.floor(prefH);
        initialMins = Math.round((prefH - initialWhole) * 60);
      }
      setHorasEnteras(initialWhole);
      setMinutos(initialMins);
      const initDecimalHours = computeDecimalHours(initialWhole, initialMins) || 2;

      if (clientHrRate != null && clientHrRate > 0) {
        const calcCobro = parseFloat((clientHrRate * initDecimalHours).toFixed(2));
        setCobro(String(calcCobro));
        setPagoCleaningTeam(mem?.pagoCleaningTeam ? String(mem.pagoCleaningTeam) : '');
        setTipo(mem?.tipo || prefill?.tipo || 'Limpieza');
        if (showFinancials) {
          setAutofillBanner(`Tarifa por hora de $${clientHrRate}/hr CAD para "${initialUnit}" aplicada (${initDecimalHours}h = $${calcCobro} CAD).`);
        } else {
          setAutofillBanner(null);
        }
      } else if (mem && mem.cobro != null && mem.cobro > 0) {
        setCobro(String(mem.cobro));
        setPagoCleaningTeam(mem.pagoCleaningTeam ? String(mem.pagoCleaningTeam) : '');
        setTipo(mem.tipo || 'Limpieza');
        if (showFinancials) {
          setAutofillBanner(`Tarifa habitual de $${mem.cobro} CAD para "${initialUnit}" cargada automáticamente desde memoria.`);
        } else {
          setAutofillBanner(null);
        }
      } else {
        setCobro(prefill?.cobro != null ? String(prefill.cobro) : '');
        setPagoCleaningTeam('');
        setTipo(prefill?.tipo || 'Limpieza');
        setAutofillBanner(null);
      }

      const defaultRate = rates?.['Limpieza']?.amount || 20;
      const initialRates = {};
      const initialPagos = {};
      targetCleaners.forEach((cl) => {
        const resolvedRate = resolveCleanerHourlyRate(cl, initialUnit, activeRatesConfig, defaultRate);
        initialRates[cl] = resolvedRate;
        initialPagos[cl] = parseFloat((resolvedRate * initDecimalHours).toFixed(2));
      });
      setRatesPorCleaner(initialRates);
      setPagosPorCleaner(initialPagos);
      const totalP = Object.values(initialPagos).reduce((s, v) => s + (Number(v) || 0), 0);
      setPagoCleaner(String(parseFloat(totalP.toFixed(2))));
    }
    setValidationError('');
    setIsSubmitting(false);
  }, [serviceToEdit, isOpen, isCleaner, loggedCleanerName, isSupervisorFer, availableUnits, services, ratesConfig]);

  // Recalculate suggested pay when cleaners, unit, or duration changes
  const updatePayForCleaners = (cleanersList, h, m, targetUnit = unidad, customRatesMap = null) => {
    const totalDecimal = computeDecimalHours(h, m);
    const fallbackRate = Number(rates?.[tipo]?.amount) || 20;
    const nextRates = {};
    const nextPagos = {};
    cleanersList.forEach(cl => {
      const rate = customRatesMap && customRatesMap[cl] != null
        ? Number(customRatesMap[cl])
        : resolveCleanerHourlyRate(cl, targetUnit, activeRatesConfig, fallbackRate);
      nextRates[cl] = rate;
      nextPagos[cl] = parseFloat((rate * totalDecimal).toFixed(2));
    });
    setRatesPorCleaner(nextRates);
    setPagosPorCleaner(nextPagos);
    const totalP = Object.values(nextPagos).reduce((s, v) => s + (Number(v) || 0), 0);
    setPagoCleaner(String(parseFloat(totalP.toFixed(2))));
  };

  const handleCleanerToggle = (cleanerName) => {
    if (isCleaner) return; // Cleaners cannot add or remove other cleaners
    let next;
    if (selectedCleaners.includes(cleanerName)) {
      if (selectedCleaners.length === 1) return; // Keep at least one
      next = selectedCleaners.filter(c => c !== cleanerName);
    } else {
      next = [...selectedCleaners, cleanerName];
    }
    setSelectedCleaners(next);
    updatePayForCleaners(next, horasEnteras, minutos, unidad, null);
  };

  const handleDurationChange = (newH, newM) => {
    setHorasEnteras(newH);
    setMinutos(newM);
    const totalDecimal = computeDecimalHours(newH, newM);
    updatePayForCleaners(selectedCleaners, newH, newM, unidad, ratesPorCleaner);

    // Also auto-update client charge if this client has a configured hourly billing rate
    const clientHrRate = resolveClientHourlyRate(unidad, activeRatesConfig);
    if (clientHrRate != null && clientHrRate > 0) {
      const calcCobro = parseFloat((clientHrRate * totalDecimal).toFixed(2));
      setCobro(String(calcCobro));
    }
  };

  const handleCustomCleanerRate = (cleanerName, newRateVal) => {
    const rateNum = Number(newRateVal) || 0;
    const nextRates = { ...ratesPorCleaner, [cleanerName]: rateNum };
    setRatesPorCleaner(nextRates);
    const totalDecimal = computeDecimalHours(horasEnteras, minutos);
    const nextPagos = {
      ...pagosPorCleaner,
      [cleanerName]: parseFloat((rateNum * totalDecimal).toFixed(2))
    };
    setPagosPorCleaner(nextPagos);
    const totalP = Object.values(nextPagos).reduce((s, v) => s + (Number(v) || 0), 0);
    setPagoCleaner(String(parseFloat(totalP.toFixed(2))));
  };

  const handleCustomCleanerPay = (cleanerName, amount) => {
    const nextPagos = { ...pagosPorCleaner, [cleanerName]: Number(amount) };
    setPagosPorCleaner(nextPagos);
    const totalP = Object.values(nextPagos).reduce((s, v) => s + (Number(v) || 0), 0);
    setPagoCleaner(String(parseFloat(totalP.toFixed(2))));
  };

  const handleUnitSelect = (newUnit) => {
    setUnidad(newUnit);
    const mem = resolveClientMemory(newUnit, services, clientMemory);
    setMemoryInfo(mem);
    const clientHrRate = resolveClientHourlyRate(newUnit, activeRatesConfig);

    let nextWhole = horasEnteras;
    let nextMins = minutos;

    if (!serviceToEdit || serviceToEdit.isDuplicate) {
      if (mem && mem.horas) {
        nextWhole = Math.floor(mem.horas);
        nextMins = Math.round((mem.horas - nextWhole) * 60);
        setHorasEnteras(nextWhole);
        setMinutos(nextMins);
      }
      if (mem && mem.tipo) setTipo(mem.tipo);
      if (mem && mem.pagoCleaningTeam > 0) {
        setPagoCleaningTeam(String(mem.pagoCleaningTeam));
      } else {
        setPagoCleaningTeam('');
      }
    }

    const totalDecimal = computeDecimalHours(nextWhole, nextMins);

    // Always recalculate cleaner hourly pay according to the new client (e.g. Mafer + Georgia = 23.50/hr, Mafer + Max = 20/hr)
    updatePayForCleaners(selectedCleaners, nextWhole, nextMins, newUnit, null);

    // Recalculate client charge based on hourly rate or client memory
    if (clientHrRate != null && clientHrRate > 0) {
      const calcCobro = parseFloat((clientHrRate * totalDecimal).toFixed(2));
      setCobro(String(calcCobro));
      if (showFinancials) {
        setAutofillBanner(`Tarifa por hora de $${clientHrRate}/hr CAD para "${newUnit}" aplicada (${totalDecimal}h = $${calcCobro} CAD).`);
      } else {
        setAutofillBanner(null);
      }
    } else if ((!serviceToEdit || serviceToEdit.isDuplicate) && mem && mem.cobro != null && mem.cobro > 0) {
      setCobro(String(mem.cobro));
      if (showFinancials) {
        setAutofillBanner(`Tarifa habitual de $${mem.cobro} CAD para "${newUnit}" cargada automáticamente desde memoria.`);
      } else {
        setAutofillBanner(null);
      }
    } else if (!serviceToEdit || serviceToEdit.isDuplicate) {
      setCobro('');
      setAutofillBanner(null);
    }
  };

  const handleCreateNewClient = async (e) => {
    e?.preventDefault?.();
    const trimmed = newClientName.trim();
    if (!trimmed) {
      setNewClientError('Por favor ingresa el nombre del nuevo cliente o unidad.');
      return;
    }
    setNewClientError('');
    setIsAddingClient(true);
    try {
      if (onAddClient) {
        await onAddClient(trimmed);
      }
      setUnidad(trimmed);
      if (newClientType) setTipo(newClientType);
      if (newClientRate && showFinancials && (!cobro || cobro === '')) {
        setCobro(newClientRate);
      }
      // Save newly registered client in persistent memory
      saveClientMemory(trimmed, {
        cobro: newClientRate ? Number(newClientRate) : null,
        tipo: newClientType || 'Limpieza',
        horas: 2,
        address: newClientAddress,
        notes: newClientNotes,
      });
      const mem = resolveClientMemory(trimmed, services);
      setMemoryInfo(mem);
      if (newClientRate) {
        setAutofillBanner(`Nueva tarifa de $${newClientRate} CAD guardada en memoria para "${trimmed}".`);
      }
      setNewClientName('');
      setNewClientAddress('');
      setNewClientRate('');
      setNewClientNotes('');
      setShowNewClientModal(false);
    } catch (err) {
      console.error('Error adding client:', err);
      setNewClientError('No se pudo registrar el cliente. Inténtalo de nuevo.');
    } finally {
      setIsAddingClient(false);
    }
  };

  const handleQuickAddPredefined = async (clientPresetName) => {
    try {
      if (onAddClient) {
        await onAddClient(clientPresetName);
      }
      handleUnitSelect(clientPresetName);
      setShowNewClientModal(false);
    } catch (err) {
      console.error('Error quick adding client:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setValidationError('');

    const finalFecha = (fecha || new Date().toISOString().split('T')[0]).trim();
    const finalUnidad = (unidad || availableUnits[0] || 'Cliente General').trim();

    let finalCleaners = Array.isArray(selectedCleaners) && selectedCleaners.length > 0
      ? selectedCleaners.filter(Boolean)
      : [];
    if (!finalCleaners.length) {
      if (isCleaner) finalCleaners = [loggedCleanerName];
      else if (isSupervisorFer) finalCleaners = ['Maria'];
      else if (availableCleaners.length) finalCleaners = [availableCleaners[0]];
      else finalCleaners = ['Maria'];
    }

    const totalDecimalHours = computeDecimalHours(horasEnteras, minutos);
    const finalHours = totalDecimalHours > 0 ? totalDecimalHours : 2;

    const isDup = Boolean(serviceToEdit?.isDuplicate);
    const targetId = (!isDup && serviceToEdit?.id)
      ? String(serviceToEdit.id)
      : String(Date.now() + Math.floor(Math.random() * 1000));

    // Calculate rates and payments cleanly
    const safePagos = {};
    finalCleaners.forEach((c) => {
      const p = pagosPorCleaner?.[c];
      if (p != null && !Number.isNaN(Number(p)) && p !== '') {
        safePagos[c] = Number(p);
      } else {
        const rate = Number(ratesPorCleaner?.[c]) || Number(rates?.[tipo]?.amount) || 18;
        safePagos[c] = parseFloat((rate * finalHours).toFixed(2));
      }
    });

    const safeRates = {};
    finalCleaners.forEach((c) => {
      safeRates[c] = Number(ratesPorCleaner?.[c]) || Number(rates?.[tipo]?.amount) || 18;
    });

    const totalCleanersPay = Object.values(safePagos).reduce((s, v) => s + (Number(v) || 0), 0);

    const payload = {
      ...(isRealEdit ? serviceToEdit : {}),
      id: targetId,
      fecha: finalFecha,
      unidad: finalUnidad,
      cleaners: finalCleaners,
      cleaner: finalCleaners[0],
      horas: finalHours,
      tipo: tipo || 'Limpieza',
      status: status || 'activo',
      cobro: showFinancials && cobro !== '' ? (Number(cobro) || 0) : (serviceToEdit?.cobro != null ? Number(serviceToEdit.cobro) : null),
      pagoCleaner: canEditPay && pagoCleaner !== '' ? (Number(pagoCleaner) || 0) : totalCleanersPay,
      pagosPorCleaner: Object.keys(safePagos).length ? safePagos : null,
      ratesPorCleaner: Object.keys(safeRates).length ? safeRates : null,
      pagoCleaningTeam: pagoCleaningTeam !== '' ? (Number(pagoCleaningTeam) || 0) : null,
      tip: tip !== '' ? (Number(tip) || 0) : null,
      capturista: capturista || currentUser?.displayName || currentUser?.username || 'WhiteGlove',
    };

    delete payload.isDuplicate;
    delete payload.nativeEvent;
    delete payload._reactName;

    // Persist client memory so future and recurring duplicates fill in automatic
    if (finalUnidad && cobro !== '') {
      saveClientMemory(finalUnidad, {
        cobro: Number(cobro) || 0,
        tipo,
        horas: finalHours,
        pagoCleaningTeam: pagoCleaningTeam !== '' ? (Number(pagoCleaningTeam) || 0) : 0,
        cleaners: finalCleaners,
      });
    }

    setIsSubmitting(true);
    onSave(payload);
  };

  const totalDecimalHours = computeDecimalHours(horasEnteras, minutos);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header with Status Indicator */}
        <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-lg font-bold text-[#FAF7F1]">
              {isCleaner
                ? (isRealEdit ? 'Editar Mi Servicio' : 'Registrar Mi Servicio')
                : (isDuplicateMode
                  ? 'Duplicar Servicio (Cliente Recurrente)'
                  : (isRealEdit ? 'Editar Servicio' : 'Capturar Nuevo Servicio'))}
            </span>
            {status === 'cancelado' && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/40 text-[10px] font-bold">
                Cancelado
              </span>
            )}
            {isDuplicateMode && (
              <span className="px-2 py-0.5 rounded-full bg-sky-400/25 text-sky-200 border border-sky-300/40 text-[10px] font-bold flex items-center gap-1">
                <Copy className="w-3 h-3 text-sky-300" />
                Duplicado
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Duplicate Mode Banner */}
          {isDuplicateMode && (
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-600 text-white rounded-xl shadow-2xs">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-sky-950">
                    Memoria Aplicada: Cliente Recurrente "{unidad}"
                  </span>
                  <span className="text-[11px] text-sky-800">
                    {showFinancials
                      ? `Cargo al cliente de $${cobro || 0} CAD, horas y datos cargados en automático para esta nueva fecha.`
                      : 'Horas y datos del turno cargados en automático para esta nueva fecha.'}
                  </span>
                </div>
              </div>
              <span className="px-2 py-1 rounded-lg bg-white border border-sky-200 text-sky-900 text-[10px] font-bold">
                Nuevo Folio
              </span>
            </div>
          )}

          {/* Autofill Notification Banner */}
          {autofillBanner && !isDuplicateMode && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{autofillBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutofillBanner(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-emerald-100"
              >
                ×
              </button>
            </div>
          )}

          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Service Status Toggle (Active vs Cancelled) */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Estado del Servicio</span>
              <span className="text-[11px] text-slate-500 block">
                {status === 'cancelado'
                  ? 'Este servicio está marcado como cancelado (no sumará a la nómina)'
                  : 'Servicio activo y computable para nómina'}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setStatus('activo')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  status === 'activo'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Activo</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('cancelado')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  status === 'cancelado'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            </div>
          </div>

          {/* Date & Service Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Servicio</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white font-semibold"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit / Client */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">Unidad / Cliente</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomUnit(!isCustomUnit)}
                  className="text-[11px] font-bold text-[#0B1D4A] hover:underline cursor-pointer"
                >
                  {isCustomUnit ? '← Elegir de lista' : '✏️ Escribir otro'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewClientError('');
                    setShowNewClientModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-[#0B1D4A] bg-[#FFB566]/25 hover:bg-[#FFB566]/40 border border-[#FFB566]/70 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-98"
                  title="Registrar un nuevo cliente o residencia para capturar servicios"
                >
                  <Plus className="w-3 h-3 text-[#0B1D4A] stroke-[3]" />
                  <span>+ Nuevo</span>
                </button>
              </div>
            </div>

            {isCustomUnit ? (
              <div className="relative">
                <input
                  type="text"
                  list="available-units-list"
                  placeholder="Escribe el nombre del cliente o unidad (ej: Mohammed, Phillys...)"
                  value={unidad}
                  onChange={(e) => handleUnitSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white font-semibold"
                  required
                />
                <datalist id="available-units-list">
                  {availableUnits.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            ) : (
              <select
                value={unidad}
                onChange={(e) => handleUnitSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white font-semibold"
                required
              >
                {availableUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            )}

            {/* Client Memory & Recurrence Info Badge (Strictly guarded by showFinancials) */}
            {showFinancials && (
              memoryInfo && memoryInfo.cobro > 0 ? (
                <div className="mt-2 flex items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-700 flex-wrap">
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900">Cliente Recurrente:</span>
                    {resolveClientHourlyRate(unidad, activeRatesConfig) ? (
                      <span>
                        Tarifa por hora <strong className="text-emerald-700 font-bold">${resolveClientHourlyRate(unidad, activeRatesConfig)}/hr CAD</strong>
                      </span>
                    ) : (
                      <span>
                        Tarifa en memoria <strong className="text-emerald-700 font-bold">${memoryInfo.cobro} CAD</strong>
                      </span>
                    )}
                    {memoryInfo.totalServices > 0 && (
                      <span className="text-slate-500">
                        ({memoryInfo.totalServices} {memoryInfo.totalServices === 1 ? 'servicio' : 'servicios'})
                      </span>
                    )}
                  </div>
                  {onOpenRatesConfig && (
                    <button
                      type="button"
                      onClick={onOpenRatesConfig}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer ml-2 shrink-0"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Tarifas $/hr</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[11px] text-slate-500 px-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#FFB566] shrink-0" />
                    <span>
                      {resolveClientHourlyRate(unidad, activeRatesConfig)
                        ? `Cobro configurado: $${resolveClientHourlyRate(unidad, activeRatesConfig)}/hr CAD × ${totalDecimalHours}h`
                        : 'El cargo que registres se guardará en automático en la memoria de este cliente.'}
                    </span>
                  </div>
                  {onOpenRatesConfig && (
                    <button
                      type="button"
                      onClick={onOpenRatesConfig}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer shrink-0"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Configurar $/hr</span>
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          {/* Cleaners Selection (Locked exclusively to logged in cleaner if isCleaner) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {isCleaner ? 'Cleaner Asignado' : `Cleaners Asignados (${selectedCleaners.length})`}
              </label>
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
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0B1D4A] text-[#FFB566] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {loggedCleanerName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{loggedCleanerName}</span>
                    <span className="text-[11px] text-amber-900 font-medium block">
                      Registrando servicio personal (exclusivo para tu usuario)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 shrink-0">
                  Tú
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-36 overflow-y-auto">
                {availableCleaners.map((cl) => {
                  const isSelected = selectedCleaners.includes(cl);
                  return (
                    <button
                      type="button"
                      key={cl}
                      onClick={() => handleCleanerToggle(cl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#0B1D4A] text-[#FFB566] shadow-xs font-bold'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {cl}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* DURATION WITH HOURS & MINUTES (15, 20, 30, 45 MIN) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Duración del Turno (Horas y Minutos)
              </label>
              <span className="text-xs font-bold text-[#0B1D4A] bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {horasEnteras}h {minutos > 0 ? `${minutos}m` : ''} ({totalDecimalHours} hrs)
              </span>
            </div>

            {/* Inputs for Hours and Minutes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Horas completas:</span>
                <select
                  value={horasEnteras}
                  onChange={(e) => handleDurationChange(Number(e.target.value), minutos)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((h) => (
                    <option key={h} value={h}>{h} {h === 1 ? 'hora' : 'horas'}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Minutos adicionales:</span>
                <select
                  value={minutos}
                  onChange={(e) => handleDurationChange(horasEnteras, Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value={0}>0 min</option>
                  <option value={15}>15 min (+0.25h)</option>
                  <option value={20}>20 min (+0.33h)</option>
                  <option value={30}>30 min (+0.50h)</option>
                  <option value={45}>45 min (+0.75h)</option>
                </select>
              </div>
            </div>

            {/* Quick preset buttons including 15, 20, 45 mins */}
            <div className="pt-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                Atajos Rápidos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '45m', h: 0, m: 45 },
                  { label: '1h 15m', h: 1, m: 15 },
                  { label: '1h 20m', h: 1, m: 20 },
                  { label: '1h 30m', h: 1, m: 30 },
                  { label: '1h 45m', h: 1, m: 45 },
                  { label: '2h', h: 2, m: 0 },
                  { label: '2h 15m', h: 2, m: 15 },
                  { label: '2h 20m', h: 2, m: 20 },
                  { label: '2h 30m', h: 2, m: 30 },
                  { label: '2h 45m', h: 2, m: 45 },
                  { label: '3h', h: 3, m: 0 },
                  { label: '3h 30m', h: 3, m: 30 },
                  { label: '4h', h: 4, m: 0 },
                ].map((preset) => {
                  const isCurrent = horasEnteras === preset.h && minutos === preset.m;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleDurationChange(preset.h, preset.m)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border font-bold transition-all ${
                        isCurrent
                          ? 'bg-[#0B1D4A] text-[#FFB566] border-[#0B1D4A] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Individual Cleaner Pay Breakdown (with Hourly Rate $/h + Total Pay) */}
          {selectedCleaners.length > 0 && canEditPay && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Pago por Hora y Total por Cleaner ({totalDecimalHours}h en {unidad || 'Cliente'})
                </span>
                {showFinancials && onOpenRatesConfig && (
                  <button
                    type="button"
                    onClick={onOpenRatesConfig}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Configurar Tarifas $/hr</span>
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {selectedCleaners.map((cl) => {
                  const cleanerHrRate = ratesPorCleaner[cl] ?? resolveCleanerHourlyRate(cl, unidad, activeRatesConfig, 20);
                  return (
                    <div key={cl} className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{cl}</span>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                          ${cleanerHrRate}/hr × {totalDecimalHours}h
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Hourly Rate input */}
                        <div className="flex items-center gap-1" title="Pago por hora para este servicio">
                          <span className="text-[10px] text-slate-400 font-bold">$/h:</span>
                          <input
                            type="number"
                            step="0.25"
                            value={cleanerHrRate}
                            onChange={(e) => handleCustomCleanerRate(cl, e.target.value)}
                            className="w-16 px-1.5 py-1 text-xs border border-indigo-200 bg-indigo-50/40 text-indigo-800 rounded-lg text-right font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        {/* Total Pay input */}
                        <div className="flex items-center gap-1" title="Pago total al cleaner por este servicio">
                          <span className="text-slate-400 font-semibold">Total $</span>
                          <input
                            type="number"
                            step="0.25"
                            value={pagosPorCleaner[cl] ?? ''}
                            onChange={(e) => handleCustomCleanerPay(cl, e.target.value)}
                            className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg text-right font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-[#0B1D4A]"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold">CAD</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financial Amounts (Client Charge, Cleaner Total, Tips) */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {showFinancials && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Cobro al Cliente (CAD)</label>
                  {memoryInfo?.cobro > 0 && String(cobro) === String(memoryInfo.cobro) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-700" />
                      En automático
                    </span>
                  )}
                  {memoryInfo?.cobro > 0 && String(cobro) !== String(memoryInfo.cobro) && cobro !== '' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-100/90 px-2 py-0.5 rounded-full border border-sky-300">
                      💾 Actualizará memoria
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">$</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={cobro}
                    onChange={(e) => setCobro(e.target.value)}
                    className="w-full pl-6 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] tabular-nums font-bold"
                  />
                </div>
              </div>
            )}

            {canEditPay && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pago Total Cleaner (CAD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">$</span>
                  <input
                    type="number"
                    step="0.25"
                    placeholder="0"
                    value={pagoCleaner}
                    onChange={(e) => setPagoCleaner(e.target.value)}
                    className="w-full pl-6 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] tabular-nums font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {showFinancials && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pago Team (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">$</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={pagoCleaningTeam}
                    onChange={(e) => setPagoCleaningTeam(e.target.value)}
                    className="w-full pl-6 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] tabular-nums"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Propina / Tip Cleaner</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">$</span>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="w-full pl-6 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] tabular-nums text-amber-700 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Capturista info */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Capturista / Responsable</label>
            <input
              type="text"
              value={capturista}
              onChange={(e) => setCapturista(e.target.value)}
              placeholder="Nombre del capturista o supervisor"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-200">
            <div>
              {isRealEdit && showFinancials && onDeleteService && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDeleteService(serviceToEdit.id);
                  }}
                  className="px-3.5 py-2 font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Servicio</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 font-bold text-[#0B1D4A] bg-[#FFB566] hover:bg-[#E89A45] rounded-xl text-xs shadow-xs transition-all active:scale-98 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0B1D4A]" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{isRealEdit ? 'Guardar Cambios' : 'Registrar Servicio'}</span>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* New Client Sub-dialog */}
        {showNewClientModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between">
                <div>
                  <span className="font-serif text-lg font-bold text-[#FAF7F1] block">
                    Registrar Nuevo Cliente
                  </span>
                  <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
                    Datos para capturar servicio y nómina
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick shortcuts for requested clients */}
              {(!availableUnits.includes('Mohammed') || !availableUnits.includes('Phillys')) && (
                <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-950">
                    Sugerencia rápida:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!availableUnits.includes('Mohammed') && (
                      <button
                        type="button"
                        onClick={() => handleQuickAddPredefined('Mohammed')}
                        className="text-[11px] font-bold bg-white text-[#0B1D4A] border border-amber-300 hover:bg-amber-100 px-2.5 py-1 rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        + Mohammed
                      </button>
                    )}
                    {!availableUnits.includes('Phillys') && (
                      <button
                        type="button"
                        onClick={() => handleQuickAddPredefined('Phillys')}
                        className="text-[11px] font-bold bg-white text-[#0B1D4A] border border-amber-300 hover:bg-amber-100 px-2.5 py-1 rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        + Phillys
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateNewClient} className="p-6 space-y-4">
                {newClientError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{newClientError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Cliente o Propiedad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej: Mohammed, Phillys, Residencia Bloor..."
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Este nombre se guardará y seleccionará para capturar este servicio.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Servicio Habitual
                    </label>
                    <select
                      value={newClientType}
                      onChange={(e) => setNewClientType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                    >
                      <option value="Limpieza">Limpieza Residencial</option>
                      <option value="Airbnb">Airbnb / Renta Corta</option>
                      <option value="Extra Task">Extra Task / Profunda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tarifa Estimada de Cobro ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej: 140.00"
                      value={newClientRate}
                      onChange={(e) => setNewClientRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección o Código de Acceso (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 150 King St W, Lockbox #4192..."
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instrucciones o Notas Especiales (Opcional)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Detalles sobre mascotas, productos preferidos o especificaciones..."
                    value={newClientNotes}
                    onChange={(e) => setNewClientNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingClient}
                    className="px-5 py-2 font-bold text-[#0B1D4A] bg-[#FFB566] hover:bg-[#E89A45] rounded-xl text-xs shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {isAddingClient ? 'Guardando...' : '+ Guardar y Seleccionar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
