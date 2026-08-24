import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Utensils, UserCheck, Hotel, Car, Sparkles, TrendingUp } from 'lucide-react';
import { bahttext } from 'bahttext';
import type { BudgetFormData } from '../../types';
import { AnimatedNumber } from '../ui/AnimatedNumber';

interface Props {
  formData: BudgetFormData;
  calculationResult: {
    totalCost: number;
    breakdown: Array<{
      label: string;
      amount: number;
      detail?: string;
    }>;
  };
}

export const BudgetAnalyticsCard: React.FC<Props> = ({ formData, calculationResult }) => {
  if (!calculationResult || calculationResult.totalCost <= 0) return null;

  const total = calculationResult.totalCost;
  const breakdown = calculationResult.breakdown || [];

  // Group breakdown items into 4 major categories
  let foodTotal = 0;
  let speakerTotal = 0;
  let roomAndAllowanceTotal = 0;
  let travelAndOtherTotal = 0;

  breakdown.forEach(item => {
    const label = item.label || '';
    const amount = item.amount || 0;

    if (label.includes('อาหาร') || label.includes('เครื่องดื่ม') || label.includes('อาหารว่าง')) {
      foodTotal += amount;
    } else if (label.includes('วิทยากร') || label.includes('ผู้ทรงคุณวุฒิ')) {
      speakerTotal += amount;
    } else if (label.includes('ที่พัก') || label.includes('เบี้ยเลี้ยง') || label.includes('ห้องพัก')) {
      roomAndAllowanceTotal += amount;
    } else {
      travelAndOtherTotal += amount;
    }
  });

  const categories = [
    {
      id: 'food',
      name: 'ค่าอาหารและเครื่องดื่ม',
      amount: foodTotal,
      percent: Math.round((foodTotal / total) * 100) || 0,
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200/80',
      badgeBg: 'bg-amber-100 text-amber-800',
      barColor: 'bg-amber-500',
      icon: Utensils,
    },
    {
      id: 'speaker',
      name: 'ค่าตอบแทนวิทยากร',
      amount: speakerTotal,
      percent: Math.round((speakerTotal / total) * 100) || 0,
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200/80',
      badgeBg: 'bg-purple-100 text-purple-800',
      barColor: 'bg-purple-500',
      icon: UserCheck,
    },
    {
      id: 'room',
      name: 'ค่าที่พักและเบี้ยเลี้ยง',
      amount: roomAndAllowanceTotal,
      percent: Math.round((roomAndAllowanceTotal / total) * 100) || 0,
      bgColor: 'bg-blue-50 text-blue-700 border-blue-200/80',
      badgeBg: 'bg-blue-100 text-blue-800',
      barColor: 'bg-blue-500',
      icon: Hotel,
    },
    {
      id: 'travel_other',
      name: 'ค่าเดินทางและอื่นๆ',
      amount: travelAndOtherTotal,
      percent: Math.round((travelAndOtherTotal / total) * 100) || 0,
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      barColor: 'bg-emerald-500',
      icon: Car,
    },
  ].filter(c => c.amount > 0);

  const days = parseInt(formData.days) || 1;
  const attendees = parseInt(formData.totalAttendees) || parseInt(formData.committeeCount) || 1;
  const costPerPerson = attendees > 0 ? Math.round(total / attendees) : 0;
  const costPerDay = days > 0 ? Math.round(total / days) : 0;

  // Find dominant expense category
  const dominantCategory = [...categories].sort((a, b) => b.amount - a.amount)[0];
  const thaiBahtText = bahttext(total);

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-md space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 font-display">สัดส่วนและภาพรวมงบประมาณ</h3>
            <p className="text-xs text-slate-500">วิเคราะห์การกระจายตัวของค่าใช้จ่ายตามหมวดหมู่งบประมาณ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            คำนวณเรียลไทม์
          </span>
        </div>
      </div>

      {/* Multi-segment Combined Progress Bar */}
      <div className="space-y-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-slate-700">
          <span>สัดส่วนงบประมาณโครงการทั้งหมด (100%)</span>
          <div className="flex items-center gap-1.5 font-mono text-blue-700 text-sm">
            <span>รวมสุทธิ:</span>
            <AnimatedNumber value={total} prefix="฿ " suffix=" บาท" className="font-extrabold" />
          </div>
        </div>

        <div className="h-4 w-full bg-slate-200/80 rounded-full overflow-hidden flex p-0.5 shadow-inner">
          {categories.map(cat => (
            <motion.div
              key={cat.id}
              initial={{ width: 0 }}
              animate={{ width: `${cat.percent}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full ${cat.barColor} rounded-sm first:rounded-l-full last:rounded-r-full relative group cursor-pointer`}
              title={`${cat.name}: ${cat.percent}% (฿${cat.amount.toLocaleString()})`}
            />
          ))}
        </div>

        {/* Dominant highlight note & BahtText */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
          {dominantCategory && (
            <span className="flex items-center gap-1 text-slate-700 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              หมวดค่าใช้จ่ายสูงสุด: <strong className="text-slate-900">{dominantCategory.name} ({dominantCategory.percent}%)</strong>
            </span>
          )}
          <span className="text-blue-700 font-bold bg-blue-50/90 px-2.5 py-0.5 rounded-lg border border-blue-200/60 w-fit">
            ({thaiBahtText})
          </span>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl border ${cat.bgColor} shrink-0 group-hover:scale-105 transition-transform shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{cat.name}</p>
                  <p className="text-xs text-slate-600 font-bold font-mono">
                    <AnimatedNumber value={cat.amount} prefix="฿ " />
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg font-mono shadow-xs ${cat.badgeBg}`}>
                  {cat.percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Metrics Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 text-center shadow-xs">
          <span className="text-[11px] text-slate-500 block font-bold mb-0.5">เฉลี่ยต่อวัน (Cost / Day)</span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-800">
            <AnimatedNumber value={costPerDay} prefix="฿ " />
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 text-center shadow-xs">
          <span className="text-[11px] text-slate-500 block font-bold mb-0.5">เฉลี่ยต่อคน (Cost / Person)</span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-800">
            <AnimatedNumber value={costPerPerson} prefix="฿ " />
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/80 border border-blue-200/80 text-center shadow-xs">
          <span className="text-[11px] text-blue-800 block font-bold mb-0.5">ขนาดโครงการ</span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-800">
            {days} วัน <span className="text-xs font-bold text-slate-600">({attendees} คน)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
