import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BudgetPage from './pages/BudgetPage';
import AutoWordPage from './pages/AutoWordPage';
import AuthModal from './components/AuthModal';
import { HeaderBar } from './components/layout/HeaderBar';
import { CommandPalette } from './components/common/CommandPalette';
import { getStoredUser, clearStoredUser, type AuthUser } from './utils/auth';
import { Calculator, FileText, X, User, LogOut, Sparkles, Zap } from 'lucide-react';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.995 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<BudgetPage />} />
          <Route path="/auto-word" element={<AutoWordPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(!currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      setIsAuthOpen(true);
    }
  }, [currentUser]);

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, Alt+1, Alt+2, Ctrl+1, Ctrl+2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Spotlight Search: Ctrl+K / Cmd+K / Alt+K (supports EN 'k', TH 'า', and e.code 'KeyK')
      const isKKey = e.code === 'KeyK' || e.key?.toLowerCase() === 'k' || e.key === 'า';
      if ((e.ctrlKey || e.metaKey || e.altKey) && isKKey) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      // Check if user is typing in an active text input or editable element
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      );

      // 2. Navigate to Budget: Alt+1 / Ctrl+1 (supports Digit1, Numpad1, '1', 'ๅ', '๑')
      const is1Key = e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1' || e.key === 'ๅ' || e.key === '๑';
      if ((e.altKey || (e.ctrlKey && !isTyping)) && is1Key) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/');
        setSidebarOpen(false);
        return;
      }

      // 3. Navigate to AutoWord: Alt+2 / Ctrl+2 (supports Digit2, Numpad2, '2', '/', '๒')
      const is2Key = e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2' || e.key === '/' || e.key === '๒';
      if ((e.altKey || (e.ctrlKey && !isTyping)) && is2Key) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/auto-word');
        setSidebarOpen(false);
        return;
      }
    };

    // Use capture phase (true) so the window catches the keydown event reliably
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [navigate]);


  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    clearStoredUser();
    setCurrentUser(null);
    setIsAuthOpen(true);
  };

  const handleCommandAction = (actionId: string) => {
    if (actionId.startsWith('load-preset-')) {
      const presetType = actionId.replace('load-preset-', '');
      window.dispatchEvent(new CustomEvent('sbr-load-quick-preset', { detail: { type: presetType } }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-800 antialiased font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Auth Access Gate Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onSuccess={handleLoginSuccess}
      />

      {/* Global Command Palette (Spotlight Search) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectAction={handleCommandAction}
      />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 shadow-xs transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100/90 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight text-slate-900 leading-none font-display">
                  สบร. <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">UNIFIED</span>
                </h1>
                <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-blue-100 text-blue-700 uppercase tracking-wide">
                  v2.5
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-1">ระบบบริหารและจัดทำเอกสาร</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="p-4 space-y-2 flex-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            ระบบงานหลัก (Modules)
          </div>

          <NavLink
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50/90 text-blue-700 font-bold shadow-xs border border-blue-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 border border-transparent font-medium'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100/70 text-blue-600 group-hover:scale-105 transition-transform shadow-xs">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs sm:text-sm font-bold block">ประมาณการค่าใช้จ่าย</span>
                <span className="text-[10px] text-slate-400 block font-normal">ฝึกอบรม • ประชุม • ภาคสนาม</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 hidden sm:inline-block">
              Alt+1
            </span>
          </NavLink>

          <NavLink
            to="/auto-word"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50/90 text-indigo-700 font-bold shadow-xs border border-indigo-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 border border-transparent font-medium'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100/70 text-indigo-600 group-hover:scale-105 transition-transform shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs sm:text-sm font-bold block">เอกสารขอซื้อ/ขอจ้าง</span>
                <span className="text-[10px] text-slate-400 block font-normal">สแกน OCR • Word • Excel</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 hidden sm:inline-block">
              Alt+2
            </span>
          </NavLink>

          {/* Quick Spotlight Shortcut Card in Sidebar */}
          <div className="pt-4">
            <div 
              onClick={() => setIsCommandOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200/60 hover:border-blue-300 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>Spotlight Quick Search</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                กด <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-700 shadow-xs">Ctrl + K</kbd> เพื่อค้นหารายชื่อบุคลากรหรือโหลดเทมเพลตด่วน
              </p>
            </div>
          </div>
        </nav>

        {/* Logged in User Profile Footer */}
        {currentUser && (
          <div className="p-3.5 mx-3.5 mb-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  {currentUser.name ? currentUser.name.charAt(0) : <User className="w-4 h-4" />}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate" title={currentUser.name}>
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 truncate" title={currentUser.position}>
                  {currentUser.position || currentUser.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="ออกจากระบบ / สลับบัญชี"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-100 text-center bg-slate-50/40">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider font-display uppercase">SBR Unified Workspace</p>
          <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Executive Light Release 2026</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
        {/* Top HeaderBar with Live Thai Clock & Search */}
        <HeaderBar
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenCommandPalette={() => setIsCommandOpen(true)}
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <AnimatedRoutes />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <MainLayout />
    </HashRouter>
  );
}
