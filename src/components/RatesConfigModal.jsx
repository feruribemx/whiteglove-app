import React, { useState, useMemo } from 'react';
import {
  X, DollarSign, Users, Building2, Plus, Trash2, CheckCircle2,
  Search, Sparkles, ArrowRight, RotateCcw, ShieldCheck, Sliders
} from 'lucide-react';
import {
  DEFAULT_RATES_CONFIG,
  normalizeCleanerName,
  resolveCleanerHourlyRate,
  resolveClientHourlyRate
} from '../lib/ratesConfig';

const RatesConfigModal = ({
  isOpen,
  onClose,
  ratesConfig,
  onSaveRatesConfig,
  availableUnits = [],
  knownCleaners = []
}) => {
  const [activeTab, setActiveTab] = useState('cleaners'); // 'cleaners' | 'clients'
  const [cleanerBaseRates, setCleanerBaseRates] = useState(() => ({
    ...DEFAULT_RATES_CONFIG.cleanerBaseRates,
    ...(ratesConfig?.cleanerBaseRates || {})
  }));
  const [cleanerClientRules, setCleanerClientRules] = useState(() => (
    Array.isArray(ratesConfig?.cleanerClientRules)
      ? ratesConfig.cleanerClientRules
      : DEFAULT_RATES_CONFIG.cleanerClientRules
  ));
  const [clientHourlyRates, setClientHourlyRates] = useState(() => ({
    ...DEFAULT_RATES_CONFIG.clientHourlyRates,
    ...(ratesConfig?.clientHourlyRates || {})
  }));

  // New rule state (Cleaner + Client override)
  const [newRuleCleaner, setNewRuleCleaner] = useState('Mafer');
  const [newRuleClient, setNewRuleClient] = useState('');
  const [newRuleRate, setNewRuleRate] = useState('');

  // New cleaner state
  const [newCleanerName, setNewCleanerName] = useState('');
  const [newCleanerBaseRate, setNewCleanerBaseRate] = useState('20');

  // New client state
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('40');
  const [clientSearch, setClientSearch] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const allCleanerNames = useMemo(() => {
    const set = new Set([
      'Mafer', 'Maria', 'Jazz', 'Amalia', 'Yuliana', 'Michelle', 'Fernando',
      ...knownCleaners.map(c => normalizeCleanerName(c)),
      ...Object.keys(cleanerBaseRates)
    ]);
    return Array.from(set).filter(Boolean);
  }, [knownCleaners, cleanerBaseRates]);

  const allClientNames = useMemo(() => {
    const map = new Map();
    const addUnit = (u) => {
      const trimmed = String(u || '').trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (!map.has(lower)) map.set(lower, trimmed);
    };
    availableUnits.forEach(addUnit);
    Object.keys(clientHourlyRates).forEach(addUnit);
    cleanerClientRules.forEach(r => addUnit(r.client));
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [availableUnits, clientHourlyRates, cleanerClientRules]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return allClientNames;
    return allClientNames.filter(c => c.toLowerCase().includes(q));
  }, [allClientNames, clientSearch]);

  const handleBaseRateChange = (cleaner, val) => {
    setCleanerBaseRates(prev => ({
      ...prev,
      [cleaner]: val === '' ? '' : Number(val)
    }));
  };

  const handleAddCleaner = (e) => {
    e.preventDefault();
    const clean = normalizeCleanerName(newCleanerName);
    const rate = parseFloat(newCleanerBaseRate);
    if (!clean || isNaN(rate) || rate < 0) return;
    setCleanerBaseRates(prev => ({ ...prev, [clean]: rate }));
    setNewCleanerName('');
    setNewCleanerBaseRate('20');
  };

  const handleAddRule = (e) => {
    e.preventDefault();
    const cleaner = normalizeCleanerName(newRuleCleaner);
    const client = newRuleClient.trim();
    const rate = parseFloat(newRuleRate);
    if (!cleaner || !client || isNaN(rate) || rate <= 0) return;

    const id = `${cleaner.toLowerCase()}-${client.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    setCleanerClientRules(prev => {
      const filtered = prev.filter(
        r => !(normalizeCleanerName(r.cleaner).toLowerCase() === cleaner.toLowerCase() &&
               String(r.client).trim().toLowerCase() === client.toLowerCase())
      );
      return [...filtered, { id, cleaner, client, rate }];
    });
    setNewRuleClient('');
    setNewRuleRate('');
  };

  const handleUpdateRuleRate = (ruleId, val) => {
    setCleanerClientRules(prev =>
      prev.map(r => r.id === ruleId ? { ...r, rate: val === '' ? '' : Number(val) } : r)
    );
  };

  const handleDeleteRule = (ruleId) => {
    setCleanerClientRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleClientRateChange = (clientName, val) => {
    setClientHourlyRates(prev => ({
      ...prev,
      [clientName]: val === '' ? '' : Number(val)
    }));
  };

  const handleRemoveClientRate = (clientName) => {
    setClientHourlyRates(prev => {
      const next = { ...prev };
      delete next[clientName];
      return next;
    });
  };

  const handleAddClientRate = (e) => {
    e.preventDefault();
    const name = newClientName.trim();
    const rate = parseFloat(newClientRate);
    if (!name || isNaN(rate) || rate <= 0) return;
    setClientHourlyRates(prev => ({ ...prev, [name]: rate }));
    setNewClientName('');
    setNewClientRate('40');
  };

  const handleSaveAll = () => {
    const sanitizedBase = {};
    Object.entries(cleanerBaseRates).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (k && !isNaN(num) && num > 0) sanitizedBase[k] = num;
    });

    const sanitizedRules = cleanerClientRules
      .map(r => ({
        ...r,
        cleaner: normalizeCleanerName(r.cleaner),
        client: String(r.client || '').trim(),
        rate: parseFloat(r.rate)
      }))
      .filter(r => r.cleaner && r.client && !isNaN(r.rate) && r.rate > 0);

    const sanitizedClients = {};
    Object.entries(clientHourlyRates).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (k && !isNaN(num) && num > 0) sanitizedClients[k] = num;
    });

    const updated = {
      cleanerBaseRates: sanitizedBase,
      cleanerClientRules: sanitizedRules,
      clientHourlyRates: sanitizedClients,
      updatedAt: new Date().toISOString()
    };

    onSaveRatesConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    setCleanerBaseRates({ ...DEFAULT_RATES_CONFIG.cleanerBaseRates });
    setCleanerClientRules([...DEFAULT_RATES_CONFIG.cleanerClientRules]);
    setClientHourlyRates({ ...DEFAULT_RATES_CONFIG.clientHourlyRates });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex justify-center items-center z-[70] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Control de Tarifas y Pagos por Hora
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Solo Admin Master
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configura cuánto gana cada cleaner por hora (general o por cliente específico) y cuánto cobramos por hora a cada cliente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-slate-50 px-6 pt-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('cleaners')}
              className={`px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'cleaners'
                  ? 'bg-white text-indigo-600 border-indigo-600 shadow-sm'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              1. Pago por Hora a Cleaners ({cleanerClientRules.length} reglas)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'clients'
                  ? 'bg-white text-emerald-600 border-emerald-600 shadow-sm'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              2. Cobro por Hora a Clientes ($/hr)
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 pb-2"
            title="Restaurar valores iniciales"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar base
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'cleaners' ? (
            <>
              {/* Section A: Specific Cleaner + Client Rules */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Tarifas Especiales por Cleaner + Cliente
                    </h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Ejemplo: <strong>Mafer</strong> con <strong>Georgia Ancaster</strong> gana <strong>$23.50/hr</strong>, pero con <strong>Max - Hamilton</strong> gana <strong>$20.00/hr</strong>. Al seleccionar el servicio se aplica automáticamente.
                    </p>
                  </div>
                </div>

                {/* Add new rule form */}
                <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm mb-4">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cleaner</label>
                    <select
                      value={newRuleCleaner}
                      onChange={e => setNewRuleCleaner(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      {allCleanerNames.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cliente / Propiedad</label>
                    <input
                      type="text"
                      list="rates-client-options"
                      value={newRuleClient}
                      onChange={e => setNewRuleClient(e.target.value)}
                      placeholder="Ej. Georgia Ancaster, Max - Hamilton..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                    <datalist id="rates-client-options">
                      {allClientNames.map(u => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pago ($/hr)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.25"
                        min="1"
                        value={newRuleRate}
                        onChange={e => setNewRuleRate(e.target.value)}
                        placeholder="23.50"
                        className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-indigo-700 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                </form>

                {/* Active Rules List */}
                <div className="space-y-2">
                  {cleanerClientRules.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-3">
                      No hay reglas específicas configuradas. Se usará la tarifa base de cada cleaner.
                    </p>
                  ) : (
                    cleanerClientRules.map(rule => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-black text-xs">
                            {rule.cleaner}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold text-xs text-slate-800 truncate">
                            {rule.client}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-indigo-500">$</span>
                            <input
                              type="number"
                              step="0.25"
                              min="1"
                              value={rule.rate}
                              onChange={e => handleUpdateRuleRate(rule.id, e.target.value)}
                              className="w-full pl-6 pr-8 py-1 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs font-black text-indigo-700 outline-none focus:border-indigo-500"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-indigo-400">/hr</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar regla"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section B: Base Hourly Rate per Cleaner */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Tarifa Base por Hora de cada Cleaner (General)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Se aplica automáticamente cuando el cleaner trabaja con cualquier cliente que no tenga una regla especial arriba.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {allCleanerNames.map(cleaner => (
                    <div
                      key={cleaner}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div>
                        <p className="font-black text-sm text-slate-800">{cleaner}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Tarifa general</p>
                      </div>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.25"
                          min="1"
                          value={cleanerBaseRates[cleaner] ?? 20}
                          onChange={e => handleBaseRateChange(cleaner, e.target.value)}
                          className="w-full pl-6 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-800 outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">/hr</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new cleaner base rate */}
                <form onSubmit={handleAddCleaner} className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                  <input
                    type="text"
                    value={newCleanerName}
                    onChange={e => setNewCleanerName(e.target.value)}
                    placeholder="Agregar otro cleaner..."
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.25"
                      value={newCleanerBaseRate}
                      onChange={e => setNewCleanerBaseRate(e.target.value)}
                      className="w-full pl-6 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">/hr</span>
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-black flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir Cleaner
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* TAB 2: Client Hourly Charge Rates */
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Tarifa de Cobro por Hora a Clientes ($/hr CAD)
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Configura cuánto cobramos por hora a cada cliente (ej. <strong>Rohan = $40/hr</strong>, <strong>Mafer = $29/hr</strong>). Al registrar o editar un servicio y cambiar las horas, el cobro total se recalculará automáticamente.
                  </p>
                </div>

                {/* Add new client rate */}
                <form onSubmit={handleAddClientRate} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm mb-4">
                  <div className="sm:col-span-7">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nombre del Cliente / Propiedad</label>
                    <input
                      type="text"
                      list="rates-client-options-2"
                      value={newClientName}
                      onChange={e => setNewClientName(e.target.value)}
                      placeholder="Ej. Rohan, Mafer, Georgia Ancaster, Max - Hamilton..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                    />
                    <datalist id="rates-client-options-2">
                      {allClientNames.map(u => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cobro por Hora ($/hr)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={newClientRate}
                        onChange={e => setNewClientRate(e.target.value)}
                        placeholder="40"
                        className="w-full pl-6 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-emerald-700 outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">/hr</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Guardar
                    </button>
                  </div>
                </form>

                {/* Search filter */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente o propiedad..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Client list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {filteredClients.map(clientName => {
                    const directVal = clientHourlyRates[clientName];
                    const resolved = resolveClientHourlyRate(clientName, { clientHourlyRates });
                    const displayVal = directVal !== undefined ? directVal : (resolved ?? '');

                    return (
                      <div
                        key={clientName}
                        className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                          displayVal !== '' && Number(displayVal) > 0
                            ? 'bg-white border-emerald-200 shadow-sm'
                            : 'bg-white/60 border-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-black text-xs text-slate-800 truncate" title={clientName}>
                            {clientName}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {displayVal !== '' && Number(displayVal) > 0
                              ? `Cobro activo: $${Number(displayVal).toFixed(2)}/hr`
                              : 'Sin tarifa por hora fija'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-emerald-600">$</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={displayVal}
                              placeholder="--"
                              onChange={e => handleClientRateChange(clientName, e.target.value)}
                              className="w-full pl-6 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-emerald-700 outline-none focus:border-emerald-500"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">/hr</span>
                          </div>
                          {directVal !== undefined && (
                            <button
                              type="button"
                              onClick={() => handleRemoveClientRate(clientName)}
                              className="p-1 text-slate-300 hover:text-rose-500 rounded"
                              title="Quitar tarifa fija"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {savedSuccess ? (
              <span className="text-emerald-600 font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> ¡Tarifas actualizadas y sincronizadas en todo el sistema!
              </span>
            ) : (
              <span>Los cambios se aplican de inmediato al seleccionar cliente, cleaner u horas.</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2.5 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Guardar Tarifas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatesConfigModal;
