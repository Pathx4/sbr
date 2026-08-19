import React, { useState, useEffect } from 'react';
import { 
  Save, 
  FolderOpen, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  X, 
  BookmarkCheck,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { BudgetFormData } from '../../types';
import { initialFormData } from '../../types';

export interface SavedPreset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activityType: BudgetFormData['activityType'];
  regulation: string;
  projectName?: string;
  totalAttendees?: string;
  days?: string;
  formData: BudgetFormData;
}

interface Props {
  formData: BudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BudgetFormData>>;
  onReset?: () => void;
}

const ACTIVE_DRAFT_KEY = 'sbr_budget_active_draft';
const PRESETS_STORAGE_KEY = 'sbr_budget_saved_presets';

export const DraftsManager: React.FC<Props> = ({ formData, setFormData, onReset }) => {
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) {
        setPresets(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load presets from localStorage', e);
    }
  }, []);

  // Show temporary toast notification
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Auto-Save active draft whenever formData changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(formData));
        const now = new Date();
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setLastAutoSavedTime(timeStr);
      } catch (e) {
        console.error('Failed to auto-save draft', e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData]);

  // Save Current Form as New Preset
  const handleSavePreset = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = saveName.trim() || formData.projectName || `โครงการ (${new Date().toLocaleDateString('th-TH')})`;
    const nowStr = new Date().toISOString();

    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: finalName,
      createdAt: nowStr,
      updatedAt: nowStr,
      activityType: formData.activityType,
      regulation: formData.regulation,
      projectName: formData.projectName,
      totalAttendees: formData.totalAttendees || formData.staffCount,
      days: formData.days,
      formData: { ...formData }
    };

    const updated = [newPreset, ...presets];
    setPresets(updated);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    
    setIsSaveModalOpen(false);
    setSaveName('');
    showToast(`บันทึกแม่แบบ "${finalName}" เรียบร้อยแล้ว!`);
  };

  // Load a Preset into Form
  const handleLoadPreset = (preset: SavedPreset) => {
    if (window.confirm(`ต้องการโหลดข้อมูล "${preset.name}" เข้าสู่ฟอร์มหรือไม่?`)) {
      setFormData(preset.formData);
      setIsModalOpen(false);
      showToast(`โหลดข้อมูล "${preset.name}" เรียบร้อยแล้ว!`);
    }
  };

  // Delete a Preset
  const handleDeletePreset = (id: string, name: string) => {
    if (window.confirm(`ต้องการลบแม่แบบ "${name}" หรือไม่?`)) {
      const updated = presets.filter(p => p.id !== id);
      setPresets(updated);
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
      showToast(`ลบแม่แบบเรียบร้อยแล้ว`, 'info');
    }
  };

  // Duplicate a Preset
  const handleDuplicatePreset = (preset: SavedPreset) => {
    const duplicated: SavedPreset = {
      ...preset,
      id: Date.now().toString(),
      name: `${preset.name} (สำเนา)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [duplicated, ...presets];
    setPresets(updated);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    showToast(`ทำสำเนาแม่แบบเรียบร้อยแล้ว`);
  };

  // Clear Form / Reset
  const handleResetForm = () => {
    if (window.confirm('คุณต้องการล้างข้อมูลที่กรอกทั้งหมดและเริ่มต้นฟอร์มใหม่หรือไม่?')) {
      localStorage.removeItem(ACTIVE_DRAFT_KEY);
      setFormData(initialFormData);
      if (onReset) onReset();
      showToast('ล้างข้อมูลเรียบร้อยแล้ว เริ่มต้นฟอร์มใหม่', 'info');
    }
  };

  // Export Presets to JSON File
  const handleExportJSON = () => {
    const dataToExport = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      currentDraft: formData,
      presets: presets
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sbr_budget_templates_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์แม่แบบ (.json) เรียบร้อยแล้ว');
  };

  // Import Presets from JSON File
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.presets && Array.isArray(imported.presets)) {
          const merged = [...imported.presets, ...presets.filter(p => !imported.presets.some((ip: SavedPreset) => ip.id === p.id))];
          setPresets(merged);
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(merged));
          showToast(`นำเข้าแม่แบบสำเร็จ ${imported.presets.length} รายการ!`);
        } else if (imported.formData) {
          setFormData(imported.formData);
          showToast('นำเข้าและโหลดข้อมูลฟอร์มเรียบร้อยแล้ว!');
        } else {
          alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'training': return { label: 'ฝึกอบรม', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'meeting': return { label: 'ประชุม', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'field_trip': return { label: 'ลงพื้นที่', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      default: return { label: type, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <div className="w-full mb-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-sm font-medium ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}>
            <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Action Control Bar */}
      <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Auto-save status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <span>
            {lastAutoSavedTime 
              ? `ระบบจำข้อมูลอัตโนมัติล่าสุดเวลา ${lastAutoSavedTime} น.`
              : 'ระบบกำลังจำข้อมูลที่คุณกรอกอัตโนมัติ'}
          </span>
          <span className="hidden sm:inline text-muted-foreground/40">• ข้อมูลไม่หายเมื่อรีเฟรชหรือปิดหน้าเว็บ</span>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Save Draft Button */}
          <button
            type="button"
            onClick={() => {
              setSaveName(formData.projectName || '');
              setIsSaveModalOpen(true);
            }}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all active:scale-95 shadow-sm"
            title="บันทึกข้อมูลฟอร์มปัจจุบันเป็นแม่แบบเพื่อใช้ซ้ำ"
          >
            <Save className="w-3.5 h-3.5" />
            บันทึกเป็นแม่แบบ
          </button>

          {/* Open Saved Presets Modal Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all active:scale-95 shadow-sm"
            title="เปิดดูรายการโครงการ/แม่แบบที่เคยบันทึกไว้"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            แม่แบบที่บันทึกไว้ ({presets.length})
          </button>

          {/* Reset Form Button */}
          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/50 transition-all"
            title="ล้างข้อมูลทั้งหมดในฟอร์มเพื่อเริ่มต้นใหม่"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ล้างฟอร์ม
          </button>
        </div>
      </div>

      {/* Save Preset Dialog Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">บันทึกเป็นแม่แบบ (Save Template)</h3>
                  <p className="text-xs text-muted-foreground">บันทึกข้อมูลฟอร์มปัจจุบันเพื่อนำกลับมาใช้ซ้ำได้ง่าย</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsSaveModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  ตั้งชื่อแม่แบบ / ชื่อโครงการ
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="เช่น อบรม GIS และ Remote Sensing 3 วัน..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  autoFocus
                />
              </div>

              <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>ประเภทกิจกรรม:</span>
                  <span className="font-semibold text-foreground">{getActivityTypeLabel(formData.activityType).label}</span>
                </div>
                <div className="flex justify-between">
                  <span>ระเบียบอ้างอิง:</span>
                  <span className="font-semibold text-foreground">{formData.regulation || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>จำนวนวัน / ผู้เข้าร่วม:</span>
                  <span className="font-semibold text-foreground">{formData.days || 1} วัน / {formData.totalAttendees || formData.staffCount || 0} คน</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  บันทึกแม่แบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Presets / History Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">คลังแม่แบบและประวัติที่บันทึกไว้</h3>
                  <p className="text-xs text-muted-foreground">เลือกแม่แบบเพื่อโหลดข้อมูลกลับเข้าฟอร์มทันที โดยไม่ต้องกรอกใหม่</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of Presets */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {presets.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-border/60 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">ยังไม่มีแม่แบบที่บันทึกไว้</div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    เมื่อคุณกรอกข้อมูลโครงการเสร็จแล้ว สามารถกดปุ่ม <strong>"บันทึกเป็นแม่แบบ"</strong> เพื่อเก็บไว้ใช้ในครั้งถัดไปได้ทันที
                  </p>
                </div>
              ) : (
                presets.map((preset) => {
                  const tag = getActivityTypeLabel(preset.activityType);
                  const dateFormatted = new Date(preset.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div 
                      key={preset.id} 
                      className="group p-4 bg-muted/30 hover:bg-muted/60 rounded-xl border border-border/60 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${tag.color}`}>
                            {tag.label}
                          </span>
                          <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {preset.name}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateFormatted}
                          </span>
                          <span>•</span>
                          <span>{preset.regulation}</span>
                          <span>•</span>
                          <span>{preset.days || 1} วัน ({preset.totalAttendees || 0} คน)</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleDuplicatePreset(preset)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg border border-border/40 transition-all"
                          title="ทำสำเนาแม่แบบนี้"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg border border-border/40 transition-all"
                          title="ลบแม่แบบนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadPreset(preset)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          โหลดข้อมูลนี้
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer: Import/Export */}
            <div className="p-4 bg-muted/40 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background hover:bg-muted border border-border text-foreground transition-all"
                  title="ดาวน์โหลดไฟล์สำรองแม่แบบเพื่อส่งต่อให้เพื่อนร่วมงาน"
                >
                  <Download className="w-3.5 h-3.5" />
                  ส่งออกแม่แบบ (.json)
                </button>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background hover:bg-muted border border-border text-foreground transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  นำเข้าแม่แบบ (.json)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="sr-only"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
