import React, { useState } from 'react';
import { Shield, Sparkles, User, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { verifyAdminLogin } from '../lib/auth';

export default function LoginView({ onLoginSuccess, cleanersList, onVerifyCleanerPassword, onBackToLanding }) {
  const [role, setRole] = useState(null); // null, 'admin', 'cleaner'
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [selectedCleaner, setSelectedCleaner] = useState('');
  const [cleanerPass, setCleanerPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const user = await verifyAdminLogin(adminUser, adminPass);
      if (user) {
        onLoginSuccess(user);
      } else {
        setErrorMsg('Usuario o contraseña de administrador incorrectos.');
      }
    } catch (err) {
      setErrorMsg('Error al verificar credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedCleaner) {
      setErrorMsg('Por favor selecciona tu nombre.');
      return;
    }

    setLoading(true);
    try {
      const ok = await onVerifyCleanerPassword(selectedCleaner, cleanerPass);
      if (ok) {
        onLoginSuccess({
          username: selectedCleaner,
          displayName: selectedCleaner,
          role: 'cleaner',
        });
      } else {
        setErrorMsg('Contraseña incorrecta para el cleaner seleccionado.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión al verificar cleaner.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        
        {/* Luxury Brand Header */}
        <div className="bg-[#0B1D4A] p-8 text-center text-white relative">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="absolute left-4 top-4 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portada</span>
            </button>
          )}

          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white p-1 shadow-lg ring-2 ring-[#FFB566]/40">
            <img
              src="/logo.webp"
              alt="WhiteGlove"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="font-serif text-2xl font-medium tracking-wide text-[#FAF7F1]">
            WhiteGlove
          </h1>
          <p className="text-xs tracking-widest uppercase text-slate-300 font-medium mt-1">
            Portal Operativo y Administrativo
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!role ? (
            /* Role Selection */
            <div className="space-y-4 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Selecciona tu perfil de acceso
              </span>

              <button
                onClick={() => { setRole('admin'); setErrorMsg(''); }}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#0B1D4A] hover:bg-slate-50 transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0B1D4A]/10 text-[#0B1D4A] flex items-center justify-center group-hover:bg-[#0B1D4A] group-hover:text-white transition-colors">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">Administrador / Supervisor</h3>
                    <p className="text-xs text-slate-500">Gestión de servicios, nóminas, finanzas y almacén</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setRole('cleaner'); setErrorMsg(''); }}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#0B1D4A] hover:bg-slate-50 transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">Personal Operativo / Cleaner</h3>
                    <p className="text-xs text-slate-500">Consulta de turnos asignados y registro de horas</p>
                  </div>
                </div>
              </button>
            </div>
          ) : role === 'admin' ? (
            /* Admin Login Form */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">Acceso Administrativo</span>
                <button
                  type="button"
                  onClick={() => { setRole(null); setErrorMsg(''); }}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Fernandouribe"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#0B1D4A] hover:bg-[#1E3670] text-white font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </form>
          ) : (
            /* Cleaner Login Form */
            <form onSubmit={handleCleanerSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">Acceso de Cleaner</span>
                <button
                  type="button"
                  onClick={() => { setRole(null); setErrorMsg(''); }}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Selecciona tu Nombre</label>
                <select
                  value={selectedCleaner}
                  onChange={(e) => setSelectedCleaner(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A] bg-white font-medium"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {cleanersList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clave de Acceso</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Ingresa tu clave"
                    value={cleanerPass}
                    onChange={(e) => setCleanerPass(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#0B1D4A] hover:bg-[#1E3670] text-white font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Entrar a Mi Panel'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
