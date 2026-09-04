import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, Sparkles, KeyRound } from 'lucide-react';
import { type AuthUser, loginWithCredentials } from '../utils/auth';

interface AuthGateProps {
  onSuccess: (user: AuthUser, token: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPasscode = passcode.trim();

    if (!cleanEmail) {
      setError('กรุณากรอกอีเมลสำหรับเข้าใช้งาน');
      return;
    }

    if (!cleanPasscode) {
      setError('กรุณากรอกรหัสผ่านเข้าใช้งาน');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { user, token } = await loginWithCredentials(cleanEmail, cleanPasscode, rememberMe);
      onSuccess(user, token);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl p-8 sm:p-10 relative z-10 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/25 ring-2 ring-blue-500/20 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SBR Unified Tools • GISTDA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            เข้าสู่ระบบรักษาความปลอดภัย
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            ระบบบริหารงบประมาณ & เอกสารจัดซื้ออัตโนมัติ (สบร.)
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-300 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-red-200">ตรวจสอบไม่ผ่าน: </span>
              {error}
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              อีเมล (Organization Email)
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น name@gistda.or.th หรือ username"
                autoComplete="email"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Passcode / Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              รหัสผ่านเข้าใช้งาน (Access Password)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="ป้อนรหัสผ่านเข้าใช้งานระบบ"
                autoComplete="current-password"
                required
                className="w-full pl-12 pr-12 py-3.5 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center gap-3 bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800/60">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500/30 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs text-slate-300 select-none cursor-pointer flex-1">
              <span className="font-semibold text-white">จำการเข้าสู่ระบบบนเครื่องนี้</span>
              <span className="block text-[11px] text-slate-400">บันทึก Session ปลอดภัย ไม่ต้องล็อกอินซ้ำ</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังตรวจสอบสิทธิ์ความปลอดภัย...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>เข้าสู่ระบบ SBR</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-8 pt-5 border-t border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            🛡️ ระบบป้องกันความปลอดภัยสองชั้น (Cryptographic Token + Zero DOM Leak)
          </p>
        </div>
      </div>
    </div>
  );
};
