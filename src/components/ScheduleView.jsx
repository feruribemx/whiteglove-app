import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, Building2, Plus, CheckCircle2, AlertCircle, X, Trash2, Check, Sparkles, Ban } from 'lucide-react';

export default function ScheduleView({
  schedule = [],
  availableUnits = [],
  availableCleaners = [],
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onOpenNewService,
  onAddClient,
  currentUser,
}) {
  const [filter, setFilter] = useState('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddClientInSchedule, setShowAddClientInSchedule] = useState(false);
  const [newScheduleClient, setNewScheduleClient] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('09:00');
  const [duracionHoras, setDuracionHoras] = useState(2);
  const [duracionMinutos, setDuracionMinutos] = useState(0);
  const [unidad, setUnidad] = useState(availableUnits[0] || '');
  const [cleaner, setCleaner] = useState(availableCleaners[0] || '');
  const [tipo, setTipo] = useState('Limpieza');
  const [notes, setNotes] = useState('');

  const isCleaner = currentUser?.role === 'cleaner';
  const cleanerName = currentUser?.displayName || currentUser?.username;

  // Helper to extract cleaner from item
  const getCleanerName = (item) => {
    if (item.cleaner) return item.cleaner;
    if (Array.isArray(item.cleaners) && item.cleaners.length) return item.cleaners[0];
    return 'Sin asignar';
  };

  // Filter schedules
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredSchedule = schedule.filter((item) => {
    const itemCl = getCleanerName(item);
    // If cleaner, only show their assignments
    if (isCleaner && itemCl.toLowerCase() !== cleanerName.toLowerCase()) {
      return false;
    }
    if (filter === 'today') return item.fecha === todayStr;
    if (filter === 'upcoming') return item.fecha >= todayStr;
    return true; // all
  });

  const handleOpenModal = () => {
    if (isCleaner) {
      setCleaner(cleanerName);
    } else {
      setCleaner(availableCleaners[0] || '');
    }
    setUnidad(availableUnits[0] || '');
    setDuracionHoras(2);
    setDuracionMinutos(0);
    setFecha(new Date().toISOString().split('T')[0]);
    setHora('09:00');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const assignedCleaner = isCleaner ? cleanerName : cleaner;
    const durMin = Number(duracionMinutos) || 0;
    const durHrs = Number(duracionHoras) || 0;
    const totalDecimalHours = parseFloat((durHrs + durMin / 60).toFixed(2));

    const durationLabel = durMin > 0 ? `${durHrs}h ${durMin}m` : `${durHrs}h`;
    const fullNotes = notes.trim()
      ? `[Duración: ${durationLabel}] ${notes.trim()}`
      : `[Duración: ${durationLabel}]`;

    onAddSchedule({
      fecha,
      hora,
      unidad,
      cleaners: [assignedCleaner],
      cleaner: assignedCleaner,
      tipo,
      notas: fullNotes,
      estado: 'programado',
      status: 'pending',
      horas: totalDecimalHours,
    });
    setIsModalOpen(false);
    setNotes('');
  };

  const handleStatusToggle = (item) => {
    const isDone = item.estado === 'completado' || item.status === 'completed';
    const nextStatus = isDone ? 'pending' : 'completed';
    const nextEstado = isDone ? 'programado' : 'completado';
    onUpdateSchedule(item.id, { status: nextStatus, estado: nextEstado });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-[#0B1D4A]">
              {isCleaner ? 'Mis Asignaciones y Turnos' : 'Agenda de Asignaciones y Turnos'}
            </h2>
            {isCleaner && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFB566]/20 text-[#0B1D4A] border border-[#FFB566]/60 text-[11px] font-bold">
                {cleanerName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCleaner
              ? 'Consulta tus turnos asignados y programa nuevos servicios para ti mismo'
              : 'Planificación y asignación de limpiezas por fecha, hora, unidad y cleaner'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'upcoming'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Próximos
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'today'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-[#0B1D4A] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({filteredSchedule.length})
            </button>
          </div>

          {/* Direct Service Capture Button */}
          {onOpenNewService && (
            <button
              onClick={() => onOpenNewService({
                fecha: new Date().toISOString().split('T')[0],
                cleaner: isCleaner ? cleanerName : (availableCleaners[0] || ''),
                cleaners: isCleaner ? [cleanerName] : (availableCleaners[0] ? [availableCleaners[0]] : []),
                tipo: 'Limpieza',
              })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1D4A] hover:bg-[#1E3670] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              title={isCleaner ? 'Registrar un servicio completado para ti' : 'Capturar un nuevo servicio'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFB566]" />
              <span>{isCleaner ? '+ Registrar Mi Servicio' : '+ Capturar Servicio'}</span>
            </button>
          )}

          {/* Add Assignment Button (Enabled for both Cleaner & Admin) */}
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#FFB566] to-[#E89A45] text-[#0B1D4A] text-xs font-bold rounded-xl hover:brightness-105 active:scale-98 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isCleaner ? 'Agendar Mi Asignación' : 'Agendar Asignación'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchedule.map((item) => {
          const isDone = item.estado === 'completado' || item.status === 'completed';
          const itemCleaner = getCleanerName(item);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.fecha}</span>
                    <span>·</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800">{item.hora || '09:00'}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isDone ? 'Completado' : 'Pendiente'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-[#0B1D4A] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-serif font-bold text-base text-[#0B1D4A] leading-tight">
                        {item.unidad}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">{item.tipo || 'Limpieza'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700">
                      Asignado: <strong className="text-slate-900">{itemCleaner}</strong>
                      {isCleaner && itemCleaner.toLowerCase() === cleanerName.toLowerCase() && (
                        <span className="ml-1 text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded">Tú</span>
                      )}
                    </span>
                  </div>

                  {(item.notas || item.notes) && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mt-2">
                      <p className="line-clamp-2">{item.notas || item.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleStatusToggle(item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-[#0B1D4A] text-white hover:bg-[#1E3670]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isDone ? 'Completado' : 'Marcar Hecho'}</span>
                  </button>

                  {onOpenNewService && (
                    <button
                      onClick={() => onOpenNewService({
                        unidad: item.unidad,
                        fecha: item.fecha,
                        horas: item.horas || 2,
                        cleaner: isCleaner ? cleanerName : itemCleaner,
                        cleaners: isCleaner ? [cleanerName] : (item.cleaners?.length ? item.cleaners : [itemCleaner]),
                        tipo: item.tipo || 'Limpieza',
                        status: 'activo',
                      })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#FFB566]/20 text-[#0B1D4A] hover:bg-[#FFB566]/40 border border-[#FFB566]/60 transition-colors"
                      title="Registrar esta asignación en tu historial de turnos y nómina"
                    >
                      <Sparkles className="w-3 h-3 text-amber-700" />
                      <span>Registrar Servicio</span>
                    </button>
                  )}
                </div>

                {(!isCleaner || itemCleaner.toLowerCase() === cleanerName.toLowerCase()) && (
                  <button
                    onClick={() => onDeleteSchedule(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar asignación"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredSchedule.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No hay turnos para este filtro.</p>
            <p className="text-xs">
              {isCleaner
                ? 'Puedes agendar una asignación personal haciendo clic en el botón superior.'
                : 'Usa el botón "Agendar Asignación" para programar servicios.'}
            </p>
          </div>
        )}
      </div>

      {/* Add Schedule Modal (Cleaner lock enforced) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between">
              <div>
                <span className="font-serif text-lg font-bold text-[#FAF7F1] block">
                  {isCleaner ? 'Agendar Mi Asignación' : 'Agendar Asignación'}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {isCleaner ? `Solo para: ${cleanerName}` : 'Programación de Operaciones'}
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Duration: Hours & Minutes (15, 20, 30, 45 min) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block font-bold text-slate-700">
                  Duración Estimada (Horas y Minutos)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Horas:</span>
                    <select
                      value={duracionHoras}
                      onChange={(e) => setDuracionHoras(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>{h} {h === 1 ? 'hora' : 'horas'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Minutos:</span>
                    <select
                      value={duracionMinutos}
                      onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                    >
                      <option value={0}>0 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-medium pt-1">
                  Total: <strong className="text-[#0B1D4A]">{duracionHoras}h {duracionMinutos > 0 ? `${duracionMinutos}m` : ''}</strong> ({parseFloat((duracionHoras + duracionMinutos / 60).toFixed(2))} hrs)
                </div>
              </div>

              {/* Unit / Client */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Unidad / Residencia</label>
                  {onAddClient && (
                    <button
                      type="button"
                      onClick={() => setShowAddClientInSchedule(!showAddClientInSchedule)}
                      className="text-[11px] font-bold text-[#0B1D4A] hover:text-[#1E3670] bg-[#FFB566]/20 border border-[#FFB566]/60 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      + Nuevo Cliente
                    </button>
                  )}
                </div>

                {showAddClientInSchedule && (
                  <div className="mb-2 p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-amber-950 block">Nombre del nuevo cliente / unidad:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Ej: Mohammed o Phillys..."
                        value={newScheduleClient}
                        onChange={(e) => setNewScheduleClient(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B1D4A]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const trimmed = newScheduleClient.trim();
                          if (trimmed) {
                            await onAddClient(trimmed);
                            setUnidad(trimmed);
                            setNewScheduleClient('');
                            setShowAddClientInSchedule(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#0B1D4A] text-[#FFB566] text-xs font-bold rounded-lg hover:bg-[#1E3670] cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  required
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Assigned Cleaner & Service Type */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* CLEANER FIELD: LOCKED FOR CLEANER, SELECTABLE FOR ADMIN */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cleaner Asignado</label>
                  {isCleaner ? (
                    <div className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50 rounded-xl text-[#0B1D4A] font-bold flex items-center justify-between">
                      <span>{cleanerName}</span>
                      <span className="text-[10px] bg-[#0B1D4A] text-white px-1.5 py-0.2 rounded font-semibold">Tú</span>
                    </div>
                  ) : (
                    <select
                      value={cleaner}
                      onChange={(e) => setCleaner(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                      required
                    >
                      {availableCleaners.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  {isCleaner && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Solo puedes agendar para ti.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Servicio</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  >
                    <option value="Limpieza">Limpieza</option>
                    <option value="Extra Task">Extra Task</option>
                  </select>
                </div>
              </div>

              {/* Special instructions */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instrucciones Especiales / Notas</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Código de acceso, cambio de sábanas, atención a detalles, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-[#0B1D4A] bg-[#FFB566] hover:bg-[#E89A45] rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Confirmar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
