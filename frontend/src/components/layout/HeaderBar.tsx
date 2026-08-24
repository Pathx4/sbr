import React, { useState, useEffect } from 'react';
import { 
  Clock, Search, Maximize2, Minimize2, Sparkles, HelpCircle, 
  User, LogOut, ChevronDown, Menu 
} from 'lucide-react';
import type { AuthUser } from '../../utils/auth';

interface HeaderBarProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentUser,
  onLogout,
  onOpenCommandPalette,
  onToggleSidebar,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      
      const dayName = thaiDays[now.getDay()];
      const day = now.getDate();
      const month = thaiMonths[now.getMonth()];
      const year = now.getFullYear() + 543;
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      setDateStr(`วัน${dayName}ที่ ${day} ${month} ${year}`);
      setTimeStr(`${hours}:${minutes}:${seconds} น.`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Mobile Menu Toggle & System Info */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors lg:hidden"
              title="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Thai Date & Live Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-slate-800">{dateStr}</span>
            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60">
              {timeStr}
            </span>
          </div>

          {/* System Ready Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ระบบออนไลน์ • พร้อมทำงาน</span>
          </div>
        </div>

        {/* Center / Right: Quick Search Button & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-xl bg-slate-100/90 hover:bg-blue-50/80 text-slate-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 transition-all text-xs font-medium group shadow-xs"
            title="กด Ctrl + K เพื่อค้นหาด่วน"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="hidden md:inline">ค้นหาคำสั่ง หรือ รายชื่อบุคลากร...</span>
            <span className="md:hidden">ค้นหา...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold font-mono bg-white text-slate-500 border border-slate-200 rounded shadow-xs">
              Ctrl K
            </kbd>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition-colors border border-transparent hover:border-slate-200 hidden sm:flex items-center justify-center"
            title={isFullscreen ? 'ย่อหน้าจอปกติ' : 'ขยายเต็มจอ (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Shortcuts Help Modal Trigger */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-colors border border-transparent hover:border-blue-200 hidden sm:flex items-center justify-center"
            title="ดูคีย์ลัด (Keyboard Shortcuts)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Profile Pill / Menu */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-2xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {currentUser.name ? currentUser.name.charAt(0) : <User className="w-4 h-4" />}
                </div>
                <div className="hidden xl:block min-w-0 pr-1">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {currentUser.position || 'บุคลากร สทอภ.'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
              </button>

              {/* User Dropdown Popover */}
              {showUserMenu && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-3 z-50 animate-slide-up space-y-2"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <p className="text-[10px] text-blue-600 font-semibold mt-1">
                      {currentUser.position || 'บุคลากร สทอภ.'}
                    </p>
                  </div>

                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 p-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ออกจากระบบ / สลับบัญชี</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Shortcuts Helper Modal */}
      {showShortcutsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">คีย์ลัดด่วน (Keyboard Shortcuts)</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { keys: ['Ctrl', 'K'], desc: 'เปิด Spotlight ค้นหาด่วน & เรียกคำสั่ง' },
                { keys: ['ESC'], desc: 'ปิดหน้าต่างโมดอล / ล้างการค้นหา' },
                { keys: ['Alt', '1'], desc: 'ไปหน้าประมาณการงบประมาณ' },
                { keys: ['Alt', '2'], desc: 'ไปหน้าจัดซื้อจัดจ้าง & สแกนบิล' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, j) => (
                      <kbd key={j} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md shadow-xs font-mono font-bold text-slate-800 text-[11px]">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
};
