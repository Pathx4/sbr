import React from 'react';
import { Users, FileText, UserCheck, Hotel, UserPlus, Plus, Eraser, RefreshCcw } from 'lucide-react';
import type { BudgetFormData } from '../../types';
import { FoodSection } from './FoodSection';
import personnelData from '../../data/personnel.json';
import staffData from '../../data/staff_sbr.json';
import directorsData from '../../data/directors.json';

interface Props {
  formData: BudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BudgetFormData>>;
}

export const TrainingForm: React.FC<Props> = ({ formData, setFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [id]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleExecutiveToggle = (name: string) => {
    setFormData(prev => {
      const isSelected = prev.executiveNames.includes(name);
      if (isSelected) {
        return { ...prev, executiveNames: prev.executiveNames.filter(n => n !== name) };
      } else {
        return { ...prev, executiveNames: [...prev.executiveNames, name] };
      }
    });
  };

  const handleDirectorToggle = (name: string) => {
    setFormData(prev => {
      const isSelected = prev.directorNames.includes(name);
      const newNames = isSelected ? prev.directorNames.filter(n => n !== name) : [...prev.directorNames, name];
      const newRooms = generateRooms(prev.staffNames, newNames);
      
      let doubleRooms = 0;
      let singleRooms = 0;
      newRooms.forEach(room => {
        if (room.person1 && room.person2) doubleRooms++;
        else if (room.person1 || room.person2) singleRooms++;
      });

      return {
        ...prev,
        directorNames: newNames,
        staffRooms: newRooms,
        staffDoubleRooms: doubleRooms.toString(),
        staffSingleRooms: singleRooms.toString()
      };
    });
  };

  const generateRooms = (names: string[], _dirNames?: string[]) => {
    const selectedStaff = staffData.filter(s => names.includes(s.name));
    
    const rooms: { id: string; person1: string; person2: string }[] = [];
    let roomCounter = 1;

    // 1. Separate Directors (including selected GISTDA directors + SBR staff directors)
    const staffDirs = selectedStaff.filter(s => s.title && s.title.includes('ผู้อำนวยการ'));
    const others = selectedStaff.filter(s => !(s.title && s.title.includes('ผู้อำนวยการ')));

    staffDirs.forEach(d => {
      rooms.push({ id: roomCounter.toString(), person1: d.name, person2: '' });
      roomCounter++;
    });

    const males = others.filter(s => s.gender === 'M');
    const females = others.filter(s => s.gender === 'F');

    // Assign Males
    for (let i = 0; i < males.length; i += 2) {
      rooms.push({ 
        id: roomCounter.toString(), 
        person1: males[i].name, 
        person2: (i + 1 < males.length) ? males[i+1].name : ''
      });
      roomCounter++;
    }

    // Assign Females
    for (let i = 0; i < females.length; i += 2) {
      rooms.push({ 
        id: roomCounter.toString(), 
        person1: females[i].name, 
        person2: (i + 1 < females.length) ? females[i+1].name : ''
      });
      roomCounter++;
    }

    return rooms;
  };

  const handleStaffToggle = (name: string) => {
    setFormData(prev => {
      const isSelected = prev.staffNames.includes(name);
      const newNames = isSelected ? prev.staffNames.filter(n => n !== name) : [...prev.staffNames, name];
      
      const newRooms = generateRooms(newNames, prev.directorNames);
      
      let doubleRooms = 0;
      let singleRooms = 0;
      newRooms.forEach(room => {
        if (room.person1 && room.person2) doubleRooms++;
        else if (room.person1 || room.person2) singleRooms++;
      });

      return { 
        ...prev, 
        staffNames: newNames,
        staffCount: newNames.length.toString(),
        staffRooms: newRooms,
        staffDoubleRooms: doubleRooms.toString(),
        staffSingleRooms: singleRooms.toString()
      };
    });
  };

  const handleSlotChange = (roomId: string, slotIndex: 1 | 2, newName: string) => {
    setFormData(prev => {
      const newRooms = prev.staffRooms.map(r => ({ ...r }));
      const targetRoom = newRooms.find(r => r.id === roomId);
      if (!targetRoom) return prev;

      const oldName = slotIndex === 1 ? targetRoom.person1 : targetRoom.person2;

      // If newName is not empty, find where it currently is and swap with oldName
      if (newName) {
        for (const room of newRooms) {
          if (room.person1 === newName) {
            room.person1 = oldName;
            break;
          }
          if (room.person2 === newName) {
            room.person2 = oldName;
            break;
          }
        }
      }

      if (slotIndex === 1) targetRoom.person1 = newName;
      else targetRoom.person2 = newName;

      // Clean up empty rooms
      const cleanedRooms = newRooms.filter(r => r.person1 || r.person2);

      let doubleRooms = 0;
      let singleRooms = 0;
      cleanedRooms.forEach(room => {
        if (room.person1 && room.person2) doubleRooms++;
        else if (room.person1 || room.person2) singleRooms++;
      });

      return {
        ...prev,
        staffRooms: cleanedRooms,
        staffDoubleRooms: doubleRooms.toString(),
        staffSingleRooms: singleRooms.toString()
      };
    });
  };

  const handleAddRoom = () => {
    setFormData(prev => {
      const maxId = Math.max(0, ...prev.staffRooms.map(r => parseInt(r.id) || 0));
      return {
        ...prev,
        staffRooms: [...prev.staffRooms, { id: (maxId + 1).toString(), person1: '', person2: '' }]
      };
    });
  };

  const handleClearAllBeds = () => {
    setFormData(prev => {
      const roomCount = Math.max(prev.staffRooms.length, Math.ceil(prev.staffNames.length / 2));
      const emptyRooms = Array.from({ length: roomCount }).map((_, i) => ({
        id: (i + 1).toString(),
        person1: '',
        person2: ''
      }));
      
      return {
        ...prev,
        staffRooms: emptyRooms,
        staffDoubleRooms: '0',
        staffSingleRooms: '0'
      };
    });
  };

  const handleAutoAssignRooms = () => {
    setFormData(prev => {
      const newRooms = generateRooms(prev.staffNames, prev.directorNames);
      
      let doubleRooms = 0;
      let singleRooms = 0;
      newRooms.forEach(room => {
        if (room.person1 && room.person2) doubleRooms++;
        else if (room.person1 || room.person2) singleRooms++;
      });

      return {
        ...prev,
        staffRooms: newRooms,
        staffDoubleRooms: doubleRooms.toString(),
        staffSingleRooms: singleRooms.toString()
      };
    });
  };

  const getValidOptions = (currentName: string, otherSlotName: string) => {
    return formData.staffNames.filter(name => {
      if (name === currentName) return true;
      if (!otherSlotName) return true;
      
      const otherPerson = staffData.find(s => s.name === otherSlotName);
      const p = staffData.find(s => s.name === name);
      if (!otherPerson || !p) return true;
      
      const isOtherDirector = otherPerson.title?.includes('ผู้อำนวยการ') || directorsData.some(d => d.name === otherSlotName);
      const isPDirector = p.title?.includes('ผู้อำนวยการ') || directorsData.some(d => d.name === name);
      if (isOtherDirector || isPDirector) return false;
      
      return otherPerson.gender === p.gender;
    });
  };

  const [searchTerm, setSearchTerm] = React.useState('');
  const filteredPersonnel = personnelData.filter(p => {
    const isSecretary = p?.title && p.title.includes('เลขานุการ');
    const matchesSearch = p?.name ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    return !isSecretary && matchesSearch;
  });

  const [searchStaffTerm, setSearchStaffTerm] = React.useState('');
  const filteredStaff = staffData.filter(s => {
    const isDirector = s?.title && s.title.includes('ผู้อำนวยการ');
    const matchesSearch = (s?.name ? s.name.toLowerCase().includes(searchStaffTerm.toLowerCase()) : false) || 
      (s?.title ? s.title.toLowerCase().includes(searchStaffTerm.toLowerCase()) : false);
    return !isDirector && matchesSearch;
  });

  const [searchDirectorTerm, setSearchDirectorTerm] = React.useState('');
  const filteredDirectors = directorsData.filter(d => 
    (d?.name ? d.name.toLowerCase().includes(searchDirectorTerm.toLowerCase()) : false) || 
    (d?.title ? d.title.toLowerCase().includes(searchDirectorTerm.toLowerCase()) : false)
  );

  const inputClass = "w-full px-4 py-3 rounded-2xl border border-slate-200/10 bg-slate-100/40 shadow-neumorph-inset focus:outline-none focus:ring-2 focus:ring-accent/50 focus:bg-[#fbfcfd] transition-all duration-300 text-sm";
  const labelClass = "text-sm font-medium text-foreground/80 mb-1.5 block";
  const cardClass = "bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-5";
  const titleClass = "text-base font-semibold flex items-center gap-2.5 text-foreground pb-2 border-b border-border/40";
  const subTitleClass = "text-sm font-bold text-foreground mb-3 flex items-center gap-2";

  const handleSelectAllStaff = (selectAll: boolean) => {
    setFormData(prev => {
      const filteredNames = filteredStaff.map(s => s.name);
      let newNames = [...prev.staffNames];
      if (selectAll) {
        const toAdd = filteredNames.filter(n => !newNames.includes(n));
        newNames = [...newNames, ...toAdd];
      } else {
        newNames = newNames.filter(n => !filteredNames.includes(n));
      }
      
      const newRooms = generateRooms(newNames, prev.directorNames);
      
      let doubleRooms = 0;
      let singleRooms = 0;
      newRooms.forEach(room => {
        if (room.person1 && room.person2) doubleRooms++;
        else if (room.person1 || room.person2) singleRooms++;
      });

      return { 
        ...prev, 
        staffNames: newNames,
        staffCount: newNames.length.toString(),
        staffRooms: newRooms,
        staffDoubleRooms: doubleRooms.toString(),
        staffSingleRooms: singleRooms.toString()
      };
    });
  };

  const handleSelectAllDirectors = (selectAll: boolean) => {
    setFormData(prev => {
      const filteredNames = filteredDirectors.map(d => d.name);
      let newNames = [...prev.directorNames];
      if (selectAll) {
        const toAdd = filteredNames.filter(n => !newNames.includes(n));
        newNames = [...newNames, ...toAdd];
      } else {
        newNames = newNames.filter(n => !filteredNames.includes(n));
      }
      
      const newRooms = generateRooms(prev.staffNames, newNames);
      let doubleRooms = 0;
      let singleRooms = 0;
      newRooms.forEach(room => {
        if (room.person1 && room.person2) doubleRooms++;
        else if (room.person1 || room.person2) singleRooms++;
      });

      return { 
        ...prev, 
        directorNames: newNames,
        staffRooms: newRooms,
        staffDoubleRooms: doubleRooms.toString(),
        staffSingleRooms: singleRooms.toString()
      };
    });
  };

  const handleSelectAllExecutives = (selectAll: boolean) => {
    setFormData(prev => {
      const filteredNames = filteredPersonnel.map(p => p.name);
      let newNames = [...prev.executiveNames];
      if (selectAll) {
        const toAdd = filteredNames.filter(n => !newNames.includes(n));
        newNames = [...newNames, ...toAdd];
      } else {
        newNames = newNames.filter(n => !filteredNames.includes(n));
      }
      return { ...prev, executiveNames: newNames };
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Basic Info */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          ข้อมูลโครงการอบรม
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="projectName">ชื่อโครงการ</label>
            <input id="projectName" value={formData.projectName} onChange={handleChange} className={inputClass} placeholder="ระบุชื่อโครงการ..." />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="location">สถานที่จัดงาน / สถานที่อบรม</label>
            <input id="location" value={formData.location} onChange={handleChange} className={inputClass} placeholder="เช่น ห้องฝึกอบรม ชั้น 3 อาคารสถาบันวิทยาการอวกาศ..." />
          </div>
          <div>
            <label className={labelClass} htmlFor="date">วันที่</label>
            <input type="date" id="date" value={formData.date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="days">จำนวนวันอบรม</label>
            <input type="number" id="days" value={formData.days} onChange={handleChange} className={inputClass} min="1" placeholder="เช่น 2" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="totalAttendees">จำนวนผู้เข้าร่วมทั้งหมด (คน)</label>
            <input type="number" id="totalAttendees" value={formData.totalAttendees} onChange={handleChange} className={inputClass} min="1" placeholder="รวมทุกคนที่เข้าร่วม" />
          </div>
        </div>
      </div>

      {/* Speakers */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <UserCheck className="w-4 h-4 text-primary" />
          </div>
          ข้อมูลวิทยากร
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass} htmlFor="speakerThaiNormal">วิทยากรไทย - ปกติ (คน)</label>
            <input type="number" id="speakerThaiNormal" value={formData.speakerThaiNormal} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
          <div>
            <label className={labelClass} htmlFor="speakerThaiExpert">วิทยากรไทย - เชี่ยวชาญ (คน)</label>
            <input type="number" id="speakerThaiExpert" value={formData.speakerThaiExpert} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
          <div>
            <label className={labelClass} htmlFor="speakerForeign">วิทยากรต่างประเทศ (คน)</label>
            <input type="number" id="speakerForeign" value={formData.speakerForeign} onChange={handleChange} className={inputClass} min="0" placeholder="0" />
          </div>
          {parseInt(formData.speakerForeign) > 0 && (
            <div className="md:col-span-2 space-y-3 bg-muted/30 p-4 rounded-xl border border-border/40">
              <span className="text-xs font-bold text-muted-foreground block">ระบุค่าตั๋วเครื่องบิน/เดินทางต่างประเทศ แยกรายคน (บาท)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: parseInt(formData.speakerForeign) || 0 }).map((_, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1" htmlFor={`speakerForeignFlightFee-${idx}`}>
                      วิทยากรต่างประเทศท่านที่ {idx + 1} (บาท)
                    </label>
                    <input
                      type="number"
                      id={`speakerForeignFlightFee-${idx}`}
                      value={formData.speakerForeignFlightFees?.[idx] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => {
                          const fees = [...(prev.speakerForeignFlightFees || [])];
                          fees[idx] = val;
                          return { ...prev, speakerForeignFlightFees: fees };
                        });
                      }}
                      className={inputClass}
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {((parseInt(formData.speakerThaiNormal) || 0) + (parseInt(formData.speakerThaiExpert) || 0) + (parseInt(formData.speakerForeign) || 0)) > 0 && (
            <div className="md:col-span-2 space-y-3 bg-muted/30 p-4 rounded-xl border border-border/40">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" id="speakerNeedsTravel" checked={formData.speakerNeedsTravel} onChange={handleChange} className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                    {formData.speakerNeedsTravel && <UserCheck className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">เบิกค่าพาหนะวิทยากร (ค่าแท็กซี่ ไป-กลับ)</span>
              </label>
              
              {formData.speakerNeedsTravel && (
                <div className="pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1" htmlFor="speakerTaxiFee">
                    ระบุจำนวนเงินค่าแท็กซี่ (บาท ต่อคน)
                  </label>
                  <input
                    type="number"
                    id="speakerTaxiFee"
                    value={formData.speakerTaxiFee || ''}
                    onChange={handleChange}
                    className={inputClass}
                    min="0"
                    placeholder="ปล่อยว่างหากต้องการเว้นช่องว่างไปเขียนเขียนเองใน Excel"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Staff & Executives */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Users className="w-4 h-4 text-primary" />
          </div>
          เจ้าหน้าที่และผู้บริหาร
        </h3>

        <div className="space-y-6">
          {/* Executives */}
          <div className="bg-muted/50 p-5 rounded-xl border border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <h4 className={subTitleClass} style={{ marginBottom: 0 }}>1. เลือกผู้บริหารที่เข้าร่วม (ระดับ รอง ผสทอภ. / ผสทอภ.)</h4>
              {formData.executiveNames.length > 0 && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full w-fit">
                  เลือกแล้ว {formData.executiveNames.length} ท่าน
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อผู้บริหาร..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={inputClass} 
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap bg-background border border-border rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <input 
                  type="checkbox" 
                  className="rounded border-border/60 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                  checked={filteredPersonnel.length > 0 && filteredPersonnel.every(p => formData.executiveNames.includes(p.name))}
                  onChange={(e) => handleSelectAllExecutives(e.target.checked)}
                />
                <span className="text-sm font-medium text-foreground/80">เลือกทั้งหมด</span>
              </label>
            </div>
            
            <div className="max-h-56 overflow-y-auto border border-border/60 bg-background rounded-lg p-2 space-y-1 shadow-inner">
              {filteredPersonnel.map((p, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${formData.executiveNames.includes(p.name) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted border border-transparent'}`}>
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={formData.executiveNames.includes(p.name)}
                      onChange={() => handleExecutiveToggle(p.name)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                      {formData.executiveNames.includes(p.name) && <UserPlus className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${formData.executiveNames.includes(p.name) ? 'text-primary' : 'text-foreground'}`}>{p.name}</div>
                    {p.title && <div className="text-xs text-muted-foreground mt-0.5">{p.title}</div>}
                  </div>
                </label>
              ))}
              {filteredPersonnel.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">ไม่พบข้อมูลผู้บริหาร</div>}
            </div>
          </div>

          {/* Directors */}
          <div className="bg-muted/50 p-5 rounded-xl border border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <h4 className={subTitleClass} style={{ marginBottom: 0 }}>2. เลือกผู้อำนวยการที่เข้าร่วม (ระดับ ผอ.สำนัก)</h4>
              {formData.directorNames.length > 0 && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full w-fit">
                  เลือกแล้ว {formData.directorNames.length} ท่าน
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อผู้อำนวยการ..." 
                  value={searchDirectorTerm}
                  onChange={e => setSearchDirectorTerm(e.target.value)}
                  className={inputClass} 
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap bg-background border border-border rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <input 
                  type="checkbox" 
                  className="rounded border-border/60 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                  checked={filteredDirectors.length > 0 && filteredDirectors.every(d => formData.directorNames.includes(d.name))}
                  onChange={(e) => handleSelectAllDirectors(e.target.checked)}
                />
                <span className="text-sm font-medium text-foreground/80">เลือกทั้งหมด</span>
              </label>
            </div>
            
            <div className="max-h-56 overflow-y-auto border border-border/60 bg-background rounded-lg p-2 space-y-1 shadow-inner">
              {filteredDirectors.map((d, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${formData.directorNames.includes(d.name) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted border border-transparent'}`}>
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={formData.directorNames.includes(d.name)}
                      onChange={() => handleDirectorToggle(d.name)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                      {formData.directorNames.includes(d.name) && <UserPlus className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${formData.directorNames.includes(d.name) ? 'text-primary' : 'text-foreground'}`}>
                      {d.name} <span className="text-muted-foreground/50 text-xs ml-1">({d.gender === 'M' ? 'ชาย' : 'หญิง'})</span>
                    </div>
                    {d.title && <div className="text-xs text-muted-foreground mt-0.5">{d.title} (สำนัก {d.sheet})</div>}
                  </div>
                </label>
              ))}
              {filteredDirectors.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">ไม่พบข้อมูลผู้อำนวยการ</div>}
            </div>
          </div>

          {/* Staff */}
          <div className="bg-muted/50 p-5 rounded-xl border border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <h4 className={subTitleClass} style={{ marginBottom: 0 }}>3. เลือกเจ้าหน้าที่ สบร. (ระดับ จนท.)</h4>
              {formData.staffNames.length > 0 && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full w-fit">
                  เลือกแล้ว {formData.staffNames.length} ท่าน
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อเจ้าหน้าที่..." 
                  value={searchStaffTerm}
                  onChange={e => setSearchStaffTerm(e.target.value)}
                  className={inputClass} 
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap bg-background border border-border rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <input 
                  type="checkbox" 
                  className="rounded border-border/60 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                  checked={filteredStaff.length > 0 && filteredStaff.every(s => formData.staffNames.includes(s.name))}
                  onChange={(e) => handleSelectAllStaff(e.target.checked)}
                />
                <span className="text-sm font-medium text-foreground/80">เลือกทั้งหมด</span>
              </label>
            </div>
            
            <div className="max-h-56 overflow-y-auto border border-border/60 bg-background rounded-lg p-2 space-y-1 shadow-inner">
              {filteredStaff.map((s, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${formData.staffNames.includes(s.name) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted border border-transparent'}`}>
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={formData.staffNames.includes(s.name)}
                      onChange={() => handleStaffToggle(s.name)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                      {formData.staffNames.includes(s.name) && <UserPlus className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${formData.staffNames.includes(s.name) ? 'text-primary' : 'text-foreground'}`}>
                      {s.name} <span className="text-muted-foreground/50 text-xs ml-1">({s.gender === 'M' ? 'ชาย' : 'หญิง'})</span>
                    </div>
                    {s.title && <div className="text-xs text-muted-foreground mt-0.5">{s.title}</div>}
                  </div>
                </label>
              ))}
              {filteredStaff.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">ไม่พบข้อมูลเจ้าหน้าที่</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Accommodation */}
      <div className={cardClass}>
        <h3 className={titleClass}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Hotel className="w-4 h-4 text-primary" />
          </div>
          ที่พัก (Accommodation)
        </h3>

        <div className="space-y-4">
          {/* Executive Accommodation */}
          <div className={`border rounded-xl p-5 transition-all duration-300 ${formData.executivesNeedRoom ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-background'}`}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" id="executivesNeedRoom" checked={formData.executivesNeedRoom} onChange={handleChange} className="peer sr-only" />
                <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                  {formData.executivesNeedRoom && <Hotel className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${formData.executivesNeedRoom ? 'text-primary' : 'text-foreground group-hover:text-primary/70'}`}>
                ผู้บริหารต้องการที่พัก
              </span>
            </label>
            {formData.executivesNeedRoom && (
              <div className="mt-4 p-3 bg-white/60 rounded-lg border border-primary/10 text-sm text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 mb-0.5"></span>
                ระบบจะคำนวณ <strong className="text-foreground">ห้องพักเดี่ยวจำนวน {formData.executiveNames.length} ห้อง</strong> อัตโนมัติตามรายชื่อผู้บริหารที่เลือกไว้
              </div>
            )}
          </div>

          {/* Director Accommodation */}
          <div className={`border rounded-xl p-5 transition-all duration-300 ${formData.directorsNeedRoom ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-background'}`}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" id="directorsNeedRoom" checked={formData.directorsNeedRoom} onChange={handleChange} className="peer sr-only" />
                <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                  {formData.directorsNeedRoom && <Hotel className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${formData.directorsNeedRoom ? 'text-primary' : 'text-foreground group-hover:text-primary/70'}`}>
                ผู้อำนวยการต้องการที่พัก
              </span>
            </label>
            {formData.directorsNeedRoom && (
              <div className="mt-4 p-3 bg-white/60 rounded-lg border border-primary/10 text-sm text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 mb-0.5"></span>
                ระบบจะคำนวณ <strong className="text-foreground">ห้องพักเดี่ยวจำนวน {formData.directorNames.length} ห้อง</strong> อัตโนมัติตามรายชื่อผู้อำนวยการที่เลือกไว้
              </div>
            )}
          </div>

          {/* Staff Accommodation */}
          <div className={`border rounded-xl p-5 transition-all duration-300 ${formData.staffNeedsRoom ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-background'}`}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" id="staffNeedsRoom" checked={formData.staffNeedsRoom} onChange={handleChange} className="peer sr-only" />
                <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all">
                  {formData.staffNeedsRoom && <Hotel className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${formData.staffNeedsRoom ? 'text-primary' : 'text-foreground group-hover:text-primary/70'}`}>
                เจ้าหน้าที่ต้องการที่พัก
              </span>
            </label>

            {formData.staffNeedsRoom && (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-white/60 rounded-lg border border-primary/10 text-sm text-muted-foreground">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 mb-0.5"></span>
                  ระบบจะคำนวณ <strong className="text-foreground">ห้องพักคู่จำนวน {formData.staffDoubleRooms || '0'} ห้อง</strong> และ <strong className="text-foreground">ห้องพักเดี่ยวจำนวน {formData.staffSingleRooms || '0'} ห้อง</strong> อัตโนมัติ (แยกชาย-หญิง) ตามรายชื่อเจ้าหน้าที่ที่เลือกไว้
                </div>
                
                {formData.staffNames.length > 0 && (
                  <div className="bg-background rounded-lg border border-border/50 overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      รายชื่อการจับคู่ห้องพัก
                    </div>
                    <div className="divide-y divide-border/50">
                      {formData.staffRooms.map((room) => (
                        <div key={room.id} className="p-3 flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/30 transition-colors">
                          <div className={`flex items-center justify-center w-14 h-8 rounded text-xs font-bold shrink-0 ${(room.person1 && room.person2) ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-600'}`}>
                            ห้อง {room.id}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select 
                              value={room.person1 || ''} 
                              onChange={(e) => handleSlotChange(room.id, 1, e.target.value)}
                              className="text-sm border border-slate-200/10 rounded-xl px-3 py-2 bg-slate-100/40 shadow-neumorph-inset focus:ring-2 focus:ring-accent/50 focus:bg-[#fbfcfd] w-full transition-all"
                            >
                              <option value="" className="text-muted-foreground">- เตียงว่าง -</option>
                              {getValidOptions(room.person1 || '', room.person2 || '').map(name => {
                                const p = staffData.find(s => s.name === name);
                                const tag = p?.title?.includes('ผู้อำนวยการ') ? 'ผอ.' : (p?.gender === 'M' ? 'ชาย' : 'หญิง');
                                return <option key={`1-${name}`} value={name}>{name} ({tag})</option>;
                              })}
                            </select>

                            <select 
                              value={room.person2 || ''} 
                              onChange={(e) => handleSlotChange(room.id, 2, e.target.value)}
                              className="text-sm border border-slate-200/10 rounded-xl px-3 py-2 bg-slate-100/40 shadow-neumorph-inset focus:ring-2 focus:ring-accent/50 focus:bg-[#fbfcfd] w-full transition-all"
                            >
                              <option value="" className="text-muted-foreground">- เตียงว่าง -</option>
                              {getValidOptions(room.person2 || '', room.person1 || '').map(name => {
                                const p = staffData.find(s => s.name === name);
                                const tag = p?.title?.includes('ผู้อำนวยการ') ? 'ผอ.' : (p?.gender === 'M' ? 'ชาย' : 'หญิง');
                                return <option key={`2-${name}`} value={name}>{name} ({tag})</option>;
                              })}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-muted/30 p-3 border-t border-border/50 flex flex-wrap items-center justify-center gap-2">
                      <button 
                        type="button" 
                        onClick={handleAddRoom} 
                        className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มห้องใหม่
                      </button>
                      <button 
                        type="button" 
                        onClick={handleClearAllBeds} 
                        className="text-xs font-medium text-destructive hover:text-destructive/80 flex items-center gap-1.5 bg-destructive/5 hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <Eraser className="w-3.5 h-3.5" /> ล้างเตียงทั้งหมด
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAutoAssignRooms} 
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" /> จัดห้องอัตโนมัติ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Food */}
      <FoodSection formData={formData} setFormData={setFormData} />

    </div>
  );
};
