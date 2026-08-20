import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Utensils, UserCheck, Hotel, Car, Sparkles } from 'lucide-react';
import type { BudgetFormData } from '../../types';

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
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
      barColor: 'bg-amber-500',
      icon: Utensils,
    },
    {
      id: 'speaker',
      name: 'ค่าตอบแทนวิทยากร',
      amount: speakerTotal,
      percent: Math.round((speakerTotal / total) * 100) || 0,
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
      barColor: 'bg-purple-500',
      icon: UserCheck,
    },
    {
      id: 'room',
      name: 'ค่าที่พักและเบี้ยเลี้ยง',
      amount: roomAndAllowanceTotal,
      percent: Math.round((roomAndAllowanceTotal / total) * 100) || 0,
      bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
      barColor: 'bg-blue-500',
      icon: Hotel,
    },
    {
      id: 'travel_other',
      name: 'ค่าเดินทางและอื่นๆ',
      amount: travelAndOtherTotal,
      percent: Math.round((travelAndOtherTotal / total) * 100) || 0,
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-emerald-500',
      icon: Car,
    },
  ].filter(c => c.amount > 0);

  const days = parseInt(formData.days) || 1;
  const attendees = parseInt(formData.totalAttendees) || parseInt(formData.committeeCount) || 1;
  const costPerPerson = attendees > 0 ? Math.round(total / attendees) : 0;
  const costPerDay = days > 0 ? Math.round(total / days) : 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-md space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">สัดส่วนและภาพรวมงบประมาณ</h3>
            <p className="text-xs text-slate-500">วิเคราะห์การกระจายตัวของค่าใช้จ่ายตามหมวดหมู่</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          คำนวณอัตโนมัติ
        </span>
      </div>

      {/* Multi-segment Combined Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-600">
          <span>สัดส่วนงบประมาณรวม (100%)</span>
          <span className="text-blue-700 font-mono">฿ {total.toLocaleString()} บาท</span>
        </div>
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200/60 shadow-inner">
          {categories.map(cat => (
            <motion.div
              key={cat.id}
              initial={{ width: 0 }}
              animate={{ width: `${cat.percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full ${cat.barColor} rounded-sm first:rounded-l-full last:rounded-r-full relative group`}
              title={`${cat.name}: ${cat.percent}% (฿${cat.amount.toLocaleString()})`}
            />
          ))}
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl border ${cat.bgColor} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{cat.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium font-mono">
                    ฿ {cat.amount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono shadow-xs">
                  {cat.percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Metrics Quick Stats (Bright Clean Light Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 text-center shadow-xs">
          <span className="text-[11px] text-slate-500 block font-semibold mb-0.5">เฉลี่ยต่อวัน</span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-800">
            ฿ {costPerDay.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 text-center shadow-xs">
          <span className="text-[11px] text-slate-500 block font-semibold mb-0.5">เฉลี่ยต่อคน</span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-800">
            ฿ {costPerPerson.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-50/60 to-indigo-50/60 border border-blue-200/80 text-center shadow-xs">
          <span className="text-[11px] text-blue-700/80 block font-semibold mb-0.5">ระยะเวลากิจกรรม</span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-700">
            {days} วัน <span className="text-xs font-medium text-slate-600">({attendees} คน)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
