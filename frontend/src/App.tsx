import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import BudgetPage from './pages/BudgetPage';
import AutoWordPage from './pages/AutoWordPage';
import AuthModal from './components/AuthModal';
import { getStoredUser, clearStoredUser, type AuthUser } from './utils/auth';
import { Calculator, FileText, Menu, X, User, LogOut } from 'lucide-react';

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
      <div className="min-h-screen bg-[#fbfcfd] flex text-slate-700">
        {/* Auth Access Gate Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onSuccess={handleLoginSuccess}
        />

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#fbfcfd]/75 backdrop-blur-xl border-r border-slate-200/60 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="h-20 flex items-center px-8 border-b border-slate-200/60 bg-transparent">
            <h1 className="text-2xl font-black tracking-wider uppercase font-display">
              สบร. <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Unified</span>
            </h1>
            <button 
              className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100" 
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="p-6 space-y-4 flex-1">
            <NavLink
              to="/"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'shadow-neumorph-inset bg-[#f1f5f9]/50 text-blue-600 font-bold border border-white' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-[#fbfcfd] hover:shadow-neumorph border border-transparent'
                }`
              }
            >
              <Calculator className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">ระบบประมาณค่าใช้จ่ายกิจกรรม</span>
            </NavLink>

            <NavLink
              to="/auto-word"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'shadow-neumorph-inset bg-[#f1f5f9]/50 text-indigo-600 font-bold border border-white' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-[#fbfcfd] hover:shadow-neumorph border border-transparent'
                }`
              }
            >
              <FileText className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-medium">ระบบเอกสารอัตโนมัติ</span>
            </NavLink>
          </nav>

          {/* Logged in User Profile Footer */}
          {currentUser && (
            <div className="p-4 mx-4 mb-3 bg-slate-100/70 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0) : <User className="w-4 h-4" />}
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
                title="ออกจากระบบ / เปลี่ยนอีเมล"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Footer Info */}
          <div className="p-6 border-t border-slate-200/60 bg-transparent text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SBR Dashboard 2026</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Executive View v1.2</p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
          <header className="h-16 bg-[#fbfcfd] border-b border-slate-200/60 flex items-center px-6 lg:hidden shrink-0 justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="ml-4 font-black text-slate-800 tracking-wider">สบร. UNIFIED</span>
            </div>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            )}
          </header>
          
          <main className="flex-1 overflow-auto bg-transparent p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<BudgetPage />} />
              <Route path="/auto-word" element={<AutoWordPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}

