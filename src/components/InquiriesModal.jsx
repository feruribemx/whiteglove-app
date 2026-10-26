import React, { useState } from 'react';
import {
  X, Mail, Phone, MessageCircle, Calendar, MapPin, Home,
  CheckCircle2, Clock, Filter, Search, ChevronRight, User,
  FileText, ArrowUpRight, Sparkles, AlertCircle
} from 'lucide-react';
import { updateInquiryStatusInFirestore } from '../lib/firebase';

export default function InquiriesModal({
  isOpen,
  onClose,
  inquiries = [],
  onUpdateStatus,
  currentUser,
}) {
  const [filterStatus, setFilterStatus] = useState('all'); // all | nueva | contactada | agendada | descartada
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  if (!isOpen) return null;

  // Filter and sort inquiries (most recent first)
  const filtered = inquiries
    .filter((inq) => {
      if (filterStatus !== 'all') {
        const currentStatus = (inq.status || 'nueva').toLowerCase();
        if (currentStatus !== filterStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (inq.name || '').toLowerCase().includes(q);
        const matchPhone = (inq.phone || '').toLowerCase().includes(q);
        const matchEmail = (inq.email || '').toLowerCase().includes(q);
        const matchCity = (inq.city || '').toLowerCase().includes(q);
        const matchFolio = (inq.folio || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchEmail || matchCity || matchFolio;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      return timeB - timeA;
    });

  const countByStatus = {
    all: inquiries.length,
    nueva: inquiries.filter((i) => (i.status || 'nueva').toLowerCase() === 'nueva').length,
    contactada: inquiries.filter((i) => (i.status || '').toLowerCase() === 'contactada').length,
    agendada: inquiries.filter((i) => (i.status || '').toLowerCase() === 'agendada').length,
  };

  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      setUpdatingId(inquiryId);
      await updateInquiryStatusInFirestore(inquiryId, newStatus);
      if (onUpdateStatus) {
        onUpdateStatus(inquiryId, newStatus);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getCleanPhoneForWhatsApp = (rawPhone) => {
    if (!rawPhone) return '';
    return rawPhone.replace(/[^\d]/g, '');
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Reciente';
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(timestamp);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#FAF7F1] w-full max-w-5xl rounded-3xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Header Bar */}
        <div className="bg-[#0B1D4A] text-white px-5 sm:px-8 py-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFB566]/20 border border-[#FFB566]/40 flex items-center justify-center text-[#FFB566]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#FAF7F1]">
                  Prospectos y Solicitudes Web
                </h3>
                {countByStatus.nueva > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFB566] text-[#0B1D4A] animate-pulse">
                    {countByStatus.nueva} nueva{countByStatus.nueva > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Cotizaciones enviadas en línea desde la página web (Propuesta #1 - Lead Capture)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border-b border-slate-200 p-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'Todos', count: countByStatus.all },
              { id: 'nueva', label: 'Nuevas', count: countByStatus.nueva, color: 'bg-amber-500' },
              { id: 'contactada', label: 'Contactadas', count: countByStatus.contactada, color: 'bg-blue-500' },
              { id: 'agendada', label: 'Agendadas / Cerradas', count: countByStatus.agendada, color: 'bg-emerald-600' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-[#0B1D4A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterStatus === tab.id
                      ? 'bg-white/20 text-[#FFB566]'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, folio, ciudad o teléfono..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20"
            />
          </div>
        </div>

        {/* Content Area / List of Inquiries */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-serif font-bold text-base text-[#0B1D4A]">
                No hay solicitudes de cotización en esta categoría
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Cuando los prospectos completen el formulario de cotización en la página web, aparecerán aquí con su folio y datos de contacto.
              </p>
            </div>
          ) : (
            filtered.map((inq) => {
              const status = (inq.status || 'nueva').toLowerCase();
              const cleanPhone = getCleanPhoneForWhatsApp(inq.phone);
              const isUpdating = updatingId === inq.id;

              return (
                <div
                  key={inq.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 space-y-4"
                >
                  {/* Top row: Client name, Folio, Status Badge & Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0B1D4A] text-[#FFB566] font-bold text-sm flex items-center justify-center shrink-0">
                        {(inq.name || 'W')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-base text-[#0B1D4A]">
                            {inq.name || 'Prospecto sin nombre'}
                          </h4>
                          {inq.folio && (
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-[#0B1D4A] border border-slate-200">
                              {inq.folio}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateTime(inq.createdAt || inq.created_at)}
                          </span>
                          {inq.city && (
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#E89A45]" />
                              {inq.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status badge & Selector */}
                    <div className="flex items-center gap-2">
                      <select
                        value={status}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(inq.id, e.target.value)}
                        className={`text-xs font-bold rounded-xl px-3 py-1.5 border cursor-pointer focus:outline-none transition-colors ${
                          status === 'nueva'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : status === 'contactada'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : status === 'agendada'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="nueva">🟡 Nueva Solicitud</option>
                        <option value="contactada">🔵 Contactada</option>
                        <option value="agendada">🟢 Agendada / Cerrada</option>
                        <option value="descartada">⚪ Descartada</option>
                      </select>
                    </div>
                  </div>

                  {/* Property & Service Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FBF9F5] p-3.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo de Inmueble</span>
                      <span className="font-semibold text-slate-800">{inq.propertyType || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Dimensiones</span>
                      <span className="font-semibold text-slate-800">
                        {inq.bedrooms || '—'} rec. · {inq.bathrooms || '—'} baños
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Alcance Deseado</span>
                      <span className="font-semibold text-[#0B1D4A]">{inq.serviceType || 'Limpieza'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Tentativa</span>
                      <span className="font-semibold text-slate-800">{inq.desiredDate || 'Flexible'}</span>
                    </div>
                  </div>

                  {/* Notes / Special Instructions if any */}
                  {inq.notes && (
                    <div className="text-xs bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 text-slate-700">
                      <span className="font-bold text-amber-900 block text-[11px] mb-0.5">Notas del Cliente:</span>
                      {inq.notes}
                    </div>
                  )}

                  {/* Contact Methods & Direct Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      {inq.email && (
                        <a
                          href={`mailto:${inq.email}?subject=Cotización WhiteGlove ${inq.folio || ''}`}
                          className="flex items-center gap-1.5 hover:text-[#0B1D4A] transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inq.email}</span>
                        </a>
                      )}
                      {inq.phone && (
                        <a
                          href={`tel:${inq.phone}`}
                          className="flex items-center gap-1.5 hover:text-[#0B1D4A] transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inq.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Quick WhatsApp Action Button */}
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `¡Hola ${inq.name || ''}! Te contactamos de WhiteGlove Professional Services respecto a tu solicitud de cotización ${inq.folio ? `(${inq.folio})` : ''} para tu ${inq.propertyType || 'inmueble'}. ¿Tienes unos minutos para confirmar los detalles?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Abrir Chat WhatsApp</span>
                      </a>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-5 sm:px-8 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total en registro: {inquiries.length} prospectos</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
