import React, { useState, useRef } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { 
  Download, Copy, Check, X, Image as ImageIcon, ShieldCheck 
} from 'lucide-react';
import { bahttext } from 'bahttext';
import type { BudgetFormData } from '../../types';

interface ExecutiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: BudgetFormData;
  totalBudget: number;
  breakdown: {
    food: number;
    speaker: number;
    room: number;
    allowance: number;
    transport: number;
    other: number;
  };
}

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryModalProps> = ({
  isOpen,
  onClose,
  formData,
  totalBudget,
  breakdown,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'navy' | 'violet' | 'emerald' | 'dark'>('navy');

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2, // High resolution for presentation slides
      });
      const link = document.createElement('a');
      link.download = `สรุปงบประมาณ_${formData.projectName || 'โครงการ'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const blob = await toBlob(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
      });
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy image to clipboard', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Theme color maps
  const themeStyles = {
    navy: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white border-blue-500/30',
    violet: 'bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white border-purple-500/30',
    emerald: 'bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-950 text-white border-emerald-500/30',
    dark: 'bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900 text-white border-zinc-700/50',
  };

  const themeAccent = {
    navy: 'from-blue-400 to-cyan-300',
    violet: 'from-purple-400 to-pink-300',
    emerald: 'from-emerald-400 to-teal-300',
    dark: 'from-amber-300 to-yellow-200',
  };

  const attendeesCount = parseInt(formData.totalAttendees || formData.staffCount) || 0;
  const daysCount = parseInt(formData.days) || 1;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/80 space-y-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-display">
                ภาพการ์ดสรุปงบประมาณ (Executive Slide Card)
              </h3>
              <p className="text-xs text-slate-500">สร้างภาพ 16:9 ความละเอียดสูง สำหรับสไลด์ PowerPoint หรือแชร์ใน LINE</p>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">ธีม:</span>
            {[
              { id: 'navy', name: 'Navy', bg: 'bg-blue-600' },
              { id: 'violet', name: 'Violet', bg: 'bg-purple-600' },
              { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600' },
              { id: 'dark', name: 'Dark', bg: 'bg-zinc-800' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`w-6 h-6 rounded-full ${t.bg} transition-all ${
                  theme === t.id ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'opacity-60 hover:opacity-100'
                }`}
                title={`ธีม ${t.name}`}
              />
            ))}
            <button 
              onClick={onClose}
              className="ml-2 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 16:9 Presentation Card Container to Render as Image */}
        <div className="flex justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/50 p-2 sm:p-4">
          <div
            ref={cardRef}
            className={`w-full max-w-[800px] aspect-[16/9] min-h-[420px] rounded-3xl p-6 sm:p-8 flex flex-col justify-between border shadow-2xl relative overflow-hidden select-none ${themeStyles[theme]}`}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Sarabun', sans-serif" }}
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar: Organization & Activity Badge */}
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-white/90 border border-white/15">
                    {formData.activityType === 'training' ? '🎓 โครงการฝึกอบรม' : formData.activityType === 'meeting' ? '💼 การจัดประชุมราชการ' : '🚗 การปฏิบัติงานภาคสนาม'}
                  </div>
                  {formData.regulation && (
                    <span className="text-[10px] text-white/60">
                      • {formData.regulation}
                    </span>
                  )}
                </div>
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight line-clamp-2 drop-shadow-sm pt-1">
                  {formData.projectName || 'โครงการประมาณการงบประมาณประจำปี'}
                </h1>
              </div>

              <div className="shrink-0 text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white/90">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                  <span>สทอภ. (GISTDA)</span>
                </div>
              </div>
            </div>

            {/* Center: Grand Total & BahtText */}
            <div className="relative z-10 my-auto py-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold block">
                    ยอดรวมงบประมาณทั้งสิ้น (Grand Total Estimated)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight bg-gradient-to-r ${themeAccent[theme]} bg-clip-text text-transparent`}>
                      ฿ {totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-white/70 font-semibold">บาท</span>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-xl bg-white/10 text-cyan-200 text-xs font-bold border border-white/15">
                    ({bahttext(totalBudget)})
                  </span>
                </div>
              </div>

              {/* Quick Metrics Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <span className="text-[10px] text-white/60 block">ระยะเวลา</span>
                  <span className="text-xs sm:text-sm font-bold text-white">{daysCount} วัน</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <span className="text-[10px] text-white/60 block">ผู้เข้าร่วม</span>
                  <span className="text-xs sm:text-sm font-bold text-white">{attendeesCount} คน</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <span className="text-[10px] text-white/60 block">วันที่จัดงาน</span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block">
                    {formData.startDate || 'ตามกำหนดการ'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <span className="text-[10px] text-white/60 block">เฉลี่ยต่อคน/วัน</span>
                  <span className="text-xs sm:text-sm font-bold text-cyan-300 font-mono">
                    ฿ {attendeesCount > 0 && daysCount > 0 ? (totalBudget / (attendeesCount * daysCount)).toFixed(0) : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom: Expense Category Breakdown Bar */}
            <div className="relative z-10 space-y-1.5 pt-2 border-t border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold block">
                สัดส่วนหมวดค่าใช้จ่ายหลัก
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-[11px]">
                <div className="truncate">
                  <span className="text-white/60 block text-[9px]">อาหาร/เครื่องดื่ม</span>
                  <span className="font-bold text-white font-mono">฿{breakdown.food.toLocaleString()}</span>
                </div>
                <div className="truncate">
                  <span className="text-white/60 block text-[9px]">ค่าวิทยากร</span>
                  <span className="font-bold text-white font-mono">฿{breakdown.speaker.toLocaleString()}</span>
                </div>
                <div className="truncate">
                  <span className="text-white/60 block text-[9px]">ที่พัก/เบี้ยเลี้ยง</span>
                  <span className="font-bold text-white font-mono">฿{(breakdown.room + breakdown.allowance).toLocaleString()}</span>
                </div>
                <div className="truncate">
                  <span className="text-white/60 block text-[9px]">พาหนะเดินทาง</span>
                  <span className="font-bold text-white font-mono">฿{breakdown.transport.toLocaleString()}</span>
                </div>
                <div className="truncate">
                  <span className="text-white/60 block text-[9px]">อื่น ๆ/วัสดุ</span>
                  <span className="font-bold text-white font-mono">฿{breakdown.other.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            💡 นำรูปภาพที่ได้ไปแทรกลงในสไลด์นำเสนอ หรือส่งรายงานสรุปให้ผู้บังคับบัญชาได้ทันที
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'คัดลอกรูปภาพแล้ว!' : 'คัดลอกรูปภาพ'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'กำลังสร้างภาพ...' : 'ดาวน์โหลดภาพ PNG (16:9)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
