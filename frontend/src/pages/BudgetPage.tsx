import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ArrowRight, CheckCircle2, ClipboardList, Building, Car, Presentation } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { initialFormData } from '../types';
import type { BudgetFormData } from '../types';
import { TrainingForm } from '../components/forms/TrainingForm';
import { MeetingForm } from '../components/forms/MeetingForm';
import { FieldTripForm } from '../components/forms/FieldTripForm';
import { exportToExcel } from '../utils/exportExcel';
import personnel from '../data/personnel.json';
import staffSbr from '../data/staff_sbr.json';
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
};

function BudgetPage() {
  const [formData, setFormData] = useState<BudgetFormData>(initialFormData);
  const [showResult, setShowResult] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const isFormValid = () => {
    if (!formData.regulation) return false;
    if (!formData.activityType) return false;
    if (!formData.date || !formData.days) return false;
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
      } else if (isDirector) {
        return 600; // Directors get 600
      } else {
        const staff = staffSbr.find(s => s.name === name);
        const title = staff ? staff.title : '';
        if (title.includes('ผู้อำนวยการสำนัก') || title.includes('ผู้อำนวยการ')) {
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
      const executiveNames = formData.executiveNames || [];
      const directorNames = formData.directorNames || [];
      const staff = staffNames.length || parseInt(formData.staffCount) || 0;
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
      staffNames.forEach((name: string) => {
        const rate = isGistda ? getGistdaAllowanceRate(name, false) : getGovAllowanceRate(name, false);
        staffAllowance += rate * days;
      });
      if (staffNames.length === 0 && staff > 0) {
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
            label: 'ค่าที่พักเจ้าหน้าที่',
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

      if (formData.directorsNeedRoom && directorsCount > 0 && nights > 0) {
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

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12 md:py-16">
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mb-12 max-w-3xl"
        >
          <motion.div variants={fadeInUp} className="mb-8">
            <Badge pulse>Budget Allocation System v2.0</Badge>
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            ระบบจัดสรรงบประมาณ<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-secondary">
              อัจฉริยะ
            </span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            รองรับการคำนวณแยกตามประเภทกิจกรรม: อบรม ประชุม และลงพื้นที่ภาคสนาม พร้อมระบบจับคู่นอนและดึงข้อมูลผู้บริหารอัตโนมัติ
          </motion.p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Step 1: Regulation */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">1</span>
                  เลือกฐานระเบียบอ้างอิง
                </CardTitle>
                <CardDescription>เลือกระเบียบที่ต้องการใช้ในการคำนวณงบประมาณ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['ระเบียบสำนักงบประมาณ', 'ระเบียบ สทอภ. (GISTDA)'].map((reg) => (
                    <div
                      key={reg}
                      onClick={() => setFormData({ ...formData, regulation: reg })}
                      className={`
                        relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${formData.regulation === reg
                          ? 'border-primary bg-primary/5 text-primary shadow-[0_0_15px_rgba(0,82,255,0.1)]'
                          : 'border-border bg-card hover:border-primary/30 hover:bg-accent/10'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList className={`w-5 h-5 shrink-0 ${formData.regulation === reg ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-medium text-sm md:text-base">{reg}</span>
                      </div>
                      {formData.regulation === reg && (
                        <CheckCircle2 className="w-5 h-5 shrink-0 ml-auto text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Activity Type */}
            <AnimatePresence>
              {formData.regulation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">2</span>
                        เลือกประเภทกิจกรรม
                      </CardTitle>
                      <CardDescription>รูปแบบฟอร์มจะเปลี่ยนไปตามประเภทกิจกรรมที่เลือก</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div
                          onClick={() => setFormData({ ...formData, activityType: 'training' })}
                          className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${formData.activityType === 'training' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                        >
                          <Presentation className="w-6 h-6 mx-auto mb-2" />
                          <span className="font-medium">อบรม</span>
                        </div>
                        <div
                          onClick={() => setFormData({ ...formData, activityType: 'meeting' })}
                          className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${formData.activityType === 'meeting' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                        >
                          <Building className="w-6 h-6 mx-auto mb-2" />
                          <span className="font-medium">ประชุม</span>
                        </div>
                        <div
                          onClick={() => setFormData({ ...formData, activityType: 'field_trip' })}
                          className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${formData.activityType === 'field_trip' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                        >
                          <Car className="w-6 h-6 mx-auto mb-2" />
                          <span className="font-medium">ออกเดินทางภาคสนาม</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                >
                  <Card className="border-border/50 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">3</span>
                        กรอกข้อมูลโครงการ
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {formData.activityType === 'training' && <TrainingForm formData={formData} setFormData={setFormData} />}
                      {formData.activityType === 'meeting' && <MeetingForm formData={formData} setFormData={setFormData} />}
                      {formData.activityType === 'field_trip' && <FieldTripForm formData={formData} setFormData={setFormData} />}

                      <motion.div
                        whileHover={{ scale: isFormValid() ? 1.02 : 1, y: isFormValid() ? -2 : 0 }}
                        whileTap={{ scale: isFormValid() ? 0.98 : 1 }}
                      >
                        <Button
                          className={`w-full mt-8 h-14 text-lg rounded-2xl transition-all duration-500 border-0 ${isFormValid() ? 'bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-xl shadow-primary/30 text-white' : 'bg-accent/20 text-accent/50 shadow-none'}`}
                          onClick={handleCalculate}
                          disabled={!isFormValid()}
                        >
                          <Calculator className="mr-2 w-6 h-6" />
                          <span className="font-bold tracking-wide">คำนวณงบประมาณ</span>
                          <ArrowRight className="ml-2 w-6 h-6" />
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Result Section */}
          <div ref={resultRef} className="lg:sticky lg:top-8">
            <AnimatePresence>
              {showResult && calculationResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <Card variant="featured" className="h-full">
                    <CardHeader>
                      <Badge className="w-fit mb-4">Results Computed</Badge>
                      <CardTitle className="text-3xl font-bold">สรุปงบประมาณ</CardTitle>
                      <CardDescription>อ้างอิงจาก {formData.regulation}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        {calculationResult.breakdown.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center border-b pb-4">
                            <div>
                              <span className="text-muted-foreground block">{item.label}</span>
                              <span className="text-xs text-muted-foreground/60">{item.detail}</span>
                            </div>
                            <span className="font-mono text-lg font-medium text-foreground">
                              ฿ {item.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t-2 border-border/50">
                        <div className="flex justify-between items-end">
                          <span className="text-lg font-semibold">ยอดรวมทั้งสิ้น</span>
                          <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-secondary">
                            ฿ {calculationResult.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-8">
                        <Button variant="outline" className="w-full bg-transparent border-primary/50 hover:bg-primary/5 text-primary" onClick={handleExportExcel}>
                          Export เป็น Excel (ตามแบบฟอร์ม ฝบร.)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>
    </div>
  );
}

export default BudgetPage;
