import React, { useState } from 'react';
import { Search, Download, Plus, Edit2, Trash2, User, Clock, DollarSign, Sparkles, Ban, RotateCcw, CheckCircle2, Building2 } from 'lucide-react';
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

  const showFinancials = hasFullAccess(currentUser);
  const canEdit = canManagePagos(currentUser);
  const isCleaner = currentUser?.role === 'cleaner';
  const cleanerName = currentUser?.displayName || currentUser?.username;

  // Extract distinct cleaners for filtering
  const allCleanersSet = new Set();
  services.forEach((s) => {
    (s.cleaners || []).forEach((c) => allCleanersSet.add(c));
    if (s.cleaner) allCleanersSet.add(s.cleaner);
  });
  const cleanersList = Array.from(allCleanersSet).sort();

  // Filter logic
  const filteredServices = services.filter((s) => {
    // If logged in as cleaner, only show services where they participated
    if (isCleaner) {
      const isMine = (s.cleaners || []).some(
        (c) => c.toLowerCase() === cleanerName.toLowerCase()
      ) || (s.cleaner || '').toLowerCase() === cleanerName.toLowerCase();
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

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const unitMatch = (s.unidad || '').toLowerCase().includes(term);
      const clMatch = (s.cleaners || []).some((c) => c.toLowerCase().includes(term));
      const captMatch = (s.capturista || '').toLowerCase().includes(term);
      const fechaMatch = (s.fecha || '').toLowerCase().includes(term);
      if (!unitMatch && !clMatch && !captMatch && !fechaMatch) return false;
    }
    return true;
  });

  const handleExport = () => {
    exportServicesToCSV(filteredServices, 'servicios_whiteglove.csv');
  };

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar unidad, cleaner, fecha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
            />
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
        <div className="flex items-center gap-2">
          {showFinancials && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={onOpenNewService}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B1D4A] hover:bg-[#1E3670] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#FFB566] stroke-[3]" />
              <span>Nuevo Servicio</span>
            </button>
          )}
        </div>
      </div>

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
                <th className="px-4 py-3 text-right">Tip</th>
                <th className="px-4 py-3">Capturista</th>
                {canEdit && <th className="px-4 py-3 text-center min-w-[210px]">Acciones de Administrador</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((svc) => {
                const cleaners = svc.cleaners?.length ? svc.cleaners : (svc.cleaner ? [svc.cleaner] : []);
                const cleanerPay = svc.pagosPorCleaner
                  ? Object.values(svc.pagosPorCleaner).reduce((a, b) => a + (Number(b) || 0), 0)
                  : Number(svc.pagoCleaner) || 0;
                
                const isCancelled = svc.status === 'cancelado';
                const formattedDuration = formatHoursAndMinutes(svc.horas);

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
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={isCancelled ? 'line-through text-slate-400' : ''}>{svc.unidad}</span>
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
                        {svc.cobro != null ? `$${svc.cobro}` : '—'}
                      </td>
                    )}

                    {/* Pago Cleaner */}
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {cleanerPay > 0 ? `$${cleanerPay.toFixed(2)}` : '—'}
                    </td>

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

                          {/* 3. ELIMINAR BUTTON */}
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
                  <td colSpan={showFinancials ? 11 : 10} className="px-4 py-12 text-center text-slate-400">
                    No se encontraron servicios que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
