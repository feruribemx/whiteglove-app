import React, { useState, useRef, useEffect } from 'react';
import {
  ClipboardList, Package, Calendar, BarChart3, DollarSign,
  Plus, LogOut, User, Menu, X, Shield, History, Globe,
  ChevronDown, Check, Sparkles, ExternalLink, UserPlus
} from 'lucide-react';
import { initialsOf, hasFullAccess } from '../lib/auth';

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onOpenNewService,
  onOpenAuditLog,
  onOpenAddCleaner,
  onOpenDiagnostics,
  onPreviewLanding,
  lang = 'es',
  setLang,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isCleaner = Boolean(
    currentUser && (
      (currentUser.role || '').toLowerCase() === 'cleaner' ||
      (currentUser.role !== 'admin' && !['fernandouribe', 'michelleadmin', 'fercastil'].includes((currentUser.username || '').toLowerCase()))
    )
  );
  const isAdmin = currentUser?.role === 'admin';
  const showFinances = hasFullAccess(currentUser);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navItems = isCleaner
    ? [
        { id: 'registro', label: lang === 'en' ? 'My Shifts' : 'Mi Registro', icon: ClipboardList },
        { id: 'schedule', label: lang === 'en' ? 'Calendar' : 'Calendario', icon: Calendar },
      ]
    : [
        { id: 'services', label: lang === 'en' ? 'Services' : 'Servicios', icon: ClipboardList },
        { id: 'inventory', label: lang === 'en' ? 'Inventory' : 'Inventario', icon: Package },
        { id: 'schedule', label: lang === 'en' ? 'Schedule' : 'Calendario', icon: Calendar },
        { id: 'payroll', label: lang === 'en' ? 'Payroll' : 'Nómina', icon: DollarSign },
        ...(showFinances ? [{ id: 'analytics', label: lang === 'en' ? 'Finances' : 'Finanzas', icon: BarChart3 }] : []),
      ];

  const toggleLanguage = () => {
    if (setLang) {
      setLang((prev) => (prev === 'es' ? 'en' : 'es'));
    }
  };

  return (
    <>
      {/* Desktop & Tablet Top Bar (Fully adaptive with zero overflow) */}
      <header className="sticky top-0 z-40 bg-[#0B1D4A] text-white border-b border-[#1E3670]/80 shadow-md w-full max-w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Zone */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab(isCleaner ? 'registro' : 'services')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none"
            >
              <img
                src="/logo.webp"
                alt="WhiteGlove"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-sm ring-1 ring-[#FFB566]/40"
              />
              <div className="flex flex-col">
                <span className="font-serif text-base sm:text-lg tracking-wide font-medium text-[#FAF7F1] leading-none group-hover:text-[#FFB566] transition-colors">
                  WhiteGlove
                </span>
                <span className="text-[9px] sm:text-[10px] tracking-widest uppercase text-slate-400 font-medium mt-0.5 hidden xs:block">
                  Suite
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links (Smooth horizontal slide without breaking page margins) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 max-w-2xl mx-1 sm:mx-3 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#1E3670] text-[#FFB566] shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Zone: Quick Capture + Integrated User Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Quick Capture Button (Available for all team members) */}
            {onOpenNewService && (
              <button
                type="button"
                onClick={() => onOpenNewService()}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-[#FFB566] to-[#E89A45] text-[#0B1D4A] font-bold text-xs rounded-xl hover:brightness-105 active:scale-[0.98] transition-all shadow-xs whitespace-nowrap cursor-pointer"
                title={lang === 'en' ? 'New Service Entry' : 'Capturar Nuevo Servicio'}
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">
                  {lang === 'en' ? 'New Service' : 'Capturar Servicio'}
                </span>
                <span className="sm:hidden">
                  {lang === 'en' ? 'New' : 'Capturar'}
                </span>
              </button>
            )}

            {/* UNIFIED USER PROFILE MENU DROPDOWN */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl transition-all border ${
                  userDropdownOpen
                    ? 'bg-[#1E3670] border-[#FFB566]/60 text-white'
                    : 'bg-[#0B1D4A] hover:bg-[#1E3670]/80 border-slate-700/80 text-slate-200'
                }`}
                title="Menú de Usuario & Opciones"
                aria-label="Abrir menú de usuario"
              >
                {/* User Avatar */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E3670] border border-slate-600 flex items-center justify-center text-xs font-bold text-[#FFB566] shrink-0">
                  {initialsOf(currentUser?.displayName || currentUser?.username || 'WG')}
                </div>
                
                {/* User info on desktop */}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[110px]">
                    {currentUser?.displayName || currentUser?.username}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {(currentUser?.username || '').toLowerCase() === 'fercastil'
                      ? (lang === 'en' ? 'Supervisor' : 'Supervisora')
                      : currentUser?.role === 'admin'
                      ? (lang === 'en' ? 'Admin' : 'Administrador')
                      : 'Cleaner'}
                  </span>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180 text-[#FFB566]' : ''}`} />
              </button>

              {/* DROPDOWN POPUP MENU */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#0B1D4A] rounded-2xl border border-slate-700 shadow-2xl py-2 z-50 text-slate-200 divide-y divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  
                  {/* Dropdown Header: User Details */}
                  <div className="px-4 py-3 bg-gradient-to-b from-[#1E3670]/40 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1E3670] border border-[#FFB566]/50 flex items-center justify-center text-sm font-bold text-[#FFB566] shrink-0">
                        {initialsOf(currentUser?.displayName || currentUser?.username || 'WG')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">
                          {currentUser?.displayName || currentUser?.username}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFB566]/20 text-[#FFB566]">
                            <Shield className="w-3 h-3" />
                            <span>
                              {(currentUser?.username || '').toLowerCase() === 'fercastil'
                                ? (lang === 'en' ? 'Supervisor' : 'Supervisora')
                                : currentUser?.role === 'admin'
                                ? (lang === 'en' ? 'Admin' : 'Administrador')
                                : 'Cleaner'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section A: Navigation & Admin Tools */}
                  <div className="p-2 space-y-1">
                    {isAdmin && (
                      <>
                        {onOpenAddCleaner && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onOpenAddCleaner();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1E3670] transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[#FFB566]/20 flex items-center justify-center text-[#FFB566] shrink-0">
                              <UserPlus className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <span className="block font-semibold">
                                {lang === 'en' ? 'Add New Cleaner' : 'Registrar Nuevo Cleaner'}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {lang === 'en' ? 'Register new staff members for shifts & payroll' : 'Agrega un nuevo elemento al equipo de operaciones'}
                              </span>
                            </div>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onOpenAuditLog) onOpenAuditLog();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1E3670] transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-amber-300 shrink-0">
                            <History className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <span className="block font-semibold">
                              {lang === 'en' ? 'Audit Log & Change History' : 'Historial de Auditoría & Cambios'}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {lang === 'en' ? 'Track all registered actions and edits' : 'Monitorea ediciones y servicios capturados'}
                            </span>
                          </div>
                        </button>

                        {onOpenDiagnostics && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onOpenDiagnostics();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1E3670] transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <span className="block font-semibold">
                                {lang === 'en' ? 'Live System Tests & Diagnostics' : 'Pruebas & Diagnóstico del Sistema'}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {lang === 'en' ? 'Run real-time multi-device tests, WhatsApp checks & memory validation' : 'Ejecuta pruebas en vivo de memoria, WhatsApp y Firestore'}
                              </span>
                            </div>
                          </button>
                        )}
                      </>
                    )}

                    {onPreviewLanding && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onPreviewLanding();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1E3670] transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-emerald-400 shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-semibold">
                            {lang === 'en' ? 'Public Landing Website' : 'Ver Portada Web Pública'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {lang === 'en' ? 'Preview the client booking page' : 'Cotizador rápido y catálogo para clientes'}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}
                  </div>

                  {/* Section B: Language Switcher Toggle */}
                  <div className="p-3">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2 px-1">
                      {lang === 'en' ? 'System Language' : 'Idioma del Sistema'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 bg-[#071330] p-1 rounded-xl border border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => {
                          if (setLang) setLang('es');
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          lang === 'es'
                            ? 'bg-[#FFB566] text-[#0B1D4A] shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>🇲🇽 Español</span>
                        {lang === 'es' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (setLang) setLang('en');
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          lang === 'en'
                            ? 'bg-[#FFB566] text-[#0B1D4A] shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>🇨🇦 English</span>
                        {lang === 'en' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    </div>
                  </div>

                  {/* Section C: Logout */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{lang === 'en' ? 'Sign Out / Logout' : 'Cerrar Sesión'}</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl hover:bg-[#1E3670] transition-colors"
              aria-label="Abrir navegación móvil"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1E3670] bg-[#0B1D4A] px-4 pt-2 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-[#1E3670] text-[#FFB566]'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Language Switcher */}
            <div className="pt-2 border-t border-slate-700/80">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5 px-1">
                {lang === 'en' ? 'Language' : 'Idioma'}
              </span>
              <div className="grid grid-cols-2 gap-2 bg-[#071330] p-1 rounded-xl">
                <button
                  onClick={() => { if (setLang) setLang('es'); }}
                  className={`py-1.5 text-xs font-bold rounded-lg ${lang === 'es' ? 'bg-[#FFB566] text-[#0B1D4A]' : 'text-slate-300'}`}
                >
                  Español
                </button>
                <button
                  onClick={() => { if (setLang) setLang('en'); }}
                  className={`py-1.5 text-xs font-bold rounded-lg ${lang === 'en' ? 'bg-[#FFB566] text-[#0B1D4A]' : 'text-slate-300'}`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="pt-2 border-t border-slate-700/80 space-y-1.5">
              {onOpenNewService && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewService();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFB566] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-xs cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{lang === 'en' ? 'New Service Entry' : 'Capturar Nuevo Servicio'}</span>
                </button>
              )}

              {isAdmin && (
                <>

                  {onOpenAddCleaner && (
                    <button
                      onClick={() => {
                        onOpenAddCleaner();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 rounded-xl"
                    >
                      <UserPlus className="w-4 h-4 text-[#FFB566]" />
                      <span>{lang === 'en' ? 'Register New Cleaner' : 'Registrar Nuevo Cleaner'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (onOpenAuditLog) onOpenAuditLog();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 rounded-xl"
                  >
                    <History className="w-4 h-4 text-amber-300" />
                    <span>{lang === 'en' ? 'Audit Log & Changes' : 'Historial de Auditoría & Cambios'}</span>
                  </button>
                </>
              )}

              {onPreviewLanding && (
                <button
                  onClick={() => {
                    onPreviewLanding();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 rounded-xl"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'en' ? 'View Public Website' : 'Ver Portada Web Pública'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/30 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'en' ? 'Sign Out' : 'Cerrar Sesión'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Tab Bar (Thumb Zone) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1D4A]/95 backdrop-blur-md border-t border-slate-700/80 px-2 py-1 max-w-full">
        <div className="flex items-center justify-around h-14">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-2 py-1 transition-colors ${
                  isActive ? 'text-[#FFB566]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
