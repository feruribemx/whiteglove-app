import React, { useState } from 'react';
import {
  UserPlus, X, User, Lock, Phone, FileText, CheckCircle2,
  Sparkles, Shield, AlertCircle
} from 'lucide-react';

export default function AddCleanerModal({
  isOpen,
  onClose,
  onAddCleaner,
  existingCleaners = [],
}) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Por favor ingresa el nombre del nuevo cleaner.');
      return;
    }

    // Check if name is already registered
    const exists = existingCleaners.some(
      (c) => c.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      setError(`El cleaner "${trimmedName}" ya existe en el equipo.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddCleaner({
        name: trimmedName,
        password: password.trim() || `${trimmedName.toLowerCase().split(/\s+/)[0]}123`,
        phone: phone.trim(),
        notes: notes.trim(),
      });

      // Reset form
      setName('');
      setPassword('');
      setPhone('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Error adding cleaner:', err);
      setError('Ocurrió un error al registrar el cleaner. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0B1D4A] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FFB566] text-[#0B1D4A] rounded-2xl shadow-xs">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold leading-tight">
                Registrar Nuevo Cleaner
              </h3>
              <span className="text-xs text-slate-300 block">
                Agrega un nuevo elemento al equipo y consulta claves del checador
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Cleaner Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre Completo del Cleaner <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Valeria, Roberto Gómez, Camila..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white font-medium"
              />
            </div>
          </div>

          {/* Password for Portal Access */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Contraseña de Acceso al Reloj Checador
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={name.trim() ? `Por defecto: "${name.trim().toLowerCase().split(/\s+/)[0]}123"` : 'Por defecto: nombre123 (ej. valeria123)'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white"
              />
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              El cleaner podrá ingresar con <strong>{name.trim() ? `${name.trim().toLowerCase().split(/\s+/)[0]}123` : 'su nombre + 123'}</strong> o con su nombre en minúsculas.
            </span>
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Teléfono / WhatsApp
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="tel"
                placeholder="Ej. +1 (555) 234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white"
              />
            </div>
          </div>

          {/* Notes / Specialization */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Notas / Disponibilidad / Especialidad
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </div>
            <div className="relative">
              <textarea
                rows="2"
                placeholder="Ej. Disponible fines de semana, especialista en Deep Cleaning o Airbnb..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white"
              />
            </div>
          </div>

          {/* Active Cleaner Credentials Reference Box */}
          {existingCleaners.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-2">
              <span className="font-bold text-[#0B1D4A] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#E89A45]" />
                Claves Activas del Equipo (Para entrar al Reloj Checador):
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {existingCleaners.map((clName) => {
                  const baseKey = String(clName || '').trim().toLowerCase().split(/\s+/)[0];
                  return (
                    <div
                      key={clName}
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                    >
                      <span className="font-bold text-slate-800 truncate">{clName}</span>
                      <code className="font-mono font-bold text-[#0B1D4A] bg-amber-100/70 px-1.5 py-0.5 rounded">
                        {baseKey}123
                      </code>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">
                * También pueden acceder escribiendo su nombre en minúsculas (ej. <strong>jazz</strong>, <strong>karen</strong>, <strong>mafer</strong>).
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-[#0B1D4A] bg-[#FFB566] hover:bg-[#E89A45] rounded-xl shadow-xs transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-[#0B1D4A]" />
              <span>{isSubmitting ? 'Registrando...' : 'Registrar Cleaner'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
