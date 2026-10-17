import React from 'react';
import { Clock, DollarSign, TrendingUp, CheckCircle2, Users } from 'lucide-react';

export default function StatsCards({ services, showFinances, periodFilter, setPeriodFilter }) {
  // Filter services by period
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const filteredServices = services.filter((s) => {
    if (!s.fecha) return true;
    if (periodFilter === 'current_month') return s.fecha.startsWith(currentMonthStr);
    if (periodFilter === 'prev_month') return s.fecha.startsWith(prevMonthStr);
    return true; // 'all'
  });

  const totalServices = filteredServices.length;
  const totalHours = filteredServices.reduce((sum, s) => sum + (Number(s.horas) || 0), 0);
  const totalRevenue = filteredServices.reduce((sum, s) => sum + (Number(s.cobro) || 0), 0);
  const totalCleanerPay = filteredServices.reduce((sum, s) => {
    // If pagosPorCleaner exists, sum its values, otherwise use pagoCleaner
    if (s.pagosPorCleaner && Object.keys(s.pagosPorCleaner).length > 0) {
      return sum + Object.values(s.pagosPorCleaner).reduce((pSum, v) => pSum + (Number(v) || 0), 0);
    }
    return sum + (Number(s.pagoCleaner) || 0);
  }, 0);
  const totalTeamPay = filteredServices.reduce((sum, s) => sum + (Number(s.pagoCleaningTeam) || 0), 0);
  const totalTips = filteredServices.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
  const netProfit = totalRevenue - (totalCleanerPay + totalTeamPay);

  return (
    <div className="space-y-4">
      {/* Period Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              periodFilter === 'all'
                ? 'bg-white text-[#0B1D4A] font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico Total
          </button>
          <button
            onClick={() => setPeriodFilter('current_month')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              periodFilter === 'current_month'
                ? 'bg-white text-[#0B1D4A] font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Este Mes
          </button>
          <button
            onClick={() => setPeriodFilter('prev_month')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              periodFilter === 'prev_month'
                ? 'bg-white text-[#0B1D4A] font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mes Anterior
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filteredServices.length} servicios registrados
        </span>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Hours */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium tracking-tight">Horas Operadas</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {totalHours.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-medium">hrs</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            Promedio {(totalHours / (totalServices || 1)).toFixed(1)}h por turno
          </span>
        </div>

        {/* Total Payout to Cleaners */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium tracking-tight">Pago a Cleaners</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              ${totalCleanerPay.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 font-medium">CAD</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {totalTips > 0 ? `+ $${totalTips} en propinas` : 'Nómina directa'}
          </span>
        </div>

        {/* Revenue (Admins with Full Access only) */}
        {showFinances ? (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium tracking-tight">Cobro a Clientes</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-slate-500 font-medium">CAD</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium mt-1">
                Facturación bruta
              </span>
            </div>

            <div className="bg-gradient-to-br from-[#0B1D4A] to-[#1E3670] text-white p-4 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-300 mb-2">
                <span className="text-xs font-medium tracking-tight text-slate-200">Margen Neto</span>
                <TrendingUp className="w-4 h-4 text-[#FFB566]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#FFB566] tabular-nums">
                  ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-slate-300 font-medium">CAD</span>
              </div>
              <span className="text-[11px] text-slate-300 mt-1">
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(0)}% de margen` : 'Rentabilidad'}
              </span>
            </div>
          </>
        ) : (
          <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-center">
            <span className="text-xs text-slate-500">
              Métricas financieras confidenciales protegidas por rol de supervisor.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
