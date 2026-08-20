import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BudgetPage from './pages/BudgetPage';
import AutoWordPage from './pages/AutoWordPage';
import AuthModal from './components/AuthModal';
import { getStoredUser, clearStoredUser, type AuthUser } from './utils/auth';
import { Calculator, FileText, Menu, X, User, LogOut, Sparkles } from 'lucide-react';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
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

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(!currentUser);

  useEffect(() => {
    if (!currentUser) {
      setIsAuthOpen(true);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    clearStoredUser();
    setCurrentUser(null);
    setIsAuthOpen(true);
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#f8fafc] flex text-slate-800 antialiased font-sans selection:bg-blue-100 selection:text-blue-900">
        {/* Auth Access Gate Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onSuccess={handleLoginSuccess}
        />

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-xs transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="h-20 flex items-center px-7 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                  สบร. <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Unified</span>
                </h1>
                <p className="text-[11px] font-medium text-slate-400">ระบบบริหารและจัดทำเอกสาร</p>
              </div>
            </div>
            <button
              className="ml-auto lg:hidden text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-5 space-y-2 flex-1">
            <NavLink
              to="/"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive
                  ? 'bg-blue-50/80 text-blue-700 font-bold shadow-xs border border-blue-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium'
                }`
              }
            >
              <div className="p-2 rounded-xl bg-blue-100/60 text-blue-600 group-hover:scale-105 transition-transform">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="text-sm">ประมาณการค่าใช้จ่าย</span>
            </NavLink>

            <NavLink
              to="/auto-word"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive
                  ? 'bg-indigo-50/80 text-indigo-700 font-bold shadow-xs border border-indigo-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium'
                }`
              }
            >
              <div className="p-2 rounded-xl bg-indigo-100/60 text-indigo-600 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm">เอกสารขอซื้อ/ขอจ้าง</span>
            </NavLink>
          </nav>

          {/* Logged in User Profile Footer */}
          {currentUser && (
            <div className="p-4 mx-4 mb-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
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
                  <p className="text-[11px] text-slate-500 truncate" title={currentUser.position}>
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
          <div className="p-5 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">SBR DASHBOARD 2026</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Executive Light v2.0</p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
          <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center px-6 lg:hidden shrink-0 justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-bold text-slate-900 tracking-tight">สบร. Unified</span>
            </div>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            )}
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <AnimatedRoutes />
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
