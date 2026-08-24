import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight,
  Search,
  Share2
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
  estimatedTotal?: number;
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
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [selectedPresetForClone, setSelectedPresetForClone] = useState<SavedPreset | null>(null);
  const [cloneNewName, setCloneNewName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'training' | 'meeting' | 'field_trip'>('all');
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
    showToast(`บันทึกโครงการ "${finalName}" ลงในคลังเรียบร้อยแล้ว!`);
  };

  // Load a Preset into Form
  const handleLoadPreset = (preset: SavedPreset) => {
    if (window.confirm(`ต้องการโหลดข้อมูลโครงการ "${preset.name}" เข้าสู่ฟอร์มหรือไม่?`)) {
      setFormData(preset.formData);
      setIsModalOpen(false);
      showToast(`โหลดโครงการ "${preset.name}" เรียบร้อยแล้ว!`);
    }
  };

  // Delete a Preset
  const handleDeletePreset = (id: string, name: string) => {
    if (window.confirm(`ต้องการลบโครงการ "${name}" หรือไม่?`)) {
      const updated = presets.filter(p => p.id !== id);
      setPresets(updated);
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
      showToast(`ลบโครงการเรียบร้อยแล้ว`, 'info');
    }
  };

  // Open Clone Modal for a Preset
  const handleOpenCloneModal = (preset: SavedPreset) => {
    setSelectedPresetForClone(preset);
    const currentYear = new Date().getFullYear() + 543;
    setCloneNewName(`${preset.name} (ปี ${currentYear})`);
    setIsCloneModalOpen(true);
  };

  // Execute Clone Preset
  const handleExecuteClone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPresetForClone) return;

    const clonedName = cloneNewName.trim() || `${selectedPresetForClone.name} (ฉบับคัดลอก)`;
    const nowStr = new Date().toISOString();

    const clonedPreset: SavedPreset = {
      ...selectedPresetForClone,
      id: Date.now().toString(),
      name: clonedName,
      projectName: clonedName,
      createdAt: nowStr,
      updatedAt: nowStr,
      formData: {
        ...selectedPresetForClone.formData,
        projectName: clonedName,
      }
    };

    const updated = [clonedPreset, ...presets];
    setPresets(updated);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    
    setIsCloneModalOpen(false);
    setSelectedPresetForClone(null);
    showToast(`ทำซ้ำโครงการ "${clonedName}" เรียบร้อยแล้ว!`);
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

  // Export Presets to JSON/.sbr File
  const handleExportJSON = () => {
    const dataToExport = {
      app: 'SBR Smart Budgeting System (GISTDA)',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      currentDraft: formData,
      presets: presets
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sbr_budget_vault_${new Date().toISOString().slice(0, 10)}.sbr`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์คลังโครงการ (.sbr) เรียบร้อยแล้ว');
  };

  // Export Single Preset
  const handleExportSinglePreset = (preset: SavedPreset) => {
    const dataToExport = {
      app: 'SBR Smart Budgeting System (GISTDA)',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      project: preset
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/[^\w\u0E00-\u0E7F]/g, '_')}.sbr`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`ส่งออกโครงการ "${preset.name}" สำเร็จแล้ว`);
  };

  // Import Presets from JSON/.sbr File
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
          showToast(`นำเข้าโครงการสำเร็จ ${imported.presets.length} รายการ!`);
        } else if (imported.project && imported.project.formData) {
          const newPreset = { ...imported.project, id: Date.now().toString() };
          const merged = [newPreset, ...presets];
          setPresets(merged);
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(merged));
          showToast(`นำเข้าโครงการ "${newPreset.name}" เรียบร้อยแล้ว!`);
        } else if (imported.formData) {
          setFormData(imported.formData);
          showToast('นำเข้าและโหลดข้อมูลฟอร์มเรียบร้อยแล้ว!');
        } else {
          alert('รูปแบบไฟล์ .sbr / .json ไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
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

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchSearch = !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.regulation || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchFilter = selectedFilter === 'all' || p.activityType === selectedFilter;
      return matchSearch && matchFilter;
    });
  }, [presets, searchQuery, selectedFilter]);

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
          <span className="hidden sm:inline text-muted-foreground/40">• บันทึกในเครื่องปลอดภัย ข้อมูลไม่หาย</span>
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
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all active:scale-95 shadow-sm"
            title="บันทึกข้อมูลฟอร์มปัจจุบันเป็นโครงการในคลัง"
          >
            <Save className="w-3.5 h-3.5" />
            <span>บันทึกโครงการ</span>
          </button>

          {/* Open Saved Presets Modal Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all active:scale-95 shadow-sm"
            title="เปิดดูคลังโครงการ & ทำซ้ำโครงการเดิม"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>คลังโครงการ ({presets.length})</span>
          </button>

          {/* Reset Form Button */}
          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/50 transition-all"
            title="ล้างข้อมูลทั้งหมดในฟอร์มเพื่อเริ่มต้นใหม่"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างฟอร์ม</span>
          </button>
        </div>
      </div>

      {/* Save Preset Dialog Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">บันทึกเข้าสู่คลังโครงการ (Project Vault)</h3>
                  <p className="text-xs text-muted-foreground">บันทึกข้อมูลฟอร์มปัจจุบันเพื่อนำกลับมาใช้ซ้ำหรือ Clone ภายหลัง</p>
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
                  ตั้งชื่อโครงการ / แม่แบบ
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="เช่น โครงการฝึกอบรม GIS ประจำปี 2569..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                  autoFocus
                />
              </div>

              <div className="bg-muted/40 rounded-2xl p-3.5 text-xs text-muted-foreground space-y-1.5">
                <div className="flex justify-between">
                  <span>ประเภทกิจกรรม:</span>
                  <span className="font-semibold text-foreground">{getActivityTypeLabel(formData.activityType).label}</span>
                </div>
                <div className="flex justify-between">
                  <span>ระเบียบอ้างอิง:</span>
                  <span className="font-semibold text-foreground truncate max-w-[200px]">{formData.regulation || '-'}</span>
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  บันทึกเข้าคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clone Project Dialog Modal */}
      {isCloneModalOpen && selectedPresetForClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">ทำซ้ำโครงการ (Clone Project)</h3>
                  <p className="text-xs text-muted-foreground">คัดลอกโครงร่างโครงการนี้เพื่อนำไปปรับปรุงเป็นโครงการใหม่</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCloneModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteClone} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  ตั้งชื่อโครงการฉบับคัดลอกใหม่
                </label>
                <input
                  type="text"
                  value={cloneNewName}
                  onChange={(e) => setCloneNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-xs text-blue-900 leading-relaxed">
                💡 โครงสร้าง อัตราคน ค่าอาหาร ค่าวิทยากร และที่พักเดิมทั้งหมดจะถูกทำสำเนาไว้ คุณสามารถโหลดไปปรับวันที่หรือจำนวนคนใหม่ได้ทันที
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  ยืนยันทำซ้ำโครงการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Presets / Project Vault Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground font-display">
                    คลังบันทึกโครงการ & ทำซ้ำโครงการ (Project Vault)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    ค้นหา เรียกดู หรือทำซ้ำ (Clone) โครงการที่เคยบันทึกไว้ในเบราว์เซอร์
                  </p>
                </div>
              </div>

              {/* Top Action Tools: Export All / Import */}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>นำเข้าไฟล์ (.sbr)</span>
                  <input
                    type="file"
                    accept=".sbr,.json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  disabled={presets.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition shadow-xs disabled:opacity-40"
                  title="สำรองข้อมูลโครงการทั้งหมดเป็นไฟล์ .sbr"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>สำรองคลังทั้งหมด</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อโครงการ หรือ ระเบียบ..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>

              {/* Activity Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'training', label: 'ฝึกอบรม' },
                  { id: 'meeting', label: 'ประชุม' },
                  { id: 'field_trip', label: 'ลงพื้นที่' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                      selectedFilter === tab.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body: List of Presets */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {filteredPresets.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-border/60 rounded-3xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-foreground">ไม่พบโครงการในเงื่อนไขที่ค้นหา</div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    ลองพิมพ์คำค้นหาใหม่ หรือกดบันทึกโครงการปัจจุบันเพื่อเก็บไว้ใช้งานในคลัง
                  </p>
                </div>
              ) : (
                filteredPresets.map((preset) => {
                  const tag = getActivityTypeLabel(preset.activityType);
                  const dateFormatted = new Date(preset.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div 
                      key={preset.id} 
                      className="group p-4 bg-muted/30 hover:bg-muted/70 rounded-2xl border border-border/60 hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${tag.color}`}>
                            {tag.label}
                          </span>
                          <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {preset.name}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dateFormatted}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[240px]">{preset.regulation}</span>
                          <span>•</span>
                          <span className="font-semibold text-foreground/80">{preset.days || 1} วัน ({preset.totalAttendees || 0} คน)</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => handleExportSinglePreset(preset)}
                          className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border border-border/50 transition-all"
                          title="ส่งออกโครงการนี้ (.sbr)"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCloneModal(preset)}
                          className="inline-flex items-center gap-1 px-3 py-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl text-xs font-bold border border-indigo-200 transition-all"
                          title="ทำซ้ำโครงการนี้เพื่อปรับปรุงเป็นโครงการใหม่"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Clone</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl border border-border/50 transition-all"
                          title="ลบโครงการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadPreset(preset)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          <span>โหลดเข้าฟอร์ม</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
