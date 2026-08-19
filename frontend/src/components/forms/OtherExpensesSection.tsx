import React from 'react';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import type { BudgetFormData } from '../../types';

interface Props {
  formData: BudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BudgetFormData>>;
}

export const OtherExpensesSection: React.FC<Props> = ({ formData, setFormData }) => {
  const inputClass = "w-full px-4 py-3 rounded-2xl border border-slate-200/10 bg-slate-100/40 shadow-neumorph-inset focus:outline-none focus:ring-2 focus:ring-accent/50 focus:bg-[#fbfcfd] transition-all duration-300 text-sm";
  const labelClass = "text-xs font-semibold text-muted-foreground mb-1.5 block";
  const cardClass = "bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-5";

  const handleAddCustomExpense = () => {
    setFormData(prev => ({
      ...prev,
      otherExpenses: [
        ...(prev.otherExpenses || []),
        { id: Date.now().toString(), name: '', amount: '' }
      ]
    }));
  };

  const handleUpdateCustomExpense = (id: string, field: 'name' | 'amount', val: string) => {
    setFormData(prev => ({
      ...prev,
      otherExpenses: (prev.otherExpenses || []).map(item => 
        item.id === id ? { ...item, [field]: val } : item
      )
    }));
  };

  const handleRemoveCustomExpense = (id: string) => {
    setFormData(prev => ({
      ...prev,
      otherExpenses: (prev.otherExpenses || []).filter(item => item.id !== id)
    }));
  };

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <h3 className="text-base font-semibold flex items-center gap-2.5 text-foreground">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          ค่าใช้จ่ายอื่นๆ (ระบุชื่อรายการและจำนวนเงิน)
        </h3>
        <button
          type="button"
          onClick={handleAddCustomExpense}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
        </button>
      </div>

      <div className="space-y-4">
        {/* Main Item */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
          <div className="md:col-span-8">
            <label className={labelClass} htmlFor="otherExpenseName">
              ชื่อรายการ / รายละเอียดค่าใช้จ่าย
            </label>
            <input
              type="text"
              id="otherExpenseName"
              value={formData.otherExpenseName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, otherExpenseName: e.target.value }))}
              placeholder="เช่น ค่าจ้างเหมาบริการ, ค่าวัสดุอุปกรณ์, ค่าของที่ระลึก, ค่าจัดสถานที่..."
              className={inputClass}
            />
          </div>
          <div className="md:col-span-4">
            <label className={labelClass} htmlFor="otherExpenseAmount">
              จำนวนเงิน (บาท)
            </label>
            <input
              type="number"
              id="otherExpenseAmount"
              value={formData.otherExpenseAmount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, otherExpenseAmount: e.target.value }))}
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        {/* Additional items */}
        {(formData.otherExpenses || []).map((item, index) => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40 relative group">
            <div className="md:col-span-7">
              <label className={labelClass}>
                ชื่อรายการเพิ่มเติม #{index + 2}
              </label>
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleUpdateCustomExpense(item.id, 'name', e.target.value)}
                placeholder="ระบุชื่อรายการค่าใช้จ่าย..."
                className={inputClass}
              />
            </div>
            <div className="md:col-span-4">
              <label className={labelClass}>
                จำนวนเงิน (บาท)
              </label>
              <input
                type="number"
                value={item.amount}
                onChange={(e) => handleUpdateCustomExpense(item.id, 'amount', e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-1 flex items-end justify-center pb-1">
              <button
                type="button"
                onClick={() => handleRemoveCustomExpense(item.id)}
                className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                title="ลบรายการนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
