import { useState, useEffect } from 'react';
import {
  Plus, Home, ClipboardList, BarChart3, Package, Trash2, X, Sparkles,
  Clock, DollarSign, TrendingUp, AlertCircle, CheckCircle2,
  Minus, ChevronRight, Warehouse, Building2, Eye, EyeOff, LogOut, User, Shield, ArrowLeft
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';
import { createClient } from '@supabase/supabase-js';

// ---------- Supabase ----------
const SUPABASE_URL = 'https://mijeqjelqxdyrdfysndb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pamVxamVscXhkeXJkZnlzbmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODk3ODEsImV4cCI6MjEwNTA2NTc4MX0.-uDDOD8Z8XxTYY3H8W4woGHHxq-mu2kiPGcFIXrHsA4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// Session storage stays local (auth is device-local)
if (typeof window !== 'undefined') {
  window.storage = window.storage || {
    get: async (key) => { try { const v = localStorage.getItem(key); return v !== null ? { value: v } : null; } catch(e) { return null; } },
    set: async (key, value) => { try { localStorage.setItem(key, value); return { value }; } catch(e) { return null; } },
    delete: async (key) => { try { localStorage.removeItem(key); return { deleted: true }; } catch(e) { return null; } },
  };
}

// ---------- DB transforms ----------
const svcFromDb = (r) => ({
  id: Number(r.id),
  fecha: r.fecha,
  unidad: r.unidad,
  cleaners: r.cleaners || [],
  cleaner: (r.cleaners || [])[0] || '',
  horas: Number(r.horas),
  tipo: r.tipo,
  cobro: r.cobro !== null && r.cobro !== undefined ? Number(r.cobro) : null,
  pagoCleaner: r.pago_cleaner !== null && r.pago_cleaner !== undefined ? Number(r.pago_cleaner) : null,
  capturista: r.capturista || '',
});
const svcToDb = (s) => ({
  id: s.id,
  fecha: s.fecha,
  unidad: s.unidad,
  cleaners: s.cleaners && s.cleaners.length ? s.cleaners : (s.cleaner ? [s.cleaner] : []),
  horas: s.horas,
  tipo: s.tipo,
  cobro: s.cobro,
  pago_cleaner: s.pagoCleaner,
  capturista: s.capturista || null,
});
const stockUnitFromDb = (r) => ({
  id: r.id, cat: r.categoria, prod: r.producto, unit: r.unidad_medida,
  qty: Number(r.qty), min: Number(r.min_qty),
});
const stockStorageFromDb = (r) => ({
  id: Number(r.id), cat: r.categoria, prod: r.producto, unit: r.unidad_medida,
  qty: Number(r.qty), min: Number(r.min_qty),
});

// Fetchers
async function fetchAllServices() {
  const { data, error } = await supabase.from('services').select('*').order('fecha', { ascending: false });
  if (error) { console.error('fetch services', error); return []; }
  return (data || []).map(svcFromDb);
}
async function fetchStockByUnit(UNITS_LIST, TEMPLATE) {
  const { data, error } = await supabase.from('stock_by_unit').select('*');
  if (error) { console.error('fetch stock_by_unit', error); return null; }
  if (!data || data.length === 0) return null;
  const grouped = {};
  for (const row of data) {
    if (!grouped[row.unidad]) grouped[row.unidad] = [];
    grouped[row.unidad].push(stockUnitFromDb(row));
  }
  for (const u of UNITS_LIST) {
    if (!grouped[u]) grouped[u] = TEMPLATE.map((it, i) => ({ ...it, id: `${u}-${i}` }));
  }
  return grouped;
}
async function fetchStockStorage() {
  const { data, error } = await supabase.from('stock_storage').select('*');
  if (error) { console.error('fetch stock_storage', error); return null; }
  if (!data || data.length === 0) return null;
  return data.map(stockStorageFromDb);
}
async function seedStockByUnit(UNITS_LIST, TEMPLATE) {
  const rows = [];
  for (const unidad of UNITS_LIST) {
    TEMPLATE.forEach((item, i) => {
      rows.push({
        id: `${unidad}-${i}`, unidad,
        categoria: item.cat, producto: item.prod, unidad_medida: item.unit,
        qty: item.qty, min_qty: item.min,
      });
    });
  }
  const { error } = await supabase.from('stock_by_unit').upsert(rows, { onConflict: 'id' });
  if (error) console.error('seed stock_by_unit', error);
}
async function seedStockStorage(items) {
  const rows = items.map((item) => ({
    id: item.id, categoria: item.cat, producto: item.prod,
    unidad_medida: item.unit, qty: item.qty, min_qty: item.min,
  }));
  const { error } = await supabase.from('stock_storage').upsert(rows, { onConflict: 'id' });
  if (error) console.error('seed stock_storage', error);
}

const LOGO_URI = 'data:image/webp;base64,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';

const c = {
  navy:       '#0B1D4A',
  navyDeep:   '#061434',
  navyLight:  '#1E3670',
  apricot:    '#FFB566',
  apricotSoft:'#FFE0B8',
  apricotPale:'#FFF3E0',
  cream:      '#FAF7F1',
  paper:      '#FFFFFF',
  blush:      '#E8B4B8',
  blushSoft:  '#F7E8E9',
  blushDeep:  '#D48B90',
  // aliases para no romper referencias
  gold:       '#FFB566',
  goldDark:   '#E89A45',
  goldSoft:   '#FFE0B8',
  goldPale:   '#FFF3E0',
  charcoal:   '#0B1D4A',
  graytext:   '#6B6B7B',
  divider:    '#E4E4EC',
  sage:       '#7A9471',
  sageLight:  '#E3EBDD',
  terra:      '#C67B5C',
  terraLight: '#F4E1D6',
};

const CLEANERS = ['Jazz', 'Karen', 'Kary', 'Ruben', 'Mafer'];
const UNITS = ['Rohan Unit A', 'Rohan Unit B', 'Rohan Unit C', 'Alexei', 'Larisse N',
               'Anine Bing YV', 'Anine Bing YD', 'Mandy D', 'Saadman', 'Mayeesha', 'Max - Hamilton'];
const HOURS = Array.from({ length: 25 }, (_, i) => 1 + i * 0.25);
const TYPES = ['Limpieza', 'Extra Task'];
const CAPTURISTAS = ['Fer Castil', 'Michelle Lopez', 'WhiteGlove'];

const USERS = {
  Fernandouribe: { password: 'bfgu1108.', displayName: 'Fernando Uribe' },
  MichelleAdmin: { password: 'Romina1.',  displayName: 'Michelle López' },
  FerCastil:     { password: 'Rocky1.',   displayName: 'Fer Castil' },
};

const initialsOf = (name) => (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const UNIT_STOCK_TEMPLATE = [
  { cat: 'Químicos',     prod: 'Multiusos',              unit: 'botellas', qty: 2, min: 1 },
  { cat: 'Químicos',     prod: 'Desinfectante baños',    unit: 'botellas', qty: 1, min: 1 },
  { cat: 'Químicos',     prod: 'Limpiavidrios',          unit: 'botellas', qty: 1, min: 1 },
  { cat: 'Químicos',     prod: 'Cloro',                  unit: 'litros',   qty: 1, min: 1 },
  { cat: 'Consumibles',  prod: 'Papel higiénico',        unit: 'rollos',   qty: 4, min: 2 },
  { cat: 'Consumibles',  prod: 'Papel de cocina',        unit: 'rollos',   qty: 2, min: 1 },
  { cat: 'Consumibles',  prod: 'Bolsas basura chicas',   unit: 'paquetes', qty: 1, min: 1 },
  { cat: 'Consumibles',  prod: 'Bolsas basura grandes',  unit: 'paquetes', qty: 1, min: 1 },
  { cat: 'Blancos',      prod: 'Toallas de manos',       unit: 'piezas',   qty: 2, min: 2 },
  { cat: 'Blancos',      prod: 'Trapos microfibra',      unit: 'piezas',   qty: 3, min: 2 },
  { cat: 'Herramientas', prod: 'Esponjas',               unit: 'piezas',   qty: 2, min: 1 },
  { cat: 'Herramientas', prod: 'Guantes',                unit: 'pares',    qty: 2, min: 1 },
];

const INITIAL_STOCK_BY_UNIT = UNITS.reduce((acc, u) => {
  acc[u] = UNIT_STOCK_TEMPLATE.map((it, i) => ({ ...it, id: `${u}-${i}` }));
  return acc;
}, {});

const INITIAL_STOCK_STORAGE = [
  { id: 1,  cat: 'Químicos',    prod: 'Multiusos (galón)',       unit: 'galones', qty: 2,  min: 1 },
  { id: 2,  cat: 'Químicos',    prod: 'Desinfectante (galón)',   unit: 'galones', qty: 1,  min: 1 },
  { id: 3,  cat: 'Químicos',    prod: 'Cloro (galón)',           unit: 'galones', qty: 2,  min: 1 },
  { id: 4,  cat: 'Químicos',    prod: 'Aromatizante',            unit: 'botellas',qty: 6,  min: 3 },
  { id: 5,  cat: 'Consumibles', prod: 'Papel higiénico (paca)',  unit: 'pacas',   qty: 2,  min: 1 },
  { id: 6,  cat: 'Consumibles', prod: 'Papel de cocina (paca)',  unit: 'pacas',   qty: 1,  min: 1 },
  { id: 7,  cat: 'Consumibles', prod: 'Bolsas basura (caja)',    unit: 'cajas',   qty: 2,  min: 1 },
  { id: 8,  cat: 'Blancos',     prod: 'Toallas (repuesto)',      unit: 'piezas',  qty: 20, min: 10 },
  { id: 9,  cat: 'Blancos',     prod: 'Trapos microfibra (rep.)',unit: 'piezas',  qty: 30, min: 15 },
  { id: 10, cat: 'Herramientas',prod: 'Guantes (caja)',          unit: 'cajas',   qty: 2,  min: 1 },
  { id: 11, cat: 'Herramientas',prod: 'Esponjas (paquete)',      unit: 'paquetes',qty: 3,  min: 2 },
  { id: 12, cat: 'Herramientas',prod: 'Escobas / Trapeadores',   unit: 'piezas',  qty: 3,  min: 2 },
];

const fmtMoney = (n) => `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};
const todayISO = () => new Date().toISOString().split('T')[0];
const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
};
const inMonth = (iso, monthKey) => iso && iso.startsWith(monthKey);
const countLow = (items) => items.filter((i) => i.qty < i.min).length;

// Devuelve el array de cleaners de un servicio (compatible con formato viejo)
const cleanersOf = (svc) => {
  if (Array.isArray(svc.cleaners) && svc.cleaners.length) return svc.cleaners;
  if (svc.cleaner) return [svc.cleaner];
  return [];
};

function BrandHeader() {
  return (
    <>
      <div className="flex justify-center mb-6">
        <img src={LOGO_URI} alt="WhiteGlove" className="w-24 h-24 rounded-full object-cover" style={{ boxShadow: '0 8px 32px rgba(11,29,74,0.2)' }} />
      </div>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-px w-6" style={{ background: c.apricot }} />
          <span className="text-xs tracking-[0.3em] font-semibold" style={{ color: c.apricot }}>WHITEGLOVE</span>
          <div className="h-px w-6" style={{ background: c.apricot }} />
        </div>
      </div>
    </>
  );
}

function RoleSelector({ onPick }) {
  const RoleCard = ({ id, title, description, icon: Icon }) => (
    <button
      onClick={() => onPick(id)}
      className="w-full rounded-3xl p-5 mb-3 flex items-center gap-4 transition-all"
      style={{ background: c.paper, boxShadow: '0 4px 24px rgba(11,29,74,0.06)' }}
    >
      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.apricotPale }}>
        <Icon size={22} style={{ color: c.apricot }} />
      </div>
      <div className="flex-1 text-left">
        <div className="text-lg font-serif" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>{title}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: c.graytext }}>{description}</div>}
      </div>
      <ChevronRight size={18} style={{ color: c.apricot }} />
    </button>
  );
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-8" style={{ background: c.cream }}>
      <div className="w-full max-w-sm">
        <BrandHeader />
        <div className="text-center mb-6">
          <h1 className="text-4xl font-serif mb-2" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>Bienvenida</h1>
          <p className="text-sm italic" style={{ color: c.graytext }}>¿Cómo vas a ingresar hoy?</p>
        </div>
        <RoleCard id="admin" title="Admin" description="" icon={Shield} />
        <RoleCard id="cleaner" title="Cleaner" description="Registrar mis servicios del día" icon={Sparkles} />
        <div className="text-center mt-6 text-[10px] tracking-wider" style={{ color: c.graytext, opacity: 0.7 }}>
          © 2026 WHITEGLOVE PROFESSIONAL SERVICES
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  function submit() {
    const typed = username.trim().toLowerCase();
    // Find the canonical user key by case-insensitive match
    const matchedKey = Object.keys(USERS).find((k) => k.toLowerCase() === typed);
    const user = matchedKey ? USERS[matchedKey] : null;
    if (!user || user.password.toLowerCase() !== password.toLowerCase()) {
      setError('Usuario o contraseña incorrectos');
      return;
    }
    onLogin({ role: 'admin', username: matchedKey, displayName: user.displayName });
  }

  const inputStyle = { background: c.paper, border: `1px solid ${c.divider}`, color: c.navy, fontSize: 15 };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-8" style={{ background: c.cream }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-xs font-semibold" style={{ color: c.graytext }}>
          <ArrowLeft size={14} /> Volver
        </button>
        <BrandHeader />
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif mb-2" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>Acceso Admin</h1>
          <p className="text-sm italic" style={{ color: c.graytext }}>Ingresa con tu usuario y contraseña</p>
        </div>
        <div className="rounded-3xl p-6" style={{ background: c.paper, boxShadow: '0 4px 24px rgba(11,29,74,0.06)' }}>
          <div className="mb-4">
            <label className="text-[10px] tracking-[0.2em] font-semibold uppercase block mb-2" style={{ color: c.graytext }}>Usuario</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: c.graytext }} />
              <input type="text" value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Tu usuario" autoCapitalize="none" autoCorrect="off"
                className="w-full pl-11 pr-4 py-3 rounded-2xl outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="mb-5">
            <label className="text-[10px] tracking-[0.2em] font-semibold uppercase block mb-2" style={{ color: c.graytext }}>Contraseña</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Tu contraseña"
                className="w-full pl-4 pr-12 py-3 rounded-2xl outline-none" style={inputStyle} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center">
                {showPwd ? <EyeOff size={16} style={{ color: c.graytext }} /> : <Eye size={16} style={{ color: c.graytext }} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-2xl p-3 mb-4 text-xs text-center font-semibold" style={{ background: c.terraLight, color: c.terra }}>{error}</div>
          )}
          <button onClick={submit} disabled={!username || !password}
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all"
            style={{ background: (username && password) ? c.navy : c.divider, color: (username && password) ? c.paper : c.graytext, opacity: (username && password) ? 1 : 0.6 }}>
            INICIAR SESIÓN
          </button>
        </div>
      </div>
    </div>
  );
}

function CleanerLogin({ onLogin, onBack }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-8" style={{ background: c.cream }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-xs font-semibold" style={{ color: c.graytext }}>
          <ArrowLeft size={14} /> Volver
        </button>
        <BrandHeader />
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif mb-2" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>¿Quién eres?</h1>
          <p className="text-sm italic" style={{ color: c.graytext }}>Toca tu nombre para entrar</p>
        </div>
        {CLEANERS.map((name) => (
          <button
            key={name}
            onClick={() => onLogin({ role: 'cleaner', cleanerName: name, displayName: name })}
            className="w-full rounded-3xl p-4 mb-3 flex items-center gap-4 transition-all"
            style={{ background: c.paper, boxShadow: '0 4px 24px rgba(11,29,74,0.06)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.apricot }}>
              <span className="text-sm font-bold" style={{ color: c.paper, fontFamily: "'Playfair Display', Georgia, serif" }}>{initialsOf(name)}</span>
            </div>
            <div className="flex-1 text-left">
              <div className="text-lg font-serif" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>{name}</div>
              <div className="text-xs" style={{ color: c.graytext }}>Cleaner</div>
            </div>
            <ChevronRight size={18} style={{ color: c.apricot }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserMenu({ user, onLogout, onClose }) {
  const isAdmin = user.role === 'admin';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(11,29,74,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[32px] p-6 pt-4" style={{ background: c.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 rounded-full mx-auto mb-5" style={{ background: c.divider }} />
        <div className="flex items-center gap-4 mb-6 px-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.apricotPale }}>
            <span className="text-sm font-bold" style={{ color: c.apricot, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {initialsOf(user.displayName)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] tracking-[0.2em] font-semibold uppercase" style={{ color: c.graytext }}>Sesión activa</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: isAdmin ? c.navy : c.apricot, color: c.paper }}>
                {isAdmin ? 'ADMIN' : 'CLEANER'}
              </span>
            </div>
            <div className="text-lg font-serif" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {user.displayName}
            </div>
            <div className="text-xs" style={{ color: c.graytext }}>{isAdmin ? `@${user.username}` : 'Cleaner'}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ background: c.terraLight, color: c.terra }}
        >
          <LogOut size={15} /> CERRAR SESIÓN
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-semibold text-sm mt-2"
          style={{ background: c.cream, color: c.graytext }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Header({ subtitle, showLogo, currentUser, onOpenMenu }) {
  return (
    <div className="px-6 pt-8 pb-5" style={{ background: c.cream }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="h-px w-6" style={{ background: c.apricot }} />
          <span className="text-xs tracking-[0.3em] font-semibold" style={{ color: c.apricot }}>WHITEGLOVE</span>
        </div>
        <div className="flex items-center gap-2">
          {showLogo && (
            <img src={LOGO_URI} alt="WhiteGlove" className="w-9 h-9 rounded-full object-cover" style={{ boxShadow: '0 2px 8px rgba(11,29,74,0.15)' }} />
          )}
          {currentUser && (
            <button onClick={onOpenMenu} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.apricotPale, border: `1px solid ${c.apricotSoft}` }}>
              <span className="text-[11px] font-bold" style={{ color: c.apricot }}>{initialsOf(currentUser.displayName)}</span>
            </button>
          )}
        </div>
      </div>
      <h1 className="text-3xl font-serif" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>
        {subtitle}
      </h1>
    </div>
  );
}

function KPI({ label, value, sub, accent, icon: Icon }) {
  return (
    <div className="rounded-3xl p-5 flex flex-col justify-between" style={{ background: c.paper, boxShadow: '0 2px 12px rgba(43,41,38,0.04)', minHeight: 130 }}>
      <div className="flex items-start justify-between">
        <span className="text-[10px] tracking-[0.2em] font-semibold uppercase" style={{ color: c.graytext }}>{label}</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: accent + '25' }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <div className="text-3xl font-serif" style={{ color: c.charcoal, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>{value}</div>
        {sub && <div className="text-xs mt-1" style={{ color: c.graytext }}>{sub}</div>}
      </div>
    </div>
  );
}

function ServiceCard({ svc, onDelete, onEdit, isAdmin }) {
  const isExtra = svc.tipo === 'Extra Task';
  const cleanersList = cleanersOf(svc);
  const cleanersDisplay = cleanersList.length > 1
    ? `${cleanersList.slice(0, 2).join(' + ')}${cleanersList.length > 2 ? ` +${cleanersList.length - 2}` : ''}`
    : (cleanersList[0] || '—');
  const utilidad = (svc.cobro != null && svc.pagoCleaner != null) ? svc.cobro - svc.pagoCleaner : null;

  return (
    <div className="rounded-2xl p-4 mb-3 flex items-center gap-3" style={{ background: c.paper, boxShadow: '0 1px 6px rgba(43,41,38,0.04)' }}>
      <button
        onClick={isAdmin && onEdit ? () => onEdit(svc) : undefined}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        style={{ cursor: isAdmin && onEdit ? 'pointer' : 'default' }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isExtra ? c.blushSoft : c.apricotPale }}>
          <div className="text-xs font-bold tracking-tight" style={{ color: isExtra ? c.blushDeep : c.navy }}>
            {(() => {
              if (!svc.fecha) return '';
              const [, m, d] = svc.fecha.split('-');
              return `${d}/${m}`;
            })()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate" style={{ color: c.charcoal }}>{svc.unidad}</span>
            {isExtra && <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: c.blushSoft, color: c.blushDeep }}>EXTRA</span>}
            {cleanersList.length > 1 && <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: c.apricotPale, color: c.apricot }}>{cleanersList.length}×</span>}
          </div>
          <div className="text-xs mt-0.5" style={{ color: c.graytext }}>
            {cleanersDisplay} · {svc.horas}h{svc.cobro != null && svc.cobro !== '' ? ` · ${fmtMoney(svc.cobro)}` : ''}
          </div>
          {isAdmin && (svc.pagoCleaner != null || utilidad != null) && (
            <div className="text-[10px] mt-1 flex items-center gap-2">
              {svc.pagoCleaner != null && <span style={{ color: c.graytext }}>Pago: <b style={{ color: c.charcoal }}>{fmtMoney(svc.pagoCleaner)}</b></span>}
              {utilidad != null && (
                <span style={{ color: utilidad >= 0 ? c.sage : c.terra }}>
                  Utilidad: <b>{fmtMoney(utilidad)}</b>
                </span>
              )}
            </div>
          )}
          {svc.capturista && (
            <div className="text-[10px] mt-1 italic" style={{ color: c.graytext, opacity: 0.7 }}>
              capturado por {svc.capturista}
            </div>
          )}
        </div>
      </button>
      {isAdmin && onDelete && (
        <button onClick={() => onDelete(svc.id)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.cream }}>
          <Trash2 size={13} style={{ color: c.graytext }} />
        </button>
      )}
    </div>
  );
}

function AddServiceModal({ onClose, onSave, onUpdate, currentUser, existingService }) {
  const isCleaner = currentUser?.role === 'cleaner';
  const isEditing = !!existingService;
  const initialCleaners = existingService
    ? (Array.isArray(existingService.cleaners) ? existingService.cleaners : (existingService.cleaner ? [existingService.cleaner] : []))
    : (isCleaner ? [currentUser.cleanerName] : []);

  const [fecha, setFecha] = useState(existingService?.fecha || todayISO());
  const [unidad, setUnidad] = useState(existingService?.unidad || '');
  const [cleaners, setCleaners] = useState(initialCleaners);
  const [horas, setHoras] = useState(existingService?.horas != null ? String(existingService.horas) : '');
  const [tipo, setTipo] = useState(existingService?.tipo || 'Limpieza');
  const [cobro, setCobro] = useState(existingService?.cobro != null ? String(existingService.cobro) : '');
  const [pagoCleaner, setPagoCleaner] = useState(existingService?.pagoCleaner != null ? String(existingService.pagoCleaner) : '');
  const [capturista, setCapturista] = useState(existingService?.capturista || (isCleaner ? currentUser.cleanerName : ''));

  const canSave = isCleaner
    ? (fecha && unidad && cleaners.length > 0 && horas && tipo)
    : (fecha && unidad && cleaners.length > 0 && horas && tipo && cobro !== '' && capturista);

  function toggleCleaner(name) {
    // Cleaner logueada: su nombre queda fijo (no puede quitarse a sí misma)
    if (isCleaner && name === currentUser.cleanerName && cleaners.includes(name)) return;
    setCleaners(cleaners.includes(name) ? cleaners.filter((n) => n !== name) : [...cleaners, name]);
  }

  function handleSave() {
    if (!canSave) return;
    const payload = {
      id: existingService?.id || Date.now(),
      fecha, unidad,
      cleaners,
      cleaner: cleaners[0] || '', // compat con código viejo
      horas: parseFloat(horas), tipo,
      cobro: cobro === '' ? null : parseFloat(cobro) || 0,
      pagoCleaner: pagoCleaner === '' ? null : parseFloat(pagoCleaner) || 0,
      capturista,
    };
    if (isEditing) onUpdate(payload);
    else onSave(payload);
  }

  const field = (label, children) => (
    <div className="mb-4">
      <label className="text-[10px] tracking-[0.2em] font-semibold uppercase block mb-2" style={{ color: c.graytext }}>{label}</label>
      {children}
    </div>
  );
  const inputStyle = { background: c.cream, border: `1px solid ${c.divider}`, color: c.charcoal, fontSize: 15 };
  const pillButton = (val, current, setter) => (
    <button key={val} onClick={() => setter(val)} className="px-4 py-2 rounded-full text-sm font-medium transition-all"
      style={{ background: current === val ? c.gold : c.cream, color: current === val ? c.paper : c.graytext, border: `1px solid ${current === val ? c.gold : c.divider}` }}>
      {val}
    </button>
  );
  const multiPill = (val) => {
    const active = cleaners.includes(val);
    const locked = isCleaner && val === currentUser.cleanerName;
    return (
      <button key={val} onClick={() => toggleCleaner(val)}
        className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
        style={{ background: active ? c.gold : c.cream, color: active ? c.paper : c.graytext, border: `1px solid ${active ? c.gold : c.divider}`, opacity: locked ? 0.9 : 1 }}>
        {active && <span style={{ fontSize: 10 }}>✓</span>}
        {val}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(43,41,38,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[32px] p-6 pt-4 max-h-[90vh] overflow-y-auto" style={{ background: c.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 rounded-full mx-auto mb-5" style={{ background: c.divider }} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} style={{ color: c.gold }} />
              <span className="text-[10px] tracking-[0.3em] font-semibold" style={{ color: c.gold }}>{isEditing ? 'EDITAR' : 'NUEVO'}</span>
            </div>
            <h2 className="text-2xl font-serif" style={{ color: c.charcoal, fontFamily: "'Playfair Display', Georgia, serif" }}>{isEditing ? 'Editar servicio' : 'Registrar servicio'}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.cream }}>
            <X size={16} style={{ color: c.charcoal }} />
          </button>
        </div>
        {field('Fecha', <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-4 py-3 rounded-2xl outline-none" style={inputStyle} />)}
        {field('Unidad / Cliente',
          <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full px-4 py-3 rounded-2xl outline-none appearance-none" style={inputStyle}>
            <option value="">Selecciona una unidad</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
        {field(cleaners.length > 1 ? `Cleaners (${cleaners.length})` : 'Cleaners',
          <div className="flex gap-2 flex-wrap">{CLEANERS.map((cl) => multiPill(cl))}</div>
        )}
        {field('Horas',
          <select value={horas} onChange={(e) => setHoras(e.target.value)} className="w-full px-4 py-3 rounded-2xl outline-none appearance-none" style={inputStyle}>
            <option value="">Selecciona horas</option>
            {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
          </select>
        )}
        {field('Tipo de servicio', <div className="flex gap-2">{TYPES.map((t) => pillButton(t, tipo, setTipo))}</div>)}
        {field(isCleaner ? 'Cobro al cliente (opcional)' : 'Cobro al cliente',
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: c.graytext }}>$</span>
            <input type="number" inputMode="decimal" value={cobro} onChange={(e) => setCobro(e.target.value)} placeholder={isCleaner ? "Puedes dejarlo en blanco" : "0"} className="w-full pl-9 pr-4 py-3 rounded-2xl outline-none" style={inputStyle} />
          </div>
        )}
        {!isCleaner && field(
          <span className="flex items-center gap-1.5">Pago al cleaner <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: c.navy, color: c.apricot }}>ADMIN</span></span>,
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: c.graytext }}>$</span>
            <input type="number" inputMode="decimal" value={pagoCleaner} onChange={(e) => setPagoCleaner(e.target.value)} placeholder="0" className="w-full pl-9 pr-4 py-3 rounded-2xl outline-none" style={inputStyle} />
          </div>
        )}
        {!isCleaner && field('Capturado por', <div className="flex gap-2 flex-wrap">{CAPTURISTAS.map((p) => pillButton(p, capturista, setCapturista))}</div>)}
        <button onClick={handleSave} disabled={!canSave} className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide mt-2 transition-all"
          style={{ background: canSave ? c.charcoal : c.divider, color: canSave ? c.paper : c.graytext, opacity: canSave ? 1 : 0.6 }}>
          {isEditing ? 'GUARDAR CAMBIOS' : 'GUARDAR SERVICIO'}
        </button>
      </div>
    </div>
  );
}

function HomeTab({ services, setTab, currentUser, onOpenMenu }) {
  const monthKey = currentMonthKey();
  const monthSvcs = services.filter((s) => inMonth(s.fecha, monthKey));
  const totalSvcs = monthSvcs.length;
  const totalHrs = monthSvcs.reduce((sum, s) => sum + (s.horas || 0), 0);
  const totalRev = monthSvcs.reduce((sum, s) => sum + (s.cobro || 0), 0);
  const totalPaid = monthSvcs.reduce((sum, s) => sum + (s.pagoCleaner || 0), 0);
  const ticket = totalSvcs ? totalRev / totalSvcs : 0;
  const recent = [...services].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 4);

  return (
    <div>
      <Header subtitle={`Buen día ${currentUser ? currentUser.displayName.split(' ')[0] : ''} ✨`} showLogo currentUser={currentUser} onOpenMenu={onOpenMenu} />
      <div className="px-6 -mt-2">
        <div className="text-sm mb-4 capitalize" style={{ color: c.graytext, fontStyle: 'italic' }}>{monthLabel(monthKey)}</div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <KPI label="Servicios" value={totalSvcs} sub="este mes" accent={c.gold} icon={Sparkles} />
          <KPI label="Horas" value={totalHrs.toFixed(2).replace(/\.?0+$/, '')} sub="trabajadas" accent={c.sage} icon={Clock} />
          <KPI label="Ingresos" value={fmtMoney(totalRev)} sub="cobro clientes" accent={c.blushDeep} icon={DollarSign} />
          {currentUser?.role === 'admin' ? (
            <KPI label="Utilidad" value={fmtMoney(totalRev - totalPaid)} sub={`pagos: ${fmtMoney(totalPaid)}`} accent={c.terra} icon={TrendingUp} />
          ) : (
            <KPI label="Ticket prom." value={fmtMoney(ticket)} sub="por servicio" accent={c.terra} icon={TrendingUp} />
          )}
        </div>
        <div className="flex items-center justify-between mb-3 mt-2">
          <h2 className="text-lg font-serif" style={{ color: c.charcoal, fontFamily: "'Playfair Display', Georgia, serif" }}>Últimos servicios</h2>
          <button onClick={() => setTab('registro')} className="text-xs font-semibold flex items-center gap-1" style={{ color: c.gold }}>
            Ver todo <ChevronRight size={12} />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: c.paper }}>
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: c.blushSoft }}>
              <Sparkles size={20} style={{ color: c.blushDeep }} />
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: c.charcoal }}>Aún no hay servicios</div>
            <div className="text-xs" style={{ color: c.graytext }}>Toca el botón + para registrar el primero</div>
          </div>
        ) : (
          recent.map((s) => <ServiceCard key={s.id} svc={s} isAdmin={currentUser?.role === 'admin'} />)
        )}
      </div>
    </div>
  );
}

function RegistroTab({ services, onDelete, onEdit, currentUser, onOpenMenu }) {
  const isCleaner = currentUser?.role === 'cleaner';
  const [filter, setFilter] = useState('todos');
  const [filterCleaner, setFilterCleaner] = useState('todas');
  const [filterCap, setFilterCap] = useState('todos');
  let list = [...services].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  // Cleaners only see their own services
  if (isCleaner) list = list.filter((s) => cleanersOf(s).includes(currentUser.cleanerName));
  if (filter !== 'todos') list = list.filter((s) => s.tipo === filter);
  if (!isCleaner && filterCleaner !== 'todas') list = list.filter((s) => cleanersOf(s).includes(filterCleaner));
  if (!isCleaner && filterCap !== 'todos') list = list.filter((s) => s.capturista === filterCap);

  const chip = (label, val, current, setter) => (
    <button onClick={() => setter(val)} className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: current === val ? c.charcoal : c.paper, color: current === val ? c.paper : c.graytext, border: `1px solid ${current === val ? c.charcoal : c.divider}` }}>
      {label}
    </button>
  );

  return (
    <div>
      <Header subtitle="Registro" currentUser={currentUser} onOpenMenu={onOpenMenu} />
      <div className="px-6 -mt-2 pb-4">
        <div className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: c.graytext }}>Tipo</div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
          {chip('Todos', 'todos', filter, setFilter)}
          {chip('Limpieza', 'Limpieza', filter, setFilter)}
          {chip('Extra Task', 'Extra Task', filter, setFilter)}
        </div>
        {!isCleaner && (
          <>
            <div className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: c.graytext }}>Cleaner</div>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
              {chip('Todas', 'todas', filterCleaner, setFilterCleaner)}
              {CLEANERS.map((cl) => chip(cl, cl, filterCleaner, setFilterCleaner))}
            </div>
            <div className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: c.graytext }}>Capturado por</div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {chip('Todos', 'todos', filterCap, setFilterCap)}
              {CAPTURISTAS.map((p) => chip(p, p, filterCap, setFilterCap))}
            </div>
          </>
        )}
      </div>
      <div className="px-6">
        <div className="text-xs mb-3" style={{ color: c.graytext }}>{list.length} {list.length === 1 ? 'servicio' : 'servicios'}</div>
        {list.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: c.paper }}><div className="text-sm" style={{ color: c.graytext }}>Nada aquí todavía</div></div>
        ) : (
          list.map((s) => <ServiceCard key={s.id} svc={s} onDelete={onDelete} onEdit={onEdit} isAdmin={!isCleaner} />)
        )}
      </div>
    </div>
  );
}

function GraficasTab({ services, currentUser, onOpenMenu }) {
  const monthKey = currentMonthKey();
  const monthSvcs = services.filter((s) => inMonth(s.fecha, monthKey));
  const byCleaner = CLEANERS.map((cl) => {
    const svcs = monthSvcs.filter((s) => cleanersOf(s).includes(cl));
    return {
      name: cl,
      // Ingresos: se divide entre los cleaners del servicio
      ingresos: svcs.reduce((sum, s) => sum + ((s.cobro || 0) / Math.max(1, cleanersOf(s).length)), 0),
      // Horas: crédito completo a cada cleaner que trabajó
      horas: svcs.reduce((sum, s) => sum + (s.horas || 0), 0),
    };
  });
  const byUnit = UNITS.map((u) => ({ name: u, servicios: monthSvcs.filter((s) => s.unidad === u).length })).filter((r) => r.servicios > 0);
  const byType = TYPES.map((t) => ({ name: t, value: monthSvcs.filter((s) => s.tipo === t).reduce((sum, s) => sum + (s.cobro || 0), 0) })).filter((r) => r.value > 0);
  const PIE_COLORS = [c.gold, c.blushDeep];

  const ChartCard = ({ title, subtitle, children, empty }) => (
    <div className="rounded-3xl p-5 mb-4" style={{ background: c.paper, boxShadow: '0 2px 12px rgba(43,41,38,0.04)' }}>
      <div className="mb-3">
        <div className="text-[10px] tracking-[0.2em] font-semibold uppercase" style={{ color: c.gold }}>{subtitle}</div>
        <h3 className="text-lg font-serif mt-0.5" style={{ color: c.charcoal, fontFamily: "'Playfair Display', Georgia, serif" }}>{title}</h3>
      </div>
      {empty ? <div className="py-8 text-center text-sm" style={{ color: c.graytext }}>Sin datos este mes</div> : children}
    </div>
  );

  return (
    <div>
      <Header subtitle="Gráficas" currentUser={currentUser} onOpenMenu={onOpenMenu} />
      <div className="px-6 -mt-2">
        <div className="text-sm mb-5 capitalize" style={{ color: c.graytext, fontStyle: 'italic' }}>{monthLabel(monthKey)}</div>
        <ChartCard title="Ingresos por cleaner" subtitle="ESTE MES" empty={byCleaner.every((r) => r.ingresos === 0)}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCleaner} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: c.charcoal, fontSize: 12, fontWeight: 500 }} width={60} />
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="ingresos" fill={c.gold} radius={[0, 12, 12, 0]}>
                <LabelList dataKey="ingresos" position="right" formatter={(v) => fmtMoney(v)} style={{ fill: c.charcoal, fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Horas trabajadas" subtitle="POR CLEANER" empty={byCleaner.every((r) => r.horas === 0)}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCleaner} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: c.charcoal, fontSize: 12, fontWeight: 500 }} width={60} />
              <Tooltip formatter={(v) => `${v} h`} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="horas" fill={c.blushDeep} radius={[0, 12, 12, 0]}>
                <LabelList dataKey="horas" position="right" formatter={(v) => `${v}h`} style={{ fill: c.charcoal, fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ingresos por tipo" subtitle="DISTRIBUCIÓN" empty={byType.length === 0}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byType} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11, fill: c.charcoal, fontWeight: 600 }}>
                {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke={c.paper} strokeWidth={3} />)}
              </Pie>
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Servicios por unidad" subtitle="ACTIVIDAD" empty={byUnit.length === 0}>
          <ResponsiveContainer width="100%" height={Math.max(180, byUnit.length * 32)}>
            <BarChart data={byUnit} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: c.charcoal, fontSize: 11, fontWeight: 500 }} width={100} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="servicios" fill={c.sage} radius={[0, 12, 12, 0]}>
                <LabelList dataKey="servicios" position="right" style={{ fill: c.charcoal, fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function StockRow({ item, onUpdate }) {
  const low = item.qty < item.min;
  return (
    <div className="rounded-2xl p-4 mb-3 flex items-center gap-3" style={{ background: c.paper, boxShadow: '0 1px 6px rgba(43,41,38,0.04)' }}>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] tracking-[0.2em] font-semibold uppercase" style={{ color: c.graytext }}>{item.cat}</div>
        <div className="font-semibold text-sm truncate" style={{ color: c.charcoal }}>{item.prod}</div>
        <div className="text-xs mt-0.5" style={{ color: c.graytext }}>Mínimo: {item.min} {item.unit}</div>
      </div>
      <div className="flex items-center gap-1 mr-1">
        <button onClick={() => onUpdate(item.id, Math.max(0, item.qty - 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.cream }}>
          <Minus size={13} style={{ color: c.charcoal }} />
        </button>
        <div className="w-10 text-center font-bold text-lg" style={{ color: c.charcoal, fontFamily: "'Playfair Display', Georgia, serif" }}>{item.qty}</div>
        <button onClick={() => onUpdate(item.id, item.qty + 1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.cream }}>
          <Plus size={13} style={{ color: c.charcoal }} />
        </button>
      </div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: low ? c.terraLight : c.sageLight }}>
        {low ? <AlertCircle size={14} style={{ color: c.terra }} /> : <CheckCircle2 size={14} style={{ color: c.sage }} />}
      </div>
    </div>
  );
}

function StockTab({ stockByUnit, stockStorage, updateUnitStock, updateStorage, currentUser, onOpenMenu }) {
  const [section, setSection] = useState('unidades');
  const [selectedUnit, setSelectedUnit] = useState(UNITS[0]);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const currentItems = section === 'unidades' ? (stockByUnit[selectedUnit] || []) : stockStorage;
  const updater = section === 'unidades' ? (id, qty) => updateUnitStock(selectedUnit, id, qty) : updateStorage;
  const totalLow = section === 'unidades'
    ? Object.values(stockByUnit).reduce((sum, arr) => sum + countLow(arr), 0)
    : countLow(stockStorage);

  return (
    <div>
      <Header subtitle="Stock" currentUser={currentUser} onOpenMenu={onOpenMenu} />
      <div className="px-6 -mt-2">
        <div className="flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: c.paper }}>
          <button onClick={() => setSection('unidades')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            style={{ background: section === 'unidades' ? c.charcoal : 'transparent', color: section === 'unidades' ? c.paper : c.graytext }}>
            <Building2 size={13} /> POR UNIDAD
          </button>
          <button onClick={() => setSection('storage')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            style={{ background: section === 'storage' ? c.charcoal : 'transparent', color: section === 'storage' ? c.paper : c.graytext }}>
            <Warehouse size={13} /> STORAGE
          </button>
        </div>

        {section === 'unidades' && (
          <div className="mb-4">
            <div className="text-[10px] tracking-[0.2em] font-semibold uppercase mb-2" style={{ color: c.graytext }}>Unidad seleccionada</div>
            <button
              onClick={() => setShowUnitPicker(true)}
              className="w-full px-4 py-3 rounded-2xl flex items-center justify-between"
              style={{ background: c.paper, border: `1px solid ${c.divider}` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.apricotPale }}>
                  <Building2 size={15} style={{ color: c.apricot }} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold" style={{ color: c.navy }}>{selectedUnit}</div>
                  <div className="text-[10px]" style={{ color: c.graytext }}>Toca para cambiar</div>
                </div>
              </div>
              {countLow(stockByUnit[selectedUnit] || []) > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: c.terraLight, color: c.terra }}>
                  {countLow(stockByUnit[selectedUnit] || [])} bajo
                </span>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] tracking-[0.2em] font-semibold uppercase" style={{ color: c.gold }}>
              {section === 'unidades' ? 'INVENTARIO EN UNIDAD' : 'STORAGE CENTRAL'}
            </div>
            <h2 className="text-xl font-serif" style={{ color: c.charcoal, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {section === 'unidades' ? selectedUnit : 'Bodega'}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: c.graytext }}>{currentItems.length} productos</div>
          </div>
        </div>

        {countLow(currentItems) > 0 && (
          <div className="rounded-2xl p-3 mb-4 flex items-center gap-3" style={{ background: c.terraLight }}>
            <AlertCircle size={16} style={{ color: c.terra }} />
            <div className="text-xs font-semibold" style={{ color: c.terra }}>
              {countLow(currentItems)} {countLow(currentItems) === 1 ? 'producto' : 'productos'} por reordenar aquí
            </div>
          </div>
        )}

        {section === 'unidades' && totalLow > 0 && (
          <div className="text-[11px] mb-3 text-center" style={{ color: c.graytext }}>
            En total, {totalLow} {totalLow === 1 ? 'producto está' : 'productos están'} bajo mínimo en todas las unidades
          </div>
        )}

        {currentItems.map((item) => (<StockRow key={item.id} item={item} onUpdate={updater} />))}
      </div>
      {showUnitPicker && (
        <UnitPickerModal
          units={UNITS}
          stockByUnit={stockByUnit}
          selected={selectedUnit}
          onSelect={(u) => { setSelectedUnit(u); setShowUnitPicker(false); }}
          onClose={() => setShowUnitPicker(false)}
        />
      )}
    </div>
  );
}

function UnitPickerModal({ units, stockByUnit, selected, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const filtered = units.filter((u) => u.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(11,29,74,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[32px] p-6 pt-4 max-h-[85vh] overflow-hidden flex flex-col" style={{ background: c.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 rounded-full mx-auto mb-5" style={{ background: c.divider }} />
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={12} style={{ color: c.apricot }} />
              <span className="text-[10px] tracking-[0.3em] font-semibold" style={{ color: c.apricot }}>UNIDADES</span>
            </div>
            <h2 className="text-2xl font-serif" style={{ color: c.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>Selecciona una</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.cream }}>
            <X size={16} style={{ color: c.navy }} />
          </button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar unidad..."
          className="w-full px-4 py-3 rounded-2xl outline-none mb-3"
          style={{ background: c.cream, border: `1px solid ${c.divider}`, color: c.navy, fontSize: 14 }}
          autoFocus
        />
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: c.graytext }}>Sin coincidencias</div>
          )}
          {filtered.map((u) => {
            const low = countLow(stockByUnit[u] || []);
            const isSelected = u === selected;
            return (
              <button
                key={u}
                onClick={() => onSelect(u)}
                className="w-full rounded-2xl p-3 mb-2 flex items-center gap-3 transition-all"
                style={{
                  background: isSelected ? c.apricotPale : c.cream,
                  border: `1px solid ${isSelected ? c.apricot : 'transparent'}`,
                }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isSelected ? c.apricot : c.paper }}>
                  <Building2 size={14} style={{ color: isSelected ? c.paper : c.apricot }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold" style={{ color: c.navy }}>{u}</div>
                  <div className="text-[10px]" style={{ color: c.graytext }}>
                    {(stockByUnit[u] || []).length} productos
                  </div>
                </div>
                {low > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: c.terraLight, color: c.terra }}>
                    {low} bajo
                  </span>
                )}
                {isSelected && (
                  <CheckCircle2 size={16} style={{ color: c.apricot }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, onAdd, isCleaner }) {
  if (isCleaner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto">
        <div className="mx-4 mb-4 rounded-full px-2 py-2 flex items-center justify-center gap-4" style={{ background: c.navy, boxShadow: '0 8px 32px rgba(11,29,74,0.25)' }}>
          <button onClick={() => setTab('registro')} className="px-5 py-3 flex items-center gap-2">
            <ClipboardList size={18} style={{ color: c.apricot }} />
            <span className="text-xs font-semibold tracking-wide" style={{ color: c.paper }}>MIS SERVICIOS</span>
          </button>
          <button onClick={onAdd} className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: c.apricot, boxShadow: '0 4px 16px rgba(255,181,102,0.4)' }}>
            <Plus size={22} style={{ color: c.paper }} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }
  const items = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'registro', icon: ClipboardList, label: 'Registro' },
    { id: 'graficas', icon: BarChart3, label: 'Gráficas' },
    { id: 'stock', icon: Package, label: 'Stock' },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto">
      <div className="mx-4 mb-4 rounded-full px-2 py-2 flex items-center justify-between" style={{ background: c.navy, boxShadow: '0 8px 32px rgba(11,29,74,0.25)' }}>
        {items.slice(0, 2).map((it) => (
          <button key={it.id} onClick={() => setTab(it.id)} className="flex-1 py-2 flex flex-col items-center gap-0.5" style={{ opacity: tab === it.id ? 1 : 0.5 }}>
            <it.icon size={18} style={{ color: tab === it.id ? c.apricot : c.paper }} />
            <span className="text-[9px] font-semibold tracking-wide" style={{ color: c.paper }}>{it.label}</span>
          </button>
        ))}
        <button onClick={onAdd} className="w-14 h-14 rounded-full flex items-center justify-center mx-2" style={{ background: c.apricot, boxShadow: '0 4px 16px rgba(255,181,102,0.4)' }}>
          <Plus size={22} style={{ color: c.paper }} strokeWidth={2.5} />
        </button>
        {items.slice(2).map((it) => (
          <button key={it.id} onClick={() => setTab(it.id)} className="flex-1 py-2 flex flex-col items-center gap-0.5" style={{ opacity: tab === it.id ? 1 : 0.5 }}>
            <it.icon size={18} style={{ color: tab === it.id ? c.apricot : c.paper }} />
            <span className="text-[9px] font-semibold tracking-wide" style={{ color: c.paper }}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [services, setServices] = useState([]);
  const [stockByUnit, setStockByUnit] = useState(INITIAL_STOCK_BY_UNIT);
  const [stockStorage, setStockStorage] = useState(INITIAL_STOCK_STORAGE);
  const [showAdd, setShowAdd] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authStep, setAuthStep] = useState('role');  // 'role' | 'adminLogin' | 'cleanerLogin'
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await window.storage.get('wg-current-user');
        if (r?.value) {
          const saved = JSON.parse(r.value);
          if (saved.role === 'admin') {
            const matchedKey = Object.keys(USERS).find((k) => k.toLowerCase() === (saved.username || '').toLowerCase());
            if (matchedKey) {
              setCurrentUser({ role: 'admin', username: matchedKey, displayName: USERS[matchedKey].displayName });
            }
          } else if (saved.role === 'cleaner' && CLEANERS.includes(saved.cleanerName)) {
            setCurrentUser({ role: 'cleaner', cleanerName: saved.cleanerName, displayName: saved.cleanerName });
          }
        }
      } catch (e) {}

      // Load from Supabase (cloud-synced)
      const [svcs, byUnit, storage] = await Promise.all([
        fetchAllServices(),
        fetchStockByUnit(UNITS, UNIT_STOCK_TEMPLATE),
        fetchStockStorage(),
      ]);
      setServices(svcs);
      if (byUnit) {
        setStockByUnit(byUnit);
      } else {
        setStockByUnit(INITIAL_STOCK_BY_UNIT);
        seedStockByUnit(UNITS, UNIT_STOCK_TEMPLATE);
      }
      if (storage) {
        setStockStorage(storage);
      } else {
        setStockStorage(INITIAL_STOCK_STORAGE);
        seedStockStorage(INITIAL_STOCK_STORAGE);
      }
      setAuthLoaded(true);
    }
    load();

    // Realtime subscriptions — all clients update within seconds of any change
    const ch = supabase
      .channel('wg-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, async () => {
        setServices(await fetchAllServices());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_by_unit' }, async () => {
        const next = await fetchStockByUnit(UNITS, UNIT_STOCK_TEMPLATE);
        if (next) setStockByUnit(next);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_storage' }, async () => {
        const next = await fetchStockStorage();
        if (next) setStockStorage(next);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  async function handleLogin(user) {
    setCurrentUser(user);
    if (user.role === 'cleaner') setTab('registro');
    try { await window.storage.set('wg-current-user', JSON.stringify(user)); } catch (e) {}
  }
  async function handleLogout() {
    setCurrentUser(null);
    setShowUserMenu(false);
    setAuthStep('role');
    setTab('home');
    try { await window.storage.delete('wg-current-user'); } catch (e) {}
  }

  async function addService(svc) {
    // Optimistic: show immediately, then sync
    setServices([svc, ...services]);
    setShowAdd(false);
    setTab('registro');
    const { error } = await supabase.from('services').insert(svcToDb(svc));
    if (error) { console.error('insert service', error); alert('Error al guardar: ' + error.message); }
  }
  async function updateService(updated) {
    setServices(services.map((s) => s.id === updated.id ? updated : s));
    setEditingService(null);
    setShowAdd(false);
    const { error } = await supabase.from('services').update(svcToDb(updated)).eq('id', updated.id);
    if (error) { console.error('update service', error); alert('Error al actualizar: ' + error.message); }
  }
  async function deleteService(id) {
    setServices(services.filter((s) => s.id !== id));
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) { console.error('delete service', error); }
  }
  function openEdit(svc) {
    setEditingService(svc);
    setShowAdd(true);
  }
  async function updateUnitStock(unitName, id, qty) {
    setStockByUnit({ ...stockByUnit, [unitName]: (stockByUnit[unitName] || []).map((i) => i.id === id ? { ...i, qty } : i) });
    const { error } = await supabase.from('stock_by_unit').update({ qty }).eq('id', id);
    if (error) console.error('update stock_by_unit', error);
  }
  async function updateStorage(id, qty) {
    setStockStorage(stockStorage.map((i) => i.id === id ? { ...i, qty } : i));
    const { error } = await supabase.from('stock_storage').update({ qty }).eq('id', id);
    if (error) console.error('update stock_storage', error);
  }

  const globalStyle = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap');
      select { background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B6560' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1em; padding-right: 2.5rem; }
      input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
    `}</style>
  );

  if (!authLoaded) {
    return <div className="min-h-screen w-full flex items-center justify-center" style={{ background: c.cream }}>{globalStyle}</div>;
  }

  if (!currentUser) {
    return (
      <div>
        {globalStyle}
        {authStep === 'role' && <RoleSelector onPick={(r) => setAuthStep(r === 'admin' ? 'adminLogin' : 'cleanerLogin')} />}
        {authStep === 'adminLogin' && <AdminLogin onLogin={handleLogin} onBack={() => setAuthStep('role')} />}
        {authStep === 'cleanerLogin' && <CleanerLogin onLogin={handleLogin} onBack={() => setAuthStep('role')} />}
      </div>
    );
  }

  const isCleaner = currentUser.role === 'cleaner';
  // Force registro tab for cleaners
  const activeTab = isCleaner ? 'registro' : tab;

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: c.cream }}>
      {globalStyle}
      <div className="w-full max-w-md relative pb-32" style={{ background: c.cream, minHeight: '100vh' }}>
        {!isCleaner && activeTab === 'home' && <HomeTab services={services} setTab={setTab} currentUser={currentUser} onOpenMenu={() => setShowUserMenu(true)} />}
        {activeTab === 'registro' && <RegistroTab services={services} onDelete={deleteService} currentUser={currentUser} onOpenMenu={() => setShowUserMenu(true)} />}
        {!isCleaner && activeTab === 'graficas' && <GraficasTab services={services} currentUser={currentUser} onOpenMenu={() => setShowUserMenu(true)} />}
        {!isCleaner && activeTab === 'stock' && <StockTab stockByUnit={stockByUnit} stockStorage={stockStorage} updateUnitStock={updateUnitStock} updateStorage={updateStorage} currentUser={currentUser} onOpenMenu={() => setShowUserMenu(true)} />}
        <BottomNav tab={activeTab} setTab={setTab} onAdd={() => setShowAdd(true)} isCleaner={isCleaner} />
        {showAdd && <AddServiceModal onClose={() => { setShowAdd(false); setEditingService(null); }} onSave={addService} onUpdate={updateService} currentUser={currentUser} existingService={editingService} />}
        {showUserMenu && <UserMenu user={currentUser} onLogout={handleLogout} onClose={() => setShowUserMenu(false)} />}
      </div>
    </div>
  );
}
