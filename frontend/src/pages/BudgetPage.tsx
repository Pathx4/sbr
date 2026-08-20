import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ArrowRight, CheckCircle2, ClipboardList, Building, Car, Presentation } from 'lucide-react';
import { initialFormData } from '../types';
import type { BudgetFormData } from '../types';
import { TrainingForm } from '../components/forms/TrainingForm';
import { MeetingForm } from '../components/forms/MeetingForm';
import { FieldTripForm } from '../components/forms/FieldTripForm';
import { DraftsManager } from '../components/common/DraftsManager';
import { exportToExcel } from '../utils/exportExcel';
import personnel from '../data/personnel.json';
import staffSbr from '../data/staff_sbr.json';
import contacts from '../data/contacts.json';
import directors from '../data/directors.json';
import { BudgetAnalyticsCard } from '../components/budget/BudgetAnalyticsCard';
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
};

function BudgetPage() {
  const [formData, setFormData] = useState<BudgetFormData>(() => {
    try {
      const saved = localStorage.getItem('sbr_budget_active_draft');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load active draft', e);
    }
    return initialFormData;
  });
  const [showResult, setShowResult] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const isFormValid = () => {
    if (!formData.regulation) return false;
    if (!formData.activityType) return false;
    const hasDate = (formData.startDate && formData.endDate) || formData.startDate || formData.date;
    if (!hasDate || !formData.days) return false;
    return true; // Basic validation
  };

  const calculateBudgetData = (formData: BudgetFormData) => {
    let result: any = {
      totalCost: 0,
      breakdown: []
    };

    const days = parseInt(formData.days) || 1;
    const isGistda = formData.regulation === 'ระเบียบ สทอภ. (GISTDA)';

    const rates = {
      foodBreak: isGistda ? 100 : 35, // 100 per meal, 2 breaks = 200/day
      foodLunch: isGistda ? 400 : 300,
      foodReception: isGistda ? 1000 : 500,
      speakerThaiNormal: isGistda ? 1200 : 600,
      speakerThaiExpert: isGistda ? 3000 : 1200,
      speakerForeign: isGistda ? 5000 : 2000,
      travelFee: 5000,
      staffRoomDouble: isGistda ? 1400 : 900,
      staffRoomSingle: isGistda ? 1400 : 1200,
      execRoom: isGistda ? 1400 : 1400,
      speakerRoom: isGistda ? 1400 : 1400
    };

    const getGistdaAllowanceRate = (name: string, isExecutive: boolean, isDirector = false) => {
      if (isExecutive) {
        const exec = personnel.find(p => p.name === name);
        const title = exec ? exec.title : '';
        if (title === 'ผสทอภ.' || title === 'รอง ผสทอภ.') {
          return 800;
        }
        return 600; // Default executive rate (ผอ.สำนัก)
      } else if (isDirector || directors.some(d => d.name === name)) {
        return 600; // Directors get 600
      } else {
        const staff = staffSbr.find(s => s.name === name) || contacts.find(c => c.name === name);
        const title = staff ? (staff as any).title || (staff as any).position || '' : '';
        if (title.includes('ผู้อำนวยการสำนัก') || title.includes('ผู้อำนวยการ') || title.includes('ผอ.')) {
          return 600;
        }
        return 400; // Default staff rate
      }
    };

    const getGovAllowanceRate = (_name: string, isExecutive: boolean) => {
      if (isExecutive) {
        return 270; // Gov executive training allowance
      } else {
        return 240; // Gov staff training allowance
      }
    };

    if (formData.activityType === 'training') {
      const attendees = parseInt(formData.totalAttendees) || 0;
      const staffNames = formData.staffNames || [];
      const otherStaffNames = formData.otherStaffNames || [];
      const allStaffNames = [...staffNames, ...otherStaffNames];
      const executiveNames = formData.executiveNames || [];
      const directorNames = formData.directorNames || [];
      const staff = allStaffNames.length || parseInt(formData.staffCount) || 0;
      const execs = executiveNames.length;
      const directorsCount = directorNames.length;
      const totalPeople = attendees + staff + execs + directorsCount;

      // 1. Food Cost
      let foodCost = 0;
      let foodBreakMorningCost = 0;
      let foodBreakAfternoonCost = 0;
      let foodLunchCost = 0;
      let foodRecepCost = 0;

      // Loop days to calculate active food cost
      for (let d = 1; d <= days; d++) {
        if (formData.foodBreakMorning && formData.foodBreakMorningDays.includes(d)) {
          foodBreakMorningCost += rates.foodBreak * totalPeople;
        }
        if (formData.foodBreakAfternoon && formData.foodBreakAfternoonDays.includes(d)) {
          foodBreakAfternoonCost += rates.foodBreak * totalPeople;
        }
        if (formData.foodLunch && formData.foodLunchDays.includes(d)) {
          foodLunchCost += rates.foodLunch * totalPeople;
        }
        if (formData.foodReception && formData.foodReceptionDays.includes(d)) {
          foodRecepCost += rates.foodReception * totalPeople;
        }
      }
      foodCost = foodBreakMorningCost + foodBreakAfternoonCost + foodLunchCost + foodRecepCost;

      if (foodCost > 0) {
        let details: string[] = [];
        if (formData.foodBreakMorning && formData.foodBreakMorningDays.length > 0) details.push(`ว่างเช้า ${formData.foodBreakMorningDays.length} วัน`);
        if (formData.foodBreakAfternoon && formData.foodBreakAfternoonDays.length > 0) details.push(`ว่างบ่าย ${formData.foodBreakAfternoonDays.length} วัน`);
        if (formData.foodLunch && formData.foodLunchDays.length > 0) details.push(`กลางวัน ${formData.foodLunchDays.length} วัน`);
        if (formData.foodReception && formData.foodReceptionDays.length > 0) details.push(`รับรอง ${formData.foodReceptionDays.length} วัน`);
        
        result.breakdown.push({
          label: 'ค่าอาหารและเครื่องดื่ม',
          amount: foodCost,
          detail: `${totalPeople} คน (${details.join(', ')})`
        });
        result.totalCost += foodCost;
      }

      // Other Food & Beverage costs
      const foodOthers = parseFloat(formData.foodOthersAmount) || 0;
      if (foodOthers > 0) {
        result.breakdown.push({
          label: 'ค่าอาหารและเครื่องดื่มอื่นๆ (เพิ่มเติม)',
          amount: foodOthers,
          detail: formData.foodOthersDetails || 'เพิ่มเติม'
        });
        result.totalCost += foodOthers;
      }

      // 2. Speakers
      const spkThaiNorm = parseInt(formData.speakerThaiNormal) || 0;
      const spkThaiExp = parseInt(formData.speakerThaiExpert) || 0;
      const spkFor = parseInt(formData.speakerForeign) || 0;
      
      let spkCost = 0;
      spkCost += spkThaiNorm * rates.speakerThaiNormal * 6 * days;
      spkCost += spkThaiExp * rates.speakerThaiExpert * 6 * days;
      spkCost += spkFor * rates.speakerForeign * 6 * days;

      if (spkCost > 0) {
        let details: string[] = [];
        if (spkThaiNorm > 0) details.push(`ปกติ ${spkThaiNorm} คน`);
        if (spkThaiExp > 0) details.push(`เชี่ยวชาญ ${spkThaiExp} คน`);
        if (spkFor > 0) details.push(`ต่างประเทศ ${spkFor} คน`);
        result.breakdown.push({
          label: 'ค่าตอบแทนวิทยากร',
          amount: spkCost,
          detail: `วิทยากร ${details.join(', ')} (${days} วัน วันละ 6 ชม.)`
        });
        result.totalCost += spkCost;
      }

      // 3. Staff Allowance & Room
      let staffAllowance = 0;
      allStaffNames.forEach((name: string) => {
        const rate = isGistda ? getGistdaAllowanceRate(name, false) : getGovAllowanceRate(name, false);
        staffAllowance += rate * days;
      });
      if (allStaffNames.length === 0 && staff > 0) {
        const rate = isGistda ? 400 : 240;
        staffAllowance = staff * rate * days;
      }

      if (staffAllowance > 0) {
        result.breakdown.push({
          label: 'ค่าเบี้ยเลี้ยงเจ้าหน้าที่',
          amount: staffAllowance,
          detail: `${staff} คน (${days} วัน)`
        });
        result.totalCost += staffAllowance;
      }

      const nights = Math.max(0, days - 1);
      if (formData.staffNeedsRoom && nights > 0) {
        const dRooms = parseInt(formData.staffDoubleRooms) || 0;
        const sRooms = parseInt(formData.staffSingleRooms) || 0;
        const roomCost = ((dRooms * rates.staffRoomDouble) + (sRooms * rates.staffRoomSingle)) * nights;
        if (roomCost > 0) {
          result.breakdown.push({
            label: 'ค่าที่พักเจ้าหน้าที่และผู้อำนวยการ',
            amount: roomCost,
            detail: `${dRooms} ห้องพักคู่, ${sRooms} ห้องพักเดี่ยว (${nights} คืน)`
          });
          result.totalCost += roomCost;
        }
      }

      // 4. Directors Allowance & Room
      let dirAllowance = 0;
      directorNames.forEach((name: string) => {
        const rate = isGistda ? getGistdaAllowanceRate(name, false, true) : getGovAllowanceRate(name, true);
        dirAllowance += rate * days;
      });

      if (dirAllowance > 0) {
        result.breakdown.push({
          label: 'ค่าเบี้ยเลี้ยงผู้อำนวยการ',
          amount: dirAllowance,
          detail: `${directorsCount} ท่าน (${days} วัน)`
        });
        result.totalCost += dirAllowance;
      }

      if (formData.activityType !== 'training' && formData.directorsNeedRoom && directorsCount > 0 && nights > 0) {
        const roomCost = directorsCount * rates.execRoom * nights;
        result.breakdown.push({
          label: 'ค่าที่พักผู้อำนวยการ',
          amount: roomCost,
          detail: `${directorsCount} ท่าน (พักเดี่ยว ${nights} คืน)`
        });
        result.totalCost += roomCost;
      }

      // 5. Executive Allowance & Room
      let execAllowance = 0;
      executiveNames.forEach((name: string) => {
        const rate = isGistda ? getGistdaAllowanceRate(name, true) : getGovAllowanceRate(name, true);
        execAllowance += rate * days;
      });
      
      if (execAllowance > 0) {
        result.breakdown.push({
          label: 'ค่าเบี้ยเลี้ยงผู้บริหาร',
          amount: execAllowance,
          detail: `${execs} ท่าน (${days} วัน)`
        });
        result.totalCost += execAllowance;
      }

      if (formData.executivesNeedRoom && execs > 0 && nights > 0) {
        const roomCost = execs * rates.execRoom * nights;
        result.breakdown.push({
          label: 'ค่าที่พักผู้บริหาร',
          amount: roomCost,
          detail: `${execs} ท่าน (พักเดี่ยว ${nights} คืน)`
        });
        result.totalCost += roomCost;
      }

      // 5. Speaker Room & Travel
      const totalSpeakers = spkThaiNorm + spkThaiExp + spkFor;
      if (totalSpeakers > 0 && nights > 0) {
        const speakerRoomCost = totalSpeakers * rates.speakerRoom * nights;
        result.breakdown.push({
          label: 'ค่าที่พักวิทยากร',
          amount: speakerRoomCost,
          detail: `${totalSpeakers} คน (พักเดี่ยว ${nights} คืน)`
        });
        result.totalCost += speakerRoomCost;
      }

      const taxiRate = formData.speakerTaxiFee ? (parseFloat(formData.speakerTaxiFee) || 0) : 1000;
      if (totalSpeakers > 0 && formData.speakerNeedsTravel && taxiRate > 0) {
        const taxiCost = totalSpeakers * taxiRate;
        result.breakdown.push({
          label: 'ค่าพาหนะวิทยากร',
          amount: taxiCost,
          detail: `ค่าแท็กซี่วิทยากรเดินทาง ไป-กลับ (${totalSpeakers} คน คนละ ${taxiRate.toLocaleString()} บาท)`
        });
        result.totalCost += taxiCost;
      }

      // Foreign speaker flight/travel cost (sum of flightFees array)
      const flightFees = (formData.speakerForeignFlightFees || []).map((f: any) => parseFloat(f) || 0);
      const totalFlightFee = flightFees.reduce((acc: number, val: number) => acc + val, 0);
      if (totalFlightFee > 0) {
        result.breakdown.push({
          label: 'ค่าบัตรโดยสารเครื่องบินวิทยากรต่างประเทศ',
          amount: totalFlightFee,
          detail: `วิทยากรต่างประเทศ (${spkFor} คน)`
        });
        result.totalCost += totalFlightFee;
      }

      const parseCost = (val: string) => parseInt(val) || 0;
      const toll = parseCost(formData.tollFee);
      if (toll > 0) {
        result.breakdown.push({
          label: 'ค่าทางด่วนสำหรับวิทยากร',
          amount: toll,
          detail: 'ตามจ่ายจริง'
        });
        result.totalCost += toll;
      }
    } else if (formData.activityType === 'meeting' || formData.activityType === 'field_trip') {
      const committee = parseInt(formData.committeeCount) || 0;

      // 1. Food Cost
      let foodCost = 0;
      let foodBreakMorningCost = 0;
      let foodBreakAfternoonCost = 0;
      let foodLunchCost = 0;
      let foodRecepCost = 0;

      for (let d = 1; d <= days; d++) {
        if (formData.foodBreakMorning && formData.foodBreakMorningDays.includes(d)) {
          foodBreakMorningCost += rates.foodBreak * committee;
        }
        if (formData.foodBreakAfternoon && formData.foodBreakAfternoonDays.includes(d)) {
          foodBreakAfternoonCost += rates.foodBreak * committee;
        }
        if (formData.foodLunch && formData.foodLunchDays.includes(d)) {
          foodLunchCost += rates.foodLunch * committee;
        }
        if (formData.foodReception && formData.foodReceptionDays.includes(d)) {
          foodRecepCost += rates.foodReception * committee;
        }
      }
      foodCost = foodBreakMorningCost + foodBreakAfternoonCost + foodLunchCost + foodRecepCost;

      if (foodCost > 0) {
        let details: string[] = [];
        if (formData.foodBreakMorning && formData.foodBreakMorningDays.length > 0) details.push(`ว่างเช้า ${formData.foodBreakMorningDays.length} วัน`);
        if (formData.foodBreakAfternoon && formData.foodBreakAfternoonDays.length > 0) details.push(`ว่างบ่าย ${formData.foodBreakAfternoonDays.length} วัน`);
        if (formData.foodLunch && formData.foodLunchDays.length > 0) details.push(`กลางวัน ${formData.foodLunchDays.length} วัน`);
        if (formData.foodReception && formData.foodReceptionDays.length > 0) details.push(`รับรอง ${formData.foodReceptionDays.length} วัน`);

        result.breakdown.push({
          label: 'ค่าอาหารและเครื่องดื่ม',
          amount: foodCost,
          detail: `${committee} คน (${details.join(', ')})`
        });
        result.totalCost += foodCost;
      }

      const foodOthers = parseFloat(formData.foodOthersAmount) || 0;
      if (foodOthers > 0) {
        result.breakdown.push({
          label: 'ค่าอาหารและเครื่องดื่มอื่นๆ (เพิ่มเติม)',
          amount: foodOthers,
          detail: formData.foodOthersDetails || 'เพิ่มเติม'
        });
        result.totalCost += foodOthers;
      }

      // 2. Allowance
      if (committee > 0) {
        const allowanceRate = isGistda ? 400 : 240;
        const allowance = committee * allowanceRate * days;
        result.breakdown.push({
          label: 'ค่าเบี้ยเลี้ยงคณะทำงาน',
          amount: allowance,
          detail: `${committee} คน (${days} วัน)`
        });
        result.totalCost += allowance;
      }

      // 3. Explicit costs
      const parseCost = (val: string) => parseInt(val) || 0;
      const toll = parseCost(formData.tollFee);
      const room = parseCost(formData.roomRental);

      if (toll > 0) { result.breakdown.push({ label: 'ค่าทางด่วน', amount: toll, detail: 'ตามจ่ายจริง' }); result.totalCost += toll; }
      if (room > 0) { result.breakdown.push({ label: 'ค่าเช่าห้องประชุม', amount: room, detail: 'ตามจ่ายจริง' }); result.totalCost += room; }

      if (formData.activityType === 'field_trip') {
        const car = parseCost(formData.carRental);
        const ins = parseCost(formData.insurance);
        if (car > 0) { result.breakdown.push({ label: 'ค่าเช่ารถและค่าน้ำมัน', amount: car, detail: 'ตามจ่ายจริง' }); result.totalCost += car; }
        if (ins > 0) { result.breakdown.push({ label: 'ค่าประกันภัยการเดินทาง', amount: ins, detail: 'ตามจ่ายจริง' }); result.totalCost += ins; }
      }
    }

    // Custom Other Expenses (ค่าใช้จ่ายอื่นๆ: ชื่อรายการ และ จำนวนเงิน)
    const otherExpAmt = parseFloat(formData.otherExpenseAmount) || 0;
    if (otherExpAmt > 0) {
      result.breakdown.push({
        label: formData.otherExpenseName || 'ค่าใช้จ่ายอื่นๆ',
        amount: otherExpAmt,
        detail: 'ตามจ่ายจริง'
      });
      result.totalCost += otherExpAmt;
    }

    if (formData.otherExpenses && formData.otherExpenses.length > 0) {
      formData.otherExpenses.forEach((item) => {
        const amt = parseFloat(item.amount) || 0;
        if (amt > 0) {
          result.breakdown.push({
            label: item.name || 'ค่าใช้จ่ายอื่นๆ',
            amount: amt,
            detail: 'ตามจ่ายจริง'
          });
          result.totalCost += amt;
        }
      });
    }

    return result;
  };

  // Recalculate automatically in real-time
  useEffect(() => {
    if (isFormValid()) {
      const res = calculateBudgetData(formData);
      setCalculationResult(res);
    } else {
      setCalculationResult(null);
      setShowResult(false);
    }
  }, [formData]);

  const handleCalculate = () => {
    if (!isFormValid()) return;
    const res = calculateBudgetData(formData);
    setCalculationResult(res);
    setShowResult(true);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  const handleExportExcel = async () => {
    if (!calculationResult) return;
    try {
      await exportToExcel(formData, calculationResult);
    } catch (error) {
      console.error("Failed to export Excel", error);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ Excel");
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-accent/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-accent-secondary/[0.03] blur-[120px] pointer-events-none" />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mb-10 max-w-4xl"
        >
          <motion.div variants={fadeInUp} className="mb-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Budget Allocation System v2.0
            </span>
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
            ระบบประมาณค่าใช้จ่าย<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-secondary">
              กิจกรรม
            </span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            รองรับการคำนวณแยกตามประเภทกิจกรรม: อบรม ประชุม และลงพื้นที่ภาคสนาม พร้อมระบบจับคู่นอนและดึงข้อมูลผู้บริหารอัตโนมัติ
          </motion.p>
        </motion.div>

        {/* Main Content Grid */}
        <div className={`grid gap-8 items-start transition-all duration-500 ${
          showResult && calculationResult 
            ? 'grid-cols-1 xl:grid-cols-12' 
            : 'grid-cols-1 max-w-5xl mx-auto'
        }`}>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`space-y-8 ${showResult && calculationResult ? 'xl:col-span-8' : 'w-full'}`}
          >
            {/* Saved Drafts & Presets Control Bar */}
            <DraftsManager 
              formData={formData} 
              setFormData={setFormData} 
              onReset={() => {
                setCalculationResult(null);
                setShowResult(false);
              }}
            />

            {/* Step 1: Regulation */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-100/70 text-blue-700 text-xs font-black">1</span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">เลือกฐานระเบียบอ้างอิง</h3>
                  <p className="text-xs text-slate-500">เลือกระเบียบที่ต้องการใช้ในการคำนวณงบประมาณ</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {['ระเบียบสำนักงบประมาณ', 'ระเบียบ สทอภ. (GISTDA)'].map((reg) => (
                  <motion.div
                    key={reg}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setFormData({ ...formData, regulation: reg })}
                    className={`
                      relative flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
                      ${formData.regulation === reg
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs font-bold'
                        : 'border-slate-200/80 bg-slate-50/40 text-slate-700 hover:border-blue-200 hover:bg-slate-50 font-medium'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className={`w-5 h-5 shrink-0 ${formData.regulation === reg ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-sm">{reg}</span>
                    </div>
                    {formData.regulation === reg && (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-blue-600" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Step 2: Activity Type */}
            <AnimatePresence>
              {formData.regulation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-100/70 text-blue-700 text-xs font-black">2</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">เลือกประเภทกิจกรรม</h3>
                      <p className="text-xs text-slate-500">รูปแบบฟอร์มจะเปลี่ยนไปตามประเภทกิจกรรมที่เลือก</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {[
                      { type: 'training', label: 'อบรม / สัมมนา', icon: Presentation, color: 'text-purple-600 bg-purple-50' },
                      { type: 'meeting', label: 'การประชุม', icon: Building, color: 'text-blue-600 bg-blue-50' },
                      { type: 'field_trip', label: 'ออกเดินทางภาคสนาม', icon: Car, color: 'text-emerald-600 bg-emerald-50' }
                    ].map(act => {
                      const Icon = act.icon;
                      const isSelected = formData.activityType === act.type;
                      return (
                        <motion.div
                          key={act.type}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormData({ ...formData, activityType: act.type as any })}
                          className={`p-4 rounded-2xl border-2 cursor-pointer text-center transition-all duration-200 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                              : 'border-slate-200/80 bg-slate-50/40 hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${act.color} shadow-xs`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={`text-xs sm:text-sm font-bold block ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {act.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Dynamic Form */}
            <AnimatePresence mode="wait">
              {formData.activityType && (
                <motion.div
                  key={formData.activityType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-100/70 text-blue-700 text-xs font-black">3</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">กรอกข้อมูลรายละเอียดโครงการ</h3>
                      <p className="text-xs text-slate-500">ระบุจำนวนคน ระยะเวลา และค่าใช้จ่ายต่างๆ</p>
                    </div>
                  </div>

                  {formData.activityType === 'training' && <TrainingForm formData={formData} setFormData={setFormData} />}
                  {formData.activityType === 'meeting' && <MeetingForm formData={formData} setFormData={setFormData} />}
                  {formData.activityType === 'field_trip' && <FieldTripForm formData={formData} setFormData={setFormData} />}

                  <motion.div
                    whileHover={{ scale: isFormValid() ? 1.01 : 1, y: isFormValid() ? -2 : 0 }}
                    whileTap={{ scale: isFormValid() ? 0.98 : 1 }}
                  >
                    <button
                      className={`w-full mt-4 h-14 text-sm sm:text-base font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
                        isFormValid() 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] cursor-pointer' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                      onClick={handleCalculate}
                      disabled={!isFormValid()}
                    >
                      <Calculator className="w-5 h-5" />
                      <span>คำนวณงบประมาณอัตโนมัติ</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Result Section */}
          {showResult && calculationResult && (
            <div ref={resultRef} className="xl:col-span-4 xl:sticky xl:top-8 animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              {/* Visual Category Breakdown & Multi-segment bar */}
              <BudgetAnalyticsCard formData={formData} calculationResult={calculationResult} />

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-200 inline-block mb-1.5">
                      ✓ คำนวณเรียบร้อย
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">สรุปงบประมาณโครงการ</h3>
                    <p className="text-xs text-slate-500 mt-0.5">อ้างอิงจาก {formData.regulation}</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {calculationResult.breakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-3 gap-3">
                      <div className="min-w-0">
                        <span className="text-slate-800 block text-xs font-bold">{item.label}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-2">{item.detail}</span>
                      </div>
                      <span className="font-mono text-sm sm:text-base font-bold text-slate-900 shrink-0">
                        ฿ {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t-2 border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-4 rounded-2xl border">
                  <div className="flex justify-between items-end gap-2">
                    <span className="text-sm font-bold text-slate-700">ยอดรวมทั้งสิ้น</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-mono">
                      ฿ {calculationResult.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full flex items-center justify-center gap-2 p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-[0.98]"
                >
                  <span>📥 Export เป็น Excel (ตามแบบฟอร์ม ฝบร.)</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default BudgetPage;
