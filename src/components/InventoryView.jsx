import React, { useState } from 'react';
import { Package, Warehouse, Building2, AlertTriangle, Check, Plus, Minus, Search, ShieldCheck } from 'lucide-react';

export default function InventoryView({
  stockByUnit,
  stockStorage,
  availableUnits,
  onUpdateStockByUnit,
  onUpdateStockStorage,
}) {
  const [subTab, setSubTab] = useState('units'); // 'units' or 'storage'
  const [selectedUnit, setSelectedUnit] = useState(availableUnits[0] || 'Rohan Unit A');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Current unit items
  const currentUnitItems = (stockByUnit[selectedUnit] || []).filter((item) => {
    if (categoryFilter !== 'all' && item.cat !== categoryFilter) return false;
    if (searchTerm && !item.prod.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Storage items
  const filteredStorage = (stockStorage || []).filter((item) => {
    if (categoryFilter !== 'all' && item.cat !== categoryFilter) return false;
    if (searchTerm && !item.prod.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const categories = ['all', 'Químicos', 'Consumibles', 'Blancos', 'Herramientas'];

  const handleUnitItemDelta = (itemId, delta) => {
    const list = stockByUnit[selectedUnit] || [];
    const nextList = list.map((it) => {
      if (it.id === itemId) {
        const nextQty = Math.max(0, it.qty + delta);
        return { ...it, qty: nextQty };
      }
      return it;
    });
    onUpdateStockByUnit(selectedUnit, nextList);
  };

  const handleStorageItemDelta = (itemId, delta) => {
    const nextList = (stockStorage || []).map((it) => {
      if (it.id === itemId) {
        const nextQty = Math.max(0, it.qty + delta);
        return { ...it, qty: nextQty };
      }
      return it;
    });
    onUpdateStockStorage(nextList);
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-semibold text-[#0B1D4A]">
            Control de Insumos e Inventario
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión de stock crítico en unidades residenciales y almacén general
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setSubTab('units')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              subTab === 'units'
                ? 'bg-white text-[#0B1D4A] font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Por Unidad Residencial</span>
          </button>
          <button
            onClick={() => setSubTab('storage')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              subTab === 'storage'
                ? 'bg-white text-[#0B1D4A] font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span>Almacén Central</span>
          </button>
        </div>
      </div>

      {/* Filter and selector row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {subTab === 'units' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700">Unidad:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-[#0B1D4A] border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
            >
              {availableUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white text-[#0B1D4A] shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {cat === 'all' ? 'Todas las categorías' : cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filtrar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
            />
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      {subTab === 'units' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {currentUnitItems.map((item) => {
            const isLow = item.qty < item.min;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                  isLow ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-medium">{item.cat}</span>
                    {isLow ? (
                      <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Bajo mínimo ({item.min})</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium text-[10px]">Óptimo</span>
                    )}
                  </div>

                  <h4 className="font-semibold text-sm text-slate-900 leading-tight mb-2">
                    {item.prod}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums text-slate-900">
                      {item.qty}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => handleUnitItemDelta(item.id, -1)}
                      className="w-7 h-7 rounded-md bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs transition-colors"
                      title="Disminuir"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUnitItemDelta(item.id, 1)}
                      className="w-7 h-7 rounded-md bg-[#0B1D4A] text-white hover:bg-[#1E3670] flex items-center justify-center shadow-xs transition-colors"
                      title="Aumentar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredStorage.map((item) => {
            const isLow = item.qty < item.min;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                  isLow ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-medium">{item.cat}</span>
                    {isLow && (
                      <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Reabastecer</span>
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-sm text-slate-900 leading-tight mb-2">
                    {item.prod}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums text-slate-900">
                      {item.qty}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => handleStorageItemDelta(item.id, -1)}
                      className="w-7 h-7 rounded-md bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStorageItemDelta(item.id, 1)}
                      className="w-7 h-7 rounded-md bg-[#0B1D4A] text-white hover:bg-[#1E3670] flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
