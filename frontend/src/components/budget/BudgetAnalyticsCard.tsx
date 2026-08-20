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
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      barColor: 'bg-amber-500',
      icon: Utensils,
    },
    {
      id: 'speaker',
      name: 'ค่าตอบแทนวิทยากร',
      amount: speakerTotal,
      percent: Math.round((speakerTotal / total) * 100) || 0,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      barColor: 'bg-purple-500',
      icon: UserCheck,
    },
    {
      id: 'room',
      name: 'ค่าที่พักและเบี้ยเลี้ยง',
      amount: roomAndAllowanceTotal,
      percent: Math.round((roomAndAllowanceTotal / total) * 100) || 0,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      barColor: 'bg-blue-500',
      icon: Hotel,
    },
    {
      id: 'travel_other',
      name: 'ค่าเดินทางและอื่นๆ',
      amount: travelAndOtherTotal,
      percent: Math.round((travelAndOtherTotal / total) * 100) || 0,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      barColor: 'bg-emerald-500',
      icon: Car,
    },
  ].filter(c => c.amount > 0);

  const days = parseInt(formData.days) || 1;
  const attendees = parseInt(formData.totalAttendees) || parseInt(formData.committeeCount) || 1;
  const costPerPerson = attendees > 0 ? Math.round(total / attendees) : 0;
  const costPerDay = days > 0 ? Math.round(total / days) : 0;

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">สัดส่วนและภาพรวมงบประมาณ (Budget Analytics)</h3>
            <p className="text-xs text-muted-foreground">วิเคราะห์การกระจายตัวของค่าใช้จ่ายตามหมวดหมู่</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          คำนวณอัตโนมัติ
        </span>
      </div>

      {/* Multi-segment Combined Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>การจัดสรรงบประมาณรวม 100%</span>
          <span>฿ {total.toLocaleString()} บาท</span>
        </div>
        <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
          {categories.map(cat => (
            <motion.div
              key={cat.id}
              initial={{ width: 0 }}
              animate={{ width: `${cat.percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full ${cat.barColor} relative group`}
              title={`${cat.name}: ${cat.percent}% (฿${cat.amount.toLocaleString()})`}
            />
          ))}
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg border ${cat.bgColor} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{cat.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    ฿ {cat.amount.toLocaleString()} ({cat.percent}%)
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold font-mono text-foreground">{cat.percent}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Metrics Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border/50">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-center">
          <span className="text-[11px] text-muted-foreground block font-medium">เฉลี่ยต่อวัน</span>
          <span className="text-sm sm:text-base font-bold font-mono text-foreground">
            ฿ {costPerDay.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-center">
          <span className="text-[11px] text-muted-foreground block font-medium">เฉลี่ยต่อคน</span>
          <span className="text-sm sm:text-base font-bold font-mono text-foreground">
            ฿ {costPerPerson.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
          <span className="text-[11px] text-muted-foreground block font-medium">ระยะเวลากิจกรรม</span>
          <span className="text-sm sm:text-base font-bold font-mono text-primary">
            {days} วัน ({attendees} คน)
          </span>
        </div>
      </div>
    </div>
  );
};
