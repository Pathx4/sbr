import React from 'react';
import { FileText, Users, Receipt } from 'lucide-react';
import type { BudgetFormData } from '../../types';
import { FoodSection } from './FoodSection';
import { OtherExpensesSection } from './OtherExpensesSection';

interface Props {
  formData: BudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BudgetFormData>>;
}

export const MeetingForm: React.FC<Props> = ({ formData, setFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [id]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
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
          ข้อมูลการประชุม
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass} htmlFor="date">วันที่</label>
            <input type="date" id="date" value={formData.date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="days">จำนวนวันประชุม</label>
            <input type="number" id="days" value={formData.days} onChange={handleChange} className={inputClass} min="1" placeholder="ระบุจำนวนวัน..." />
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

      {/* Standard Expenses */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          ค่าสถานที่และทางด่วน (ระบุจำนวนเงิน)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
