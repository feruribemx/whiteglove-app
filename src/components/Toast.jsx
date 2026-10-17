import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              isError
                ? 'bg-rose-950/95 text-rose-100 border-rose-800/80 shadow-rose-950/20'
                : isInfo
                ? 'bg-[#0B1D4A]/95 text-slate-100 border-slate-700 shadow-slate-950/20'
                : 'bg-[#0B1D4A]/95 text-[#FAF7F1] border-[#FFB566]/40 shadow-[#0B1D4A]/30'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isError ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : isInfo ? (
                <Info className="w-5 h-5 text-sky-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#FFB566]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{toast.title}</p>}
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
