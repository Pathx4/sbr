import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import BudgetPage from './pages/BudgetPage';
import AutoWordPage from './pages/AutoWordPage';
import { Calculator, FileText, Menu, X } from 'lucide-react';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#fbfcfd] flex text-slate-700">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#fbfcfd]/75 backdrop-blur-xl border-r border-slate-200/60 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
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
              <span className="text-sm font-medium">ระบบจัดสรรงบประมาณ</span>
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

          {/* Footer Info */}
          <div className="p-6 border-t border-slate-200/60 bg-transparent text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SBR Dashboard 2026</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Executive View v1.2</p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
          <header className="h-16 bg-[#fbfcfd] border-b border-slate-200/60 flex items-center px-6 lg:hidden shrink-0">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="ml-4 font-black text-slate-800 tracking-wider">สบร. UNIFIED</span>
          </header>
          
          <main className="flex-1 overflow-auto bg-transparent p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<BudgetPage />} />
              <Route path="/auto-word" element={<AutoWordPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
