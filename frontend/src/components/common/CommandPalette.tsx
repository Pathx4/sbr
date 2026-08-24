import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Calculator, FileText, Sparkles, User, Maximize2, 
  X, Command, CornerDownLeft
} from 'lucide-react';
import contactsData from '../../data/contacts.json';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (actionId: string, payload?: any) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'ระบบหลัก' | 'เทมเพลตด่วน' | 'ค้นหาบุคลากร' | 'เครื่องมือ';
  icon: any;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Base list of commands
  const defaultCommands: CommandItem[] = [
    {
      id: 'nav-budget',
      title: 'ระบบประมาณค่าใช้จ่ายกิจกรรม (Budget Estimator)',
      category: 'ระบบหลัก',
      icon: Calculator,
      badge: 'หน้าระบบ',
      action: () => {
        navigate('/');
        onClose();
      },
    },
    {
      id: 'nav-autoword',
      title: 'ระบบรายงานขอซื้อขอจ่าย (Tax Invoice & OCR)',
      category: 'ระบบหลัก',
      icon: FileText,
      badge: 'หน้าระบบ',
      action: () => {
        navigate('/auto-word');
        onClose();
      },
    },
    {
      id: 'preset-training',
      title: 'โหลดตัวอย่าง: จัดอบรม 3 วัน 30 คน (ระเบียบ สทอภ.)',
      category: 'เทมเพลตด่วน',
      icon: Sparkles,
      badge: '1-Click Starter',
      action: () => {
        navigate('/');
        if (onSelectAction) onSelectAction('load-preset-training');
        onClose();
      },
    },
    {
      id: 'preset-meeting',
      title: 'โหลดตัวอย่าง: ประชุมราชการ 1 วัน 15 คน',
      category: 'เทมเพลตด่วน',
      icon: Sparkles,
      badge: '1-Click Starter',
      action: () => {
        navigate('/');
        if (onSelectAction) onSelectAction('load-preset-meeting');
        onClose();
      },
    },
    {
      id: 'preset-fieldtrip',
      title: 'โหลดตัวอย่าง: ออกเดินทางภาคสนาม 2 วัน',
      category: 'เทมเพลตด่วน',
      icon: Sparkles,
      badge: '1-Click Starter',
      action: () => {
        navigate('/');
        if (onSelectAction) onSelectAction('load-preset-fieldtrip');
        onClose();
      },
    },
    {
      id: 'action-fullscreen',
      title: 'สลับโหมดเต็มจอ (Toggle Fullscreen Mode)',
      category: 'เครื่องมือ',
      icon: Maximize2,
      badge: 'มุมมอง',
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        onClose();
      },
    },
  ];

  // Dynamic Contact Search items
  const contactCommands: CommandItem[] = (contactsData as any[])
    .filter((c) => {
      if (!query.trim()) return false;
      const q = query.toLowerCase();
      return (
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.position || '').toLowerCase().includes(q) ||
        String(c.section || '').toLowerCase().includes(q) ||
        String(c.email || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 8)
    .map((c, idx) => ({
      id: `contact-${idx}`,
      title: `${c.name} — ${c.position || ''} (${c.section || 'สทอภ.'})`,
      category: 'ค้นหาบุคลากร' as const,
      icon: User,
      badge: c.nickname ? `(${c.nickname})` : undefined,
      action: () => {
        // If on auto-word page, can pass contact
        if (onSelectAction) onSelectAction('select-contact', c);
        onClose();
      },
    }));

  const filteredCommands = query.trim()
    ? [
        ...defaultCommands.filter((cmd) =>
          cmd.title.toLowerCase().includes(query.toLowerCase())
        ),
        ...contactCommands,
      ]
    : defaultCommands;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="flex items-center gap-3.5 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์คำสั่ง ค้นหาหน้า หรือค้นหารายชื่อบุคลากร สทอภ...."
            className="flex-1 bg-transparent text-slate-800 text-sm md:text-base font-medium placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-400 bg-white border border-slate-200 rounded-lg shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-blue-50/90 text-blue-900 border border-blue-200/80 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate">{cmd.title}</p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        หมวดหมู่: {cmd.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.badge && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shadow-xs">
                        {cmd.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-4 h-4 text-blue-600 hidden sm:inline-block" />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <p className="text-sm font-semibold">ไม่พบคำสั่งหรือข้อมูลที่ตรงกับ "{query}"</p>
              <p className="text-xs">ลองค้นหาด้วยคำอื่น เช่น 'อบรม', 'ประชุม', 'Excel', หรือชื่อเจ้าหน้าที่</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-xs font-bold text-slate-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-xs font-bold text-slate-600">↓</kbd>
              เลื่อนเลือก
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-xs font-bold text-slate-600">Enter</kbd>
              ตกลง
            </span>
          </div>
          <span className="flex items-center gap-1 font-mono text-[10px] text-blue-600 font-bold">
            <Command className="w-3 h-3" /> Quick Access v2.0
          </span>
        </div>
      </div>
    </div>
  );
};
