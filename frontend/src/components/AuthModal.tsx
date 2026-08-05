import React, { useState } from 'react';
import { Mail, ShieldCheck, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { type AuthUser, setStoredUser } from '../utils/auth';
import contactsData from '../data/contacts.json';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: AuthUser) => void;
}

// Strictly allowed emails and nicknames (Only Pakim + 4 team members)
const ALLOWED_USERS = [
  'pakimthamthung@gmail.com',
  'siripak@gistda.or.th',
  'thanthiya@gistda.or.th',
  'watcharee@gistda.or.th',
  'wageeporn@gistda.or.th',
  'siripak',
  'thanthiya',
  'watcharee',
  'wageeporn',
  'ปูปู้',
  'เลิฟ',
  'หนิง',
  'โฟร์ค',
  'โฟล์ค',
  'pupu',
  'love',
  'ning',
  'folk',
];

export default function AuthModal({ isOpen, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputStr = email.trim();
    const cleanInput = inputStr.toLowerCase();

    if (!cleanInput) {
      setError('กรุณากรอกอีเมล');
      return;
    }

    setLoading(true);
    setError(null);

    setTimeout(() => {
      try {
        const username = cleanInput.split('@')[0];

        // Strict Check: Must be in ALLOWED_USERS list
        const isAllowed = ALLOWED_USERS.some(
          (item) => item.toLowerCase() === cleanInput || item.toLowerCase() === username
        );

        if (!isAllowed) {
          setError('ไม่มีสิทธิ์เข้าใช้งานระบบนี้ (อนุญาตเฉพาะบุคคลที่ได้รับอนุมัติเท่านั้น)');
          setLoading(false);
          return;
        }

        // Search client-side contacts list for official profile
        const normalizedInput = cleanInput === 'โฟร์ค' ? 'โฟล์ค' : cleanInput;

        const matchedContact = (contactsData as any[]).find((c) => {
          const cName = String(c.name || '').toLowerCase();
          const cEmail = String(c.email || '').toLowerCase();
          const rawEmails = cEmail.split(/\s+/);
          
          // Match email or username prefix
          const emailMatch = cEmail && rawEmails.some((em: string) => em === cleanInput || em.split('@')[0] === username);
          
          // Match nickname in parentheses or full name
          const nicknameMatch = cName.includes(`(${normalizedInput})`) || (normalizedInput.length >= 2 && cName.includes(normalizedInput));

          return emailMatch || nicknameMatch;
        });

        let user: AuthUser | null = null;

        if (matchedContact) {
          const primaryEmail = matchedContact.email ? String(matchedContact.email).split(/\s+/)[0] : `${username}@gistda.or.th`;
          user = {
            name: matchedContact.name,
            nickname: matchedContact.name.match(/\(([^)]+)\)/)?.[1] || null,
            position: matchedContact.position || 'บุคลากร สทอภ.',
            email: cleanInput.includes('@') ? cleanInput : primaryEmail,
            section: matchedContact.section || 'สทอภ.',
            is_head: matchedContact.is_head || false,
          };
        } else if (cleanInput.includes('pakimthamthung')) {
          user = {
            name: 'คุณ Pakim (ผู้ดูแลระบบ)',
            nickname: 'Pakim',
            position: 'ผู้ดูแลระบบ / นักศึกษาฝึกงาน',
            email: cleanInput,
            section: 'สทอภ.',
            is_head: true,
          };
        } else {
          // Fallback for allowed user
          user = {
            name: inputStr,
            position: 'บุคลากร สทอภ.',
            email: cleanInput.includes('@') ? cleanInput : `${cleanInput}@gistda.or.th`,
            section: 'สทอภ.',
            is_head: false,
          };
        }

        if (user) {
          setStoredUser(user, rememberMe);
          onSuccess(user);
        } else {
          setError('ไม่มีสิทธิ์เข้าใช้งานระบบนี้');
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl max-w-md w-full p-8 overflow-hidden relative">
        {/* Top Decorative Banner */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-4">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            ยืนยันตัวตนก่อนเข้าใช้งาน
          </h2>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            กรุณากรอกอีเมลองค์กรของคุณ เพื่อเข้าสู่ระบบจัดสรรงบประมาณและเอกสารอัตโนมัติ
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-4 bg-red-50/80 border border-red-200/80 rounded-2xl flex items-start gap-3 text-red-700 text-xs leading-relaxed animate-shake">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              อีเมล (Email)
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น name@gistda.or.th"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500/20 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs text-slate-600 select-none cursor-pointer flex-1">
              <span className="font-semibold text-slate-800">จำการเข้าสู่ระบบของฉันไว้ในเครื่องนี้</span>
              <span className="block text-[11px] text-slate-400">ถ้าไม่ติ๊ก เมื่อปิดเว็บจะต้องกรอกใหม่</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังตรวจสอบ...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            ระบบจำกัดสิทธิ์เฉพาะบุคลากรภายในและนักศึกษาฝึกงาน สทอภ.
          </p>
        </div>
      </div>
    </div>
  );
}
