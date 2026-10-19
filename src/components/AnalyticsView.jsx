import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, DollarSign, Clock, PieChart as PieIcon } from 'lucide-react';

export default function AnalyticsView({ services }) {
  // Aggregate services by month (last 6 months)
  const monthlyData = {};
  services.forEach((s) => {
    if (!s.fecha) return;
    const monthKey = s.fecha.slice(0, 7); // 'YYYY-MM'
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        cobro: 0,
        costos: 0,
        horas: 0,
        servicios: 0,
      };
    }
    const cobroVal = Number(s.cobro) || 0;
    const cleanerPay = s.pagosPorCleaner
      ? Object.values(s.pagosPorCleaner).reduce((a, b) => a + (Number(b) || 0), 0)
      : Number(s.pagoCleaner) || 0;
    const teamPay = Number(s.pagoCleaningTeam) || 0;
    const cost = teamPay > 0 ? teamPay : cleanerPay;

    monthlyData[monthKey].cobro += cobroVal;
    monthlyData[monthKey].costos += cost;
    monthlyData[monthKey].utilidad = (monthlyData[monthKey].utilidad || 0) + (cobroVal - cost);
    monthlyData[monthKey].horas += Number(s.horas) || 0;
    monthlyData[monthKey].servicios += 1;
  });

  const chartData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  // By service type
  const typeCounts = {};
  services.forEach((s) => {
    const t = s.tipo || 'Limpieza';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const pieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  const COLORS = ['#0B1D4A', '#FFB566', '#7A9471', '#C67B5C'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-semibold text-[#0B1D4A]">
          Análisis Financiero y Desempeño
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Evolución de facturación bruta, costos operativos y volumen de turnos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-800">Facturación vs Costos (CAD)</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-[#0B1D4A]"></span> Facturación
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-[#FFB566]"></span> Nómina & Costos
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val) => [`$${Number(val).toLocaleString()} CAD`, '']}
                  contentStyle={{ backgroundColor: '#0B1D4A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="cobro" name="Facturación" fill="#0B1D4A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="costos" name="Costos Nómina" fill="#FFB566" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-800 mb-2 block">
            Distribución por Tipo de Servicio
          </span>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1D4A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="text-slate-700">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums">{d.value} turnos</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
