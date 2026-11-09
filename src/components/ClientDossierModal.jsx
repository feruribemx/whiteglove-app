import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  MapPin,
  KeyRound,
  Wifi,
  Car,
  Package,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Search,
  Edit3,
  Save,
  ExternalLink,
  Clock,
  Users,
  ShieldAlert,
  Share2,
  Plus,
} from 'lucide-react';
import { hasFullAccess, canManagePagos } from '../lib/auth';
import { getClientDossier, resolveClientMemory, saveClientMemory } from '../lib/clientMemory';

export default function ClientDossierModal({
  isOpen,
  onClose,
  initialUnit = '',
  availableUnits = [],
  services = [],
  schedule = [],
  clientMemory = {},
  onUpdateClientMemory,
  onAddClient,
  currentUser,
}) {
  const showFinancials = hasFullAccess(currentUser);
  const canEditDossier = canManagePagos(currentUser) || currentUser?.role === 'admin';
  const isCleaner = Boolean(currentUser && currentUser.role === 'cleaner');
  const cleanerName = (currentUser?.displayName || currentUser?.username || 'Cleaner').trim();

  // Filter units visible to current user (Cleaners see all units where they have shifts/services, or all operational units)
  const unitsList = useMemo(() => {
    const base = Array.isArray(availableUnits) && availableUnits.length > 0 ? availableUnits : [];
    const fromServices = (services || []).map((s) => s.unidad).filter(Boolean);
    const fromSchedule = (schedule || []).map((s) => s.unidad).filter(Boolean);
    const merged = Array.from(new Set([...base, ...fromServices, ...fromSchedule])).sort();
    return merged;
  }, [availableUnits, services, schedule]);

  const [selectedUnit, setSelectedUnit] = useState(initialUnit || unitsList[0] || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Client Quick Creation (for Admins)
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  // Editable Dossier Fields
  const [address, setAddress] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [wifiInfo, setWifiInfo] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');
  const [suppliesLocation, setSuppliesLocation] = useState('');
  const [petAndAllergyNotes, setPetAndAllergyNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    if (initialUnit && initialUnit.trim()) {
      setSelectedUnit(initialUnit.trim());
    } else if (!selectedUnit && unitsList.length > 0) {
      setSelectedUnit(unitsList[0]);
    }
  }, [initialUnit, isOpen]);

  // Load dossier whenever selectedUnit or clientMemory changes
  const currentDossier = useMemo(() => {
    return getClientDossier(selectedUnit, clientMemory);
  }, [selectedUnit, clientMemory]);

  const currentOperationalMemory = useMemo(() => {
    return resolveClientMemory(selectedUnit, services, clientMemory, schedule);
  }, [selectedUnit, services, clientMemory, schedule]);

  useEffect(() => {
    if (currentDossier) {
      setAddress(currentDossier.address || '');
      setAccessCode(currentDossier.accessCode || '');
      setWifiInfo(currentDossier.wifiInfo || '');
      setParkingInfo(currentDossier.parkingInfo || '');
      setSuppliesLocation(currentDossier.suppliesLocation || '');
      setPetAndAllergyNotes(currentDossier.petAndAllergyNotes || '');
      setSpecialInstructions(currentDossier.specialInstructions || '');
    } else {
      setAddress('');
      setAccessCode('');
      setWifiInfo('');
      setParkingInfo('');
      setSuppliesLocation('');
      setPetAndAllergyNotes('');
      setSpecialInstructions('');
    }
    setIsEditing(false);
    setSaveSuccess(false);
  }, [selectedUnit, currentDossier]);

  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return unitsList;
    const q = searchTerm.toLowerCase().trim();
    return unitsList.filter((u) => {
      const d = getClientDossier(u, clientMemory);
      return (
        u.toLowerCase().includes(q) ||
        (d?.address || '').toLowerCase().includes(q) ||
        (d?.specialInstructions || '').toLowerCase().includes(q)
      );
    });
  }, [unitsList, searchTerm, clientMemory]);

  const handleCopyText = (text, label) => {
    if (!text) return;
    try {
      navigator.clipboard?.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {}
  };

  const handleSaveDossier = (e) => {
    e?.preventDefault?.();
    if (!selectedUnit) return;

    const patch = {
      address: address.trim(),
      accessCode: accessCode.trim(),
      wifiInfo: wifiInfo.trim(),
      parkingInfo: parkingInfo.trim(),
      suppliesLocation: suppliesLocation.trim(),
      petAndAllergyNotes: petAndAllergyNotes.trim(),
      specialInstructions: specialInstructions.trim(),
      notes: specialInstructions.trim(),
      updatedBy: currentUser?.displayName || currentUser?.username || 'WhiteGlove',
    };

    const saved = saveClientMemory(selectedUnit, patch);
    if (onUpdateClientMemory && saved) {
      onUpdateClientMemory(selectedUnit, saved);
    }
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCreateUnit = async (e) => {
    e?.preventDefault?.();
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    if (onAddClient) {
      await onAddClient(trimmed);
    }
    setSelectedUnit(trimmed);
    setNewClientName('');
    setShowNewClientInput(false);
    setIsEditing(true);
  };

  const buildWhatsAppDossierText = () => {
    let txt = `📋 *FICHA TÉCNICA DE PROPIEDAD — WHITEGLOVE*\n`;
    txt += `🏠 *Cliente / Unidad:* ${selectedUnit}\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (address) txt += `📍 *Dirección:* ${address}\n`;
    if (accessCode) txt += `🔑 *Acceso / Lockbox:* ${accessCode}\n`;
    if (parkingInfo) txt += `🚗 *Estacionamiento:* ${parkingInfo}\n`;
    if (wifiInfo) txt += `📶 *Wi-Fi:* ${wifiInfo}\n`;
    if (suppliesLocation) txt += `🧴 *Insumos / Blancos:* ${suppliesLocation}\n`;
    if (petAndAllergyNotes) txt += `🐾 *Mascotas / Cuidados:* ${petAndAllergyNotes}\n`;
    if (specialInstructions) txt += `📝 *Instrucciones Especiales:* ${specialInstructions}\n`;
    if (currentOperationalMemory?.horas) {
      txt += `⏱️ *Tiempo estimado habitual:* ${currentOperationalMemory.horas} hrs (${currentOperationalMemory.tipo || 'Limpieza'})\n`;
    }
    txt += `━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `_Uso exclusivo interno para equipo WhiteGlove._`;
    return txt;
  };

  const handleCopyFullDossier = () => {
    const txt = buildWhatsAppDossierText();
    handleCopyText(txt, 'full_dossier');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB566]/20 border border-[#FFB566]/40 text-[#FFB566] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#FAF7F1]">
                  Ficha Técnica por Cliente / Propiedad
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFB566] text-[#0B1D4A]">
                  Solo Admin & Cleaners
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Códigos de acceso, dirección exacta, estacionamiento, insumos y protocolo operativo de cada propiedad
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main 2-Column Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Sidebar: Client / Property Selector */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/80 flex flex-col shrink-0 max-h-56 md:max-h-none">
            <div className="p-3.5 border-b border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Propiedades ({filteredUnits.length})
                </span>
                {canEditDossier && (
                  <button
                    type="button"
                    onClick={() => setShowNewClientInput(!showNewClientInput)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0B1D4A] text-[#FFB566] text-[10px] font-bold hover:bg-[#1E3670] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nuevo Cliente</span>
                  </button>
                )}
              </div>

              {showNewClientInput && canEditDossier && (
                <form onSubmit={handleCreateUnit} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nombre del cliente..."
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                  >
                    Crear
                  </button>
                </form>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cliente o dirección..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredUnits.map((unit) => {
                const isSelected = unit === selectedUnit;
                const d = getClientDossier(unit, clientMemory);
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setSelectedUnit(unit)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B1D4A] text-white font-bold shadow-xs'
                        : 'hover:bg-white text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#FFB566]' : 'text-slate-400'}`} />
                        <span className="truncate">{unit}</span>
                      </div>
                      {d?.address && (
                        <span className={`text-[10px] block truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400 font-normal'}`}>
                          {d.address}
                        </span>
                      )}
                    </div>
                    {d?.hasContent && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? 'bg-[#FFB566]' : 'bg-emerald-500'
                        }`}
                        title="Ficha técnica configurada"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Content: Dossier Details & Editor */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#FBF9F5]">
            
            {/* Selected Property Header Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#E89A45] bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    Expediente Operativo
                  </span>
                  {currentOperationalMemory?.totalServices > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {currentOperationalMemory.totalServices} servicios registrados
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#0B1D4A] mt-1">
                  {selectedUnit}
                </h3>
                {currentOperationalMemory && (
                  <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      Duración habitual: <strong>{currentOperationalMemory.horas} hrs</strong> ({currentOperationalMemory.tipo})
                    </span>
                    {currentOperationalMemory.cleaners?.length > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        Último equipo: <strong>{currentOperationalMemory.cleaners.join(', ')}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Copy for WhatsApp & Edit */}
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyFullDossier}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {copiedField === 'full_dossier' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      <span>¡Ficha Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Copiar Ficha WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isEditing
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] shadow-xs'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancelar Edición' : 'Editar Ficha Técnica'}</span>
                </button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>¡Ficha Técnica de "{selectedUnit}" actualizada y sincronizada en la nube para Administradores y Cleaners!</span>
              </div>
            )}

            {isEditing ? (
              /* ========================================================= */
              /* EDIT MODE FORM                                            */
              /* ========================================================= */
              <form onSubmit={handleSaveDossier} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="font-serif font-bold text-base text-[#0B1D4A]">
                    Editar Ficha Técnica — {selectedUnit}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Esta información estará disponible en tiempo real para los cleaners asignados y el administrador.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dirección */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#E89A45]" />
                      <span>Dirección Exacta de la Propiedad</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ej: 88 Blue Jays Way, Penthouse 4201, Toronto, ON"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium"
                    />
                  </div>

                  {/* Código de Acceso / Lockbox */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Código de Acceso / Lockbox / Smart Lock</span>
                    </label>
                    <input
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Ej: Lockbox #4820* o pedir llave en Concierge"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                    />
                  </div>

                  {/* Wi-Fi */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-sky-600" />
                      <span>Red Wi-Fi y Contraseña</span>
                    </label>
                    <input
                      type="text"
                      value={wifiInfo}
                      onChange={(e) => setWifiInfo(e.target.value)}
                      placeholder="Ej: Red: Bell_Home | Pass: Toronto2026"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium"
                    />
                  </div>

                  {/* Estacionamiento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Estacionamiento / Acceso de Servicio</span>
                    </label>
                    <input
                      type="text"
                      value={parkingInfo}
                      onChange={(e) => setParkingInfo(e.target.value)}
                      placeholder="Ej: Visitor Parking P1 o Driveway frontal"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium"
                    />
                  </div>

                  {/* Ubicación de Insumos y Blancos */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ubicación de Insumos, Blancos y Basura</span>
                    </label>
                    <input
                      type="text"
                      value={suppliesLocation}
                      onChange={(e) => setSuppliesLocation(e.target.value)}
                      placeholder="Ej: Closet pasillo (código 042), ducto de basura al fondo"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium"
                    />
                  </div>

                  {/* Mascotas / Alergias / Superficies */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>Mascotas, Superficies Delicadas o Alergias</span>
                    </label>
                    <input
                      type="text"
                      value={petAndAllergyNotes}
                      onChange={(e) => setPetAndAllergyNotes(e.target.value)}
                      placeholder="Ej: 1 perro amigable; cubiertas de mármol natural (solo pH neutro)"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium"
                    />
                  </div>

                  {/* Instrucciones Especiales */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#0B1D4A]" />
                      <span>Protocolo Especial / Checklist Prioritario del Cliente</span>
                    </label>
                    <textarea
                      rows={3}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Escribe los puntos críticos a revisar en cada limpieza para este cliente..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-medium resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Ficha Técnica</span>
                  </button>
                </div>
              </form>
            ) : (
              /* ========================================================= */
              /* READ / OPERATIONAL VIEW MODE                              */
              /* ========================================================= */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Dirección y Mapa */}
                <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-[#E89A45] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Dirección Exacta de la Propiedad
                      </span>
                      <span className="text-sm font-bold text-slate-900 block mt-0.5">
                        {address || 'Sin dirección registrada todavía'}
                      </span>
                    </div>
                  </div>

                  {address && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyText(address, 'address')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {copiedField === 'address' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'address' ? 'Copiada' : 'Copiar'}</span>
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] text-[11px] font-bold transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir en Maps</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* 2. Código de Acceso / Lockbox */}
                <div className="bg-white p-4 rounded-2xl border border-amber-200/90 shadow-2xs flex flex-col justify-between gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                        Acceso / Lockbox / Smart Lock
                      </span>
                    </div>
                    {accessCode && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(accessCode, 'access')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200 cursor-pointer"
                      >
                        {copiedField === 'access' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'access' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    )}
                  </div>
                  <p className="font-mono text-xs sm:text-sm font-bold text-[#0B1D4A] bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
                    {accessCode || 'No especificado — consultar con supervisor'}
                  </p>
                </div>

                {/* 3. Wi-Fi */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                        <Wifi className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Red Wi-Fi & Contraseña
                      </span>
                    </div>
                    {wifiInfo && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(wifiInfo, 'wifi')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                      >
                        {copiedField === 'wifi' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'wifi' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    {wifiInfo || 'No registrado'}
                  </p>
                </div>

                {/* 4. Estacionamiento */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Estacionamiento / Acceso
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 leading-relaxed">
                    {parkingInfo || 'Sin instrucciones especiales de estacionamiento.'}
                  </p>
                </div>

                {/* 5. Ubicación de Insumos y Blancos */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Insumos, Blancos y Basura
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 leading-relaxed">
                    {suppliesLocation || 'Insumos estándar llevados por el equipo WhiteGlove.'}
                  </p>
                </div>

                {/* 6. Mascotas, Superficies Delicadas o Alergias */}
                <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-rose-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                      Mascotas, Superficies Delicadas y Cuidados Especiales
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    {petAndAllergyNotes || 'Aplicar protocolo estándar WhiteGlove (productos seguros para mármol, cuarzo y madera).'}
                  </p>
                </div>

                {/* 7. Instrucciones Especiales / Protocolo */}
                <div className="sm:col-span-2 bg-[#0B1D4A] text-white p-5 rounded-2xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFB566] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Protocolo e Instrucciones Prioritarias del Cliente</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] font-bold text-[#FFB566] hover:underline cursor-pointer"
                    >
                      ✏️ Actualizar notas
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {specialInstructions || 'Sin notas adicionales.Haz clic en "Editar Ficha Técnica" para agregar códigos, foto de referencia o instrucciones específicas de esta propiedad.'}
                  </p>
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>
            🔒 Información confidencial de uso exclusivo para Administradores y Cleaners de WhiteGlove
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
