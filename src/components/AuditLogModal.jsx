import React, { useState, useEffect } from 'react';
import { History, X, Clock, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuditLogModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    async function loadLogs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) setLogs(data);
      } catch (e) {
        console.error('loadLogs error', e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B1D4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#FFB566]" />
            <span className="font-serif text-lg font-medium text-[#FAF7F1]">
              Historial de Auditoría y Trazabilidad
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Cargando registros de auditoría...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No hay registros de auditoría aún.</div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => {
                const date = log.created_at ? new Date(log.created_at).toLocaleString('es-MX') : '—';
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-1.5 font-semibold text-[#0B1D4A]">
                        <User className="w-3.5 h-3.5" />
                        <span>{log.actor || 'Sistema'}</span>
                        <span className="text-slate-400 font-normal">·</span>
                        <span className="text-[11px] font-normal uppercase text-slate-500">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{date}</span>
                      </div>
                    </div>
                    {log.details && (
                      <p className="text-slate-700 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                        {log.details}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
