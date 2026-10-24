import React, { useState } from 'react';
import {
  X, CheckCircle2, AlertCircle, Play, RefreshCw, Smartphone,
  Database, ShieldCheck, Sparkles, MessageCircle, Clock, Copy, Check
} from 'lucide-react';
import { runSystemDiagnostics } from '../lib/systemDiagnostics';

export default function SystemDiagnosticsModal({
  isOpen,
  onClose,
  services = [],
  schedule = [],
  cleanersDb = [],
  onAddTestShift,
  onAddTestMemory,
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [copiedTestSummary, setCopiedTestSummary] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    setActionNotice(null);
    try {
      const results = await runSystemDiagnostics(services, schedule, cleanersDb);
      setTestResults(results);
    } catch (err) {
      console.error('Diagnostics execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyResults = () => {
    if (!testResults) return;
    let text = `🧪 *REPORTE DE DIAGNÓSTICO Y PRUEBAS - WHITEGLOVE*\n`;
    text += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    testResults.forEach((r, idx) => {
      const icon = r.status === 'passed' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
      text += `${idx + 1}. ${icon} [${r.category}] ${r.title} (${r.executionTimeMs}ms)\n   ${r.details}\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Pruebas completadas exitosamente.`;
    navigator.clipboard.writeText(text);
    setCopiedTestSummary(true);
    setTimeout(() => setCopiedTestSummary(false), 3000);
  };

  const totalPassed = testResults?.filter((r) => r.status === 'passed').length || 0;
  const totalWarnings = testResults?.filter((r) => r.status === 'warning').length || 0;
  const totalFailed = testResults?.filter((r) => r.status === 'failed').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0B1D4A] p-5 text-white flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB566]/20 border border-[#FFB566]/40 flex items-center justify-center text-[#FFB566]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#FAF7F1]">
                Panel de Pruebas & Diagnóstico en Vivo
              </h3>
              <p className="text-xs text-slate-300">
                Verifica memoria multi-dispositivo, WhatsApp, aislamiento María/Mafer y Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunTests}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#FFB566]" />
                    <span>Ejecutando Pruebas...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-[#FFB566]" />
                    <span>Ejecutar Todas las Pruebas</span>
                  </>
                )}
              </button>

              {testResults && (
                <button
                  type="button"
                  onClick={handleCopyResults}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer"
                >
                  {copiedTestSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>¡Copiado al Portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Reporte</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {testResults && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  {totalPassed} Pasadas
                </span>
                {totalWarnings > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px]">
                    {totalWarnings} Avisos
                  </span>
                )}
                {totalFailed > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px]">
                    {totalFailed} Fallidas
                  </span>
                )}
              </div>
            )}
          </div>

          {actionNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-medium flex items-center justify-between">
              <span>{actionNotice}</span>
              <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">×</button>
            </div>
          )}

          {/* Test Results List */}
          {testResults ? (
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-slate-800 text-sm">
                Resultados de la Suite Automatizada ({testResults.length} pruebas):
              </h4>
              <div className="space-y-2.5">
                {testResults.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      r.status === 'passed'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : r.status === 'warning'
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {r.status === 'passed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        ) : r.status === 'warning' ? (
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{r.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-white rounded border border-slate-200 text-slate-500 font-semibold">
                              {r.category}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">
                            {r.details}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        {r.executionTimeMs} ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Sparkles className="w-8 h-8 text-[#FFB566] mx-auto" />
              <h4 className="font-serif font-bold text-slate-800 text-sm">
                Suite de Pruebas Lista para Ejecutar
              </h4>
              <p className="text-slate-500 max-w-md mx-auto text-xs">
                Haz clic en <strong>"Ejecutar Todas las Pruebas"</strong> para validar en tiempo real la persistencia de memoria en la nube, la generación de mensajes de WhatsApp, el aislamiento María/Mafer y la conexión a Firestore.
              </p>
            </div>
          )}

          {/* Interactive Live Generator Tools for Admin Testing */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
            <h4 className="font-serif font-bold text-amber-950 flex items-center gap-1.5 text-xs">
              <Smartphone className="w-4 h-4 text-amber-700" />
              <span>Generador de Datos de Prueba en Vivo (Prueba en tus otros dispositivos):</span>
            </h4>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Puedes emitir un turno de prueba o una memoria de cliente ahora mismo para verificar que aparezca inmediatamente en tu celular o tablet sin recargar la página:
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {onAddTestShift && (
                <button
                  type="button"
                  onClick={async () => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    await onAddTestShift({
                      fecha: todayStr,
                      hora: '14:30',
                      unidad: 'Prueba en Vivo',
                      cleaner: 'Maria',
                      cleaners: ['Maria'],
                      tipo: 'Limpieza',
                      horas: 2.5,
                      notas: 'Turno de prueba para verificar sincronización instantánea multi-dispositivo.',
                      estado: 'programado',
                      status: 'pending',
                    });
                    setActionNotice('✅ Turno de prueba agendado. Revisa tu otro dispositivo en la pestaña Calendario.');
                  }}
                  className="px-3 py-1.5 bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  📅 Emitir Turno de Prueba en Vivo
                </button>
              )}

              {onAddTestMemory && (
                <button
                  type="button"
                  onClick={async () => {
                    await onAddTestMemory('Unidad Demo Live', {
                      cobro: 260,
                      tipo: 'Limpieza',
                      horas: 3,
                      pagoCleaningTeam: 50,
                      cleaners: ['Maria'],
                    });
                    setActionNotice('✅ Memoria de "Unidad Demo Live" guardada ($260 CAD, 3h). Abre el modal de nuevo servicio en tu otro dispositivo para comprobar el auto-llenado.');
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  🧠 Emitir Memoria de Cliente de Prueba
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cerrar Diagnóstico
          </button>
        </div>

      </div>
    </div>
  );
}
