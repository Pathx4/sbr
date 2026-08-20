import React from 'react';
import { FileText, Users, Car } from 'lucide-react';
import type { BudgetFormData } from '../../types';
import { FoodSection } from './FoodSection';
import { OtherExpensesSection } from './OtherExpensesSection';
import { formatThaiDateRange, calculateDaysBetween, calculateEndDateFromDays } from '../../utils/dateUtils';

interface Props {
  formData: BudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BudgetFormData>>;
}

export const FieldTripForm: React.FC<Props> = ({ formData, setFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [id]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setFormData(prev => {
      let newEnd = prev.endDate;
      let newDays = prev.days;

      if (newStart) {
        if (!newEnd || newEnd < newStart) {
          if (newDays && parseInt(newDays) > 1) {
            newEnd = calculateEndDateFromDays(newStart, parseInt(newDays));
          } else {
            newEnd = newStart;
            newDays = '1';
          }
        } else {
          newDays = calculateDaysBetween(newStart, newEnd).toString();
        }
      }
      return {
        ...prev,
        startDate: newStart,
        date: newStart,
        endDate: newEnd,
        days: newDays
      };
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setFormData(prev => {
      let newStart = prev.startDate || prev.date;
      let newDays = prev.days;

      if (newEnd) {
        if (!newStart || newEnd < newStart) {
          newStart = newEnd;
          newDays = '1';
        } else {
          newDays = calculateDaysBetween(newStart, newEnd).toString();
        }
      }
      return {
        ...prev,
        startDate: newStart,
        date: newStart,
        endDate: newEnd,
        days: newDays
      };
    });
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => {
      const numDays = parseInt(val);
      let newEnd = prev.endDate;
      const startStr = prev.startDate || prev.date;
      if (startStr && !isNaN(numDays) && numDays > 0) {
        newEnd = calculateEndDateFromDays(startStr, numDays);
      }
      return {
        ...prev,
        days: val,
        endDate: newEnd
      };
    });
  };

  const inputClass = "w-full px-4 py-3 rounded-2xl border border-slate-200/10 bg-slate-100/40 shadow-neumorph-inset focus:outline-none focus:ring-2 focus:ring-accent/50 focus:bg-[#fbfcfd] transition-all duration-300 text-sm";
  const labelClass = "text-sm font-medium text-foreground/80 mb-1.5 block";
  const cardClass = "bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-5";
  const titleClass = "text-base font-semibold flex items-center gap-2.5 text-foreground pb-2 border-b border-border/40";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Basic Info */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          ข้อมูลการออกเดินทางภาคสนาม
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-3">
            <label className={labelClass} htmlFor="projectName">ชื่อโครงการ / กิจกรรมลงพื้นที่ภาคสนาม</label>
            <input type="text" id="projectName" value={formData.projectName} onChange={handleChange} className={inputClass} placeholder="ระบุชื่อโครงการ หรือกิจกรรมลงพื้นที่..." />
          </div>

          <div>
            <label className={labelClass} htmlFor="startDate">
              วันที่เริ่มต้นเดินทาง <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              value={formData.startDate || formData.date || ''}
              onChange={handleStartDateChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="endDate">
              วันที่สิ้นสุดเดินทาง <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.endDate || ''}
              min={formData.startDate || formData.date || ''}
              onChange={handleEndDateChange}
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass} htmlFor="days">จำนวนวันเดินทาง (วัน)</label>
              <span className="text-[11px] text-muted-foreground font-normal mb-1">(คำนวณอัตโนมัติ)</span>
            </div>
            <input
              type="number"
              id="days"
              value={formData.days}
              onChange={handleDaysChange}
              className={inputClass}
              min="1"
              placeholder="ระบุจำนวนวัน..."
            />
          </div>

          {(formData.startDate || formData.date) && (
            <div className="md:col-span-3 -mt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <span>📅 {formatThaiDateRange(formData.startDate || formData.date, formData.endDate, parseInt(formData.days) || 1)}</span>
                <span className="text-primary/70 font-normal">({formData.days || 1} วัน)</span>
              </div>
            </div>
          )}

          <div className="md:col-span-3">
            <label className={labelClass} htmlFor="location">สถานที่ลงพื้นที่</label>
            <input type="text" id="location" value={formData.location} onChange={handleChange} className={inputClass} placeholder="เช่น อ.ศรีราชา จ.ชลบุรี, พื้นที่โครงการ..." />
          </div>
        </div>
      </div>

      {/* Committee & Allowance */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Users className="w-4 h-4 text-primary" />
          </div>
          คณะทำงานและเบี้ยเลี้ยง
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass} htmlFor="committeeCount">จำนวนคณะทำงาน (คน)</label>
            <input type="number" id="committeeCount" value={formData.committeeCount} onChange={handleChange} className={inputClass} min="0" placeholder="ระบุจำนวนคน..." />
          </div>
        </div>
      </div>

      {/* Food */}
      <FoodSection formData={formData} setFormData={setFormData} />

      {/* Travel Expenses */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Car className="w-4 h-4 text-primary" />
          </div>
          ค่าเดินทางและสถานที่ (ระบุจำนวนเงิน)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass} htmlFor="carRental">ค่าเช่ารถ (บาท)</label>
            <input type="number" id="carRental" value={formData.carRental} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
          <div>
            <label className={labelClass} htmlFor="insurance">ค่าประกัน (บาท)</label>
            <input type="number" id="insurance" value={formData.insurance} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
          <div>
            <label className={labelClass} htmlFor="tollFee">ค่าทางด่วน (บาท)</label>
            <input type="number" id="tollFee" value={formData.tollFee} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
          <div>
            <label className={labelClass} htmlFor="roomRental">ค่าเช่าห้องประชุม (บาท)</label>
            <input type="number" id="roomRental" value={formData.roomRental} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
        </div>
      </div>

      {/* Other Custom Expenses (ชื่อรายการ และ จำนวนเงิน) */}
      <OtherExpensesSection formData={formData} setFormData={setFormData} />

    </div>
  );
};
