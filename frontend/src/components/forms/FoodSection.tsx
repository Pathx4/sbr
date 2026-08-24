import React from 'react';
import { CheckCircle2, Coffee, Utensils, GlassWater } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BudgetFormData } from '../../types';
import { getThaiDayDates } from '../../utils/dateUtils';

interface Props {
  formData: BudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BudgetFormData>>;
}

export const FoodSection: React.FC<Props> = ({ formData, setFormData }) => {
  const cardClass = "bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-5";
  const titleClass = "text-base font-semibold flex items-center gap-2.5 text-foreground pb-2 border-b border-border/40";
  
  const totalDays = parseInt(formData.days) || 1;
  const allDays = Array.from({ length: totalDays }, (_, i) => i + 1);

  const handleDayToggle = (id: 'foodBreakMorningDays' | 'foodBreakAfternoonDays' | 'foodLunchDays' | 'foodReceptionDays', day: number, e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => {
      const days = prev[id] as number[];
      if (e.target.checked) {
        return { ...prev, [id]: [...days, day] };
      } else {
        return { ...prev, [id]: days.filter(d => d !== day) };
      }
    });
  };

  const handleFoodToggle = (
    type: 'foodBreakMorning' | 'foodBreakAfternoon' | 'foodLunch' | 'foodReception', 
    daysId: 'foodBreakMorningDays' | 'foodBreakAfternoonDays' | 'foodLunchDays' | 'foodReceptionDays'
  ) => {
    const isNowChecked = !formData[type];
    setFormData({
      ...formData,
      [type]: isNowChecked,
      [daysId]: isNowChecked ? allDays : []
    });
  };

  const hasAnyFoodSelected = formData.foodBreakMorning || formData.foodBreakAfternoon || formData.foodLunch || formData.foodReception;

  const handleSelectAllDaysForActive = () => {
    setFormData(prev => ({
      ...prev,
      foodBreakMorningDays: prev.foodBreakMorning ? allDays : [],
      foodBreakAfternoonDays: prev.foodBreakAfternoon ? allDays : [],
      foodLunchDays: prev.foodLunch ? allDays : [],
      foodReceptionDays: prev.foodReception ? allDays : [],
    }));
  };

  const handleSelectFirstDayOnly = () => {
    setFormData(prev => ({
      ...prev,
      foodBreakMorningDays: prev.foodBreakMorning ? [1] : [],
      foodBreakAfternoonDays: prev.foodBreakAfternoon ? [1] : [],
      foodLunchDays: prev.foodLunch ? [1] : [],
      foodReceptionDays: prev.foodReception ? [1] : [],
    }));
  };

  const handleClearAllDays = () => {
    setFormData(prev => ({
      ...prev,
      foodBreakMorningDays: [],
      foodBreakAfternoonDays: [],
      foodLunchDays: [],
      foodReceptionDays: [],
    }));
  };

  return (
    <div className={cardClass}>
      <h3 className={titleClass}>
        <div className="p-1.5 bg-primary/10 rounded-md">
          <Utensils className="w-4 h-4 text-primary" />
        </div>
        ค่าอาหารและเครื่องดื่ม {formData.regulation && <span className="text-sm font-normal text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded-md">(ตาม{formData.regulation})</span>}
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Morning Break */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleFoodToggle('foodBreakMorning', 'foodBreakMorningDays')}
          className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-colors duration-300 ${formData.foodBreakMorning ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/10' : 'border-border/60 bg-card hover:border-primary/40 text-muted-foreground hover:shadow-sm'}`}
        >
          <div className="absolute top-4 right-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${formData.foodBreakMorning ? 'border-primary bg-primary text-primary-foreground scale-100' : 'border-muted-foreground/30 scale-90'}`}>
              {formData.foodBreakMorning && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>
          <Coffee className={`w-10 h-10 transition-transform duration-300 ${formData.foodBreakMorning ? 'text-primary scale-110' : 'text-muted-foreground/70'}`} />
          <span className="font-semibold text-foreground text-sm">อาหารว่างเช้า</span>
        </motion.div>

        {/* Afternoon Break */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleFoodToggle('foodBreakAfternoon', 'foodBreakAfternoonDays')}
          className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-colors duration-300 ${formData.foodBreakAfternoon ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/10' : 'border-border/60 bg-card hover:border-primary/40 text-muted-foreground hover:shadow-sm'}`}
        >
          <div className="absolute top-4 right-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${formData.foodBreakAfternoon ? 'border-primary bg-primary text-primary-foreground scale-100' : 'border-muted-foreground/30 scale-90'}`}>
              {formData.foodBreakAfternoon && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>
          <Coffee className={`w-10 h-10 transition-transform duration-300 ${formData.foodBreakAfternoon ? 'text-primary scale-110' : 'text-muted-foreground/70'}`} />
          <span className="font-semibold text-foreground text-sm">อาหารว่างบ่าย</span>
        </motion.div>

        {/* Lunch */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleFoodToggle('foodLunch', 'foodLunchDays')}
          className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-colors duration-300 ${formData.foodLunch ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/10' : 'border-border/60 bg-card hover:border-primary/40 text-muted-foreground hover:shadow-sm'}`}
        >
          <div className="absolute top-4 right-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${formData.foodLunch ? 'border-primary bg-primary text-primary-foreground scale-100' : 'border-muted-foreground/30 scale-90'}`}>
              {formData.foodLunch && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>
          <Utensils className={`w-10 h-10 transition-transform duration-300 ${formData.foodLunch ? 'text-primary scale-110' : 'text-muted-foreground/70'}`} />
          <span className="font-semibold text-foreground text-sm">อาหารกลางวัน</span>
        </motion.div>

        {/* Reception */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleFoodToggle('foodReception', 'foodReceptionDays')}
          className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-colors duration-300 ${formData.foodReception ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/10' : 'border-border/60 bg-card hover:border-primary/40 text-muted-foreground hover:shadow-sm'}`}
        >
          <div className="absolute top-4 right-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${formData.foodReception ? 'border-primary bg-primary text-primary-foreground scale-100' : 'border-muted-foreground/30 scale-90'}`}>
              {formData.foodReception && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>
          <GlassWater className={`w-10 h-10 transition-transform duration-300 ${formData.foodReception ? 'text-primary scale-110' : 'text-muted-foreground/70'}`} />
          <span className="font-semibold text-foreground text-sm">อาหารรับรอง</span>
        </motion.div>
      </div>

      {hasAnyFoodSelected && (
        <div className="mt-6 pt-6 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              ระบุวันที่ต้องการจัดเลี้ยง
              <span className="text-xs font-normal text-muted-foreground">(เลือกวันที่ต้องการเบิกค่าอาหาร)</span>
            </h4>

            {totalDays > 1 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={handleSelectAllDaysForActive}
                  className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition"
                >
                  เลือกทุกวัน ({totalDays} วัน)
                </button>
                <button
                  type="button"
                  onClick={handleSelectFirstDayOnly}
                  className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition"
                >
                  เฉพาะวันแรก
                </button>
                <button
                  type="button"
                  onClick={handleClearAllDays}
                  className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  ล้างวัน
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {allDays.map(day => {
              const datesTh = getThaiDayDates(formData.startDate || formData.date, totalDays);
              const dayDateLabel = datesTh[day - 1];

              return (
                <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="w-auto sm:w-56 shrink-0">
                    <span className="font-semibold text-foreground block text-sm">วันที่ {day}</span>
                    {dayDateLabel && !dayDateLabel.startsWith('วันปฏิบัติการ') && (
                      <span className="text-xs text-muted-foreground">{dayDateLabel}</span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 flex-1">
                  {formData.foodBreakMorning && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.foodBreakMorningDays.includes(day)} 
                        onChange={(e) => handleDayToggle('foodBreakMorningDays', day, e)}
                        className="w-4 h-4 rounded text-primary border-muted-foreground/30 focus:ring-primary/20"
                      />
                      <span className="text-sm group-hover:text-primary transition-colors">อาหารว่างเช้า</span>
                    </label>
                  )}

                  {formData.foodBreakAfternoon && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.foodBreakAfternoonDays.includes(day)} 
                        onChange={(e) => handleDayToggle('foodBreakAfternoonDays', day, e)}
                        className="w-4 h-4 rounded text-primary border-muted-foreground/30 focus:ring-primary/20"
                      />
                      <span className="text-sm group-hover:text-primary transition-colors">อาหารว่างบ่าย</span>
                    </label>
                  )}
                  
                  {formData.foodLunch && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.foodLunchDays.includes(day)} 
                        onChange={(e) => handleDayToggle('foodLunchDays', day, e)}
                        className="w-4 h-4 rounded text-primary border-muted-foreground/30 focus:ring-primary/20"
                      />
                      <span className="text-sm group-hover:text-primary transition-colors">อาหารกลางวัน</span>
                    </label>
                  )}
                  
                  {formData.foodReception && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.foodReceptionDays.includes(day)} 
                        onChange={(e) => handleDayToggle('foodReceptionDays', day, e)}
                        className="w-4 h-4 rounded text-primary border-primary focus:ring-primary/20"
                      />
                      <span className="text-sm group-hover:text-primary transition-colors">อาหารรับรอง</span>
                    </label>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ค่าอาหารและเครื่องดื่มอื่นๆ */}
      <div className="mt-6 pt-6 border-t border-border/50">
        <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
          <Utensils className="w-4 h-4 text-primary" />
          ค่าอาหารและเครื่องดื่มอื่นๆ (เพิ่มเติม)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="foodOthersDetails">
              ระบุรายละเอียดค่าอาหารอื่นๆ (เช่น ค่าอาหารมื้อเย็นเพิ่มเติม, ค่าจัดเลี้ยงพิเศษ)
            </label>
            <input 
              type="text" 
              id="foodOthersDetails" 
              value={formData.foodOthersDetails || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, foodOthersDetails: e.target.value }))} 
              className="text-sm border border-slate-200/10 rounded-xl px-3 py-2.5 bg-slate-100/40 shadow-inner focus:ring-2 focus:ring-primary/20 focus:bg-background w-full transition-all"
              placeholder="ระบุรายละเอียดเพื่อไปแสดงใน Excel" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="foodOthersAmount">
              จำนวนเงิน (บาท)
            </label>
            <input 
              type="number" 
              id="foodOthersAmount" 
              value={formData.foodOthersAmount || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, foodOthersAmount: e.target.value }))} 
              className="text-sm border border-slate-200/10 rounded-xl px-3 py-2.5 bg-slate-100/40 shadow-inner focus:ring-2 focus:ring-primary/20 focus:bg-background w-full transition-all"
              placeholder="0.00" 
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
