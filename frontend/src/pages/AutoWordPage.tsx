import React, { useState, useEffect, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { 
  Upload, FileText, FileSpreadsheet, Plus, Trash2, CheckCircle2, 
  AlertCircle, Sparkles, Building2, UserCheck, Search, Image as ImageIcon,
  Loader2, Calendar, MapPin
} from 'lucide-react';
import contactsData from '../data/contacts.json';
import { generateWordDocument } from '../utils/docxGenerator';
import { generateExcelDocument } from '../utils/excelGenerator';

interface Item {
  id: string;
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  photo?: string;
}

interface Invoice {
  id: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  discount: number;
  items: Item[];
  imagePreview?: string;
}

interface Contact {
  name: string;
  nickname?: string;
  position: string;
  section: string;
  mobile?: string;
  email?: string;
  is_head?: boolean;
}

const REGULATION_OPTIONS = [
  {
    label: "ตาราง 1 ลำดับ 3 - หนังสือ ว 119 (สำหรับบริหารงาน/ฝึกอบรม/จัดประชุม)",
    value: "หนังสือคณะกรรมการวินิจฉัยปัญหาการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ กรมบัญชีกลาง ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119 ลงวันที่ 7 มีนาคม 2561 เรื่องแนวทางการปฎิบัติในการดำเนินการจัดหาพัสดุที่เกี่ยวกับค่าใช้จ่ายในการบริหารงาน ค่าใช้จ่ายในการฝึกอบรม การจัดงาน และการประชุมของหน่วยงานของรัฐ ตาราง 1 ลำดับที่ 3"
  },
  {
    label: "ตาราง 1 ลำดับ 1 - ระเบียบกระทรวงการคลัง พ.ศ. 2560 (สำหรับวัสดุสำนักงาน/คอมพิวเตอร์ทั่วไป)",
    value: "ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ตาราง 1 ลำดับที่ 1"
  }
];

export default function AutoWordPage() {
  // State
  const [department, setDepartment] = useState('สำนักบริหารเครือข่ายและสร้างความตระหนัก (สบร.)');
  const [introCourse, setIntroCourse] = useState('จัดซื้อวัสดุสำหรับการจัดกิจกรรมและดำเนินงานโครงการ');
  const [regulatoryText, setRegulatoryText] = useState(REGULATION_OPTIONS[0].value);
  const [excelDateRange, setExcelDateRange] = useState('');
  const [excelLocation, setExcelLocation] = useState('');

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requesterName, setRequesterName] = useState('');
  const [requesterPosition, setRequesterPosition] = useState('');
  const [requesterDate, setRequesterDate] = useState('   /            / 2568');
  
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [approverDate, setApproverDate] = useState('   /            / 2568');

  // Search state for contacts
  const [searchReq, setSearchReq] = useState('');
  const [showReqDropdown, setShowReqDropdown] = useState(false);
  const [searchApp, setSearchApp] = useState('');
  const [showAppDropdown, setShowAppDropdown] = useState(false);

  // Invoices list
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // OCR state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download state
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isGeneratingIllus, setIsGeneratingIllus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Contacts directly from local contacts.json on mount
  useEffect(() => {
    const data = contactsData as Contact[];
    if (Array.isArray(data)) {
      setContacts(data);
      const defaultReq = data.find(c => c.name.includes('ศิริพักตร์'));
      if (defaultReq) {
        setRequesterName(defaultReq.name);
        setRequesterPosition(defaultReq.position || 'เจ้าหน้าที่ผู้รับผิดชอบ');
      }
      const defaultApp = data.find(c => c.name.includes('ปราณปริยา') || c.is_head);
      if (defaultApp) {
        setApproverName(defaultApp.name);
        setApproverPosition(defaultApp.position || 'ผอ.สคร.');
      }
    }
  }, []);

  // Handle OCR Extraction with Tesseract.js
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('กำลังเตรียมเอนจิน Tesseract.js (ภาษาไทย+อังกฤษ)...');

    try {
      const worker = await createWorker('tha+eng');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setScanStatus(`กำลังสแกนรูปที่ ${i + 1}/${files.length}: ${file.name}...`);
        
        // Create image preview URL
        const imagePreview = URL.createObjectURL(file);

        // Perform OCR
        const ret = await worker.recognize(file);
        const text = ret.data.text;
        console.log("OCR Result:", text);

        // Parse extracted text
        const parsed = parseOcrText(text);

        const newInvoice: Invoice = {
          id: Date.now().toString() + '_' + i,
          vendor_name: parsed.vendor_name || 'ร้านค้า / บริษัทผู้ขาย',
          invoice_number: parsed.invoice_number || `INV-${Date.now().toString().slice(-4)}`,
          invoice_date: parsed.invoice_date || getTodayThaiDate(),
          discount: 0,
          items: parsed.items.length > 0 ? parsed.items : [
            {
              id: Date.now().toString() + '_item_0',
              item_code: '',
              description: 'รายการพัสดุ/สินค้า',
              quantity: 1,
              unit: 'ชิ้น',
              unit_price: parsed.total_amount || 0,
              total_price: parsed.total_amount || 0
            }
          ],
          imagePreview
        };

        setInvoices(prev => [...prev, newInvoice]);
        setScanProgress(Math.round(((i + 1) / files.length) * 100));
      }

      await worker.terminate();
      setStatusMsg({ type: 'success', text: 'อ่านรูปภาพด้วย Tesseract OCR เรียบร้อย! คุณสามารถตรวจทานข้อมูลได้เลย' });
    } catch (err: any) {
      console.error("Tesseract error:", err);
      setStatusMsg({ type: 'error', text: `เกิดข้อผิดพลาดขณะสแกนรูป: ${err.message || err}` });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper: Smart Regex Parser for OCR text
  const parseOcrText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let vendor_name = '';
    let invoice_number = '';
    let invoice_date = '';
    let total_amount = 0;
    const items: Item[] = [];

    // 1. Find Vendor Name
    for (const line of lines.slice(0, 8)) {
      if (/บริษัท|หจก\.|ร้าน|ห้างหุ้นส่วน|ศูนย์|สำนักงาน|IT CITY|B2S|OfficeMate|Big C|Lotus/i.test(line)) {
        vendor_name = line.replace(/^[^\wก-ฮ]+/, '').trim();
        break;
      }
    }
    if (!vendor_name && lines.length > 0) {
      vendor_name = lines[0];
    }

    // 2. Find Invoice Number
    const invMatch = text.match(/(?:เลขที่|INV|No\.|Doc No|Tax Invoice No)[^\d\n]*([A-Z0-9\/\-]+)/i);
    if (invMatch) {
      invoice_number = invMatch[1].trim();
    }

    // 3. Find Date
    const dateMatch = text.match(/(\d{1,2})\s*[\/\-\.\s]\s*([ก-ฮa-zA-Z0-9]+)\s*[\/\-\.\s]\s*(\d{2,4})/);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      let year = dateMatch[3];
      if (year.length === 2) year = '25' + year;
      invoice_date = `${day} ${month} ${year}`;
    }

    // 4. Find Total Amount
    const totalMatch = text.match(/(?:ราคารวม|รวมเงิน|สุทธิ|TOTAL|Grand Total)[^\d\n]*([\d,]+\.?\d*)/i);
    if (totalMatch) {
      total_amount = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
    }

    // 5. Find Item lines
    const numberRegex = /([\d,]+\.\d{2})/g;
    lines.forEach((line, idx) => {
      const matches = line.match(numberRegex);
      if (matches && matches.length >= 1) {
        const price = parseFloat(matches[matches.length - 1].replace(/,/g, ''));
        if (price > 0 && price !== total_amount && !/รวม|VAT|Tax|ภาษี|ส่วนลด/i.test(line)) {
          const desc = line.replace(/[\d,]+\.\d{2}/g, '').trim();
          if (desc.length > 2) {
            items.push({
              id: Date.now().toString() + '_' + idx,
              item_code: '',
              description: desc,
              quantity: 1,
              unit: 'ชิ้น',
              unit_price: price,
              total_price: price
            });
          }
        }
      }
    });

    return { vendor_name, invoice_number, invoice_date, total_amount, items };
  };

  const getTodayThaiDate = () => {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;
  };

  // Add Empty Invoice
  const handleAddInvoice = () => {
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      vendor_name: '',
      invoice_number: `INV-${Date.now().toString().slice(-4)}`,
      invoice_date: getTodayThaiDate(),
      discount: 0,
      items: [
        {
          id: Date.now().toString() + '_0',
          item_code: '',
          description: '',
          quantity: 1,
          unit: 'ชิ้น',
          unit_price: 0,
          total_price: 0
        }
      ]
    };
    setInvoices(prev => [...prev, newInvoice]);
  };

  // Delete Invoice
  const handleDeleteInvoice = (invId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invId));
  };

  // Update Invoice Field
  const handleUpdateInvoice = (invId: string, field: keyof Invoice, val: any) => {
    setInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, [field]: val } : inv));
  };

  // Add Item to Invoice
  const handleAddItem = (invId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invId) {
        const newItem: Item = {
          id: Date.now().toString(),
          item_code: '',
          description: '',
          quantity: 1,
          unit: 'ชิ้น',
          unit_price: 0,
          total_price: 0
        };
        return { ...inv, items: [...inv.items, newItem] };
      }
      return inv;
    }));
  };

  // Delete Item from Invoice
  const handleDeleteItem = (invId: string, itemId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invId) {
        return { ...inv, items: inv.items.filter(item => item.id !== itemId) };
      }
      return inv;
    }));
  };

  // Update Item Field
  const handleUpdateItem = (invId: string, itemId: string, field: keyof Item, val: any) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invId) {
        const updatedItems = inv.items.map(item => {
          if (item.id === itemId) {
            const updated = { ...item, [field]: val };
            if (field === 'quantity' || field === 'unit_price') {
              const qty = field === 'quantity' ? Number(val) : item.quantity;
              const price = field === 'unit_price' ? Number(val) : item.unit_price;
              updated.total_price = qty * price;
            }
            return updated;
          }
          return item;
        });
        return { ...inv, items: updatedItems };
      }
      return inv;
    }));
  };

  // Upload Item Photo (For Illustration Excel)
  const handleItemPhotoUpload = (invId: string, itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      handleUpdateItem(invId, itemId, 'photo', base64);
    };
    reader.readAsDataURL(file);
  };

  // Compute Totals
  const calculateGrandTotal = () => {
    return invoices.reduce((acc, inv) => {
      const invTotal = inv.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
      return acc + Math.max(0, invTotal - (inv.discount || 0));
    }, 0);
  };

  // Payload Builder
  const buildPayload = () => {
    return {
      department,
      intro_course: introCourse,
      regulatory_text: regulatoryText,
      excel_date_range: excelDateRange,
      excel_location: excelLocation,
      requester_name: requesterName,
      requester_position: requesterPosition,
      requester_date: requesterDate,
      approver_name: approverName,
      approver_position: approverPosition,
      approver_date: approverDate,
      invoices: invoices.map(inv => ({
        vendor_name: inv.vendor_name,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        discount: Number(inv.discount || 0),
        grand_total: inv.items.reduce((s, i) => s + (i.total_price || 0), 0) - Number(inv.discount || 0),
        items: inv.items.map(item => ({
          item_code: item.item_code,
          description: item.description,
          quantity: Number(item.quantity || 1),
          unit: item.unit || 'ชิ้น',
          unit_price: Number(item.unit_price || 0),
          total_price: Number(item.total_price || 0),
          photo: item.photo || undefined
        }))
      }))
    };
  };

  // Generate Word Document (.docx) Client-Side
  const handleGenerateWord = async () => {
    if (invoices.length === 0) {
      setStatusMsg({ type: 'error', text: 'กรุณาเพิ่มบิล/รายการพัสดุอย่างน้อย 1 รายการก่อนสร้างเอกสาร' });
      return;
    }
    setIsGeneratingDocx(true);
    setStatusMsg(null);

    try {
      const blob = await generateWordDocument(buildPayload());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg({ type: 'success', text: 'สร้างเอกสาร Word (.docx) สำเร็จแล้ว!' });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: `ไม่สามารถสร้างเอกสาร Word ได้: ${err.message || err}` });
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Generate Expense Summary Excel (.xlsx) Client-Side
  const handleGenerateExcel = async (isIllustration = false) => {
    if (invoices.length === 0) {
      setStatusMsg({ type: 'error', text: 'กรุณาเพิ่มบิล/รายการพัสดุอย่างน้อย 1 รายการก่อนสร้างตาราง Excel' });
      return;
    }

    if (isIllustration) setIsGeneratingIllus(true);
    else setIsGeneratingExcel(true);
    setStatusMsg(null);

    try {
      const payload = { ...buildPayload(), is_illustration: isIllustration };
      const blob = await generateExcelDocument(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isIllustration ? 'ภาพประกอบ.xlsx' : 'สรุปค่าใช้จ่าย_เบิกเงินค่าพัสดุ.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg({ 
        type: 'success', 
        text: isIllustration ? 'สร้างไฟล์ Excel ภาพประกอบ (.xlsx) สำเร็จแล้ว!' : 'สร้างไฟล์ Excel สรุปค่าใช้จ่าย (.xlsx) สำเร็จแล้ว!' 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: `ไม่สามารถสร้างไฟล์ Excel ได้: ${err.message || err}` });
    } finally {
      setIsGeneratingIllus(false);
      setIsGeneratingExcel(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Tesseract OCR Engine (No AI Cloud Key)</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            ระบบสร้างเอกสารราชการอัตโนมัติ (Auto-Word)
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            สแกนอ่านรูปบิลด้วย Tesseract OCR ภายในเบราว์เซอร์อัตโนมัติ 100% ไม่ต้องพึ่งพา AI API ภายนอก สร้างบันทึกข้อความขอความเห็นชอบจัดซื้อจัดจ้าง (.docx) และตารางสรุปค่าใช้จ่าย (.xlsx) ได้ทันที
          </p>
        </div>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium transition-all ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' 
            : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-sm'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-auto text-xs opacity-70 hover:opacity-100">ปิด</button>
        </div>
      )}

      {/* OCR File Upload Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>สแกนรูปบิล/ใบเสร็จอัตโนมัติ (Tesseract.js OCR)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ลากและวางรูปภาพบิล หรือคลิกเพื่ออัปโหลด ระบบจะสแกนและดึงข้อมูลมาลงในตารางให้ทันที
            </p>
          </div>
          <button
            onClick={handleAddInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบิลว่าง (กรอกเอง)</span>
          </button>
        </div>

        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center transition cursor-pointer relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isScanning}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {isScanning ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">{scanStatus}</p>
                <div className="w-64 bg-slate-200 rounded-full h-2 overflow-hidden mx-auto">
                  <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">คลิกที่นี่ หรือลากไฟล์รูปภาพบิลมาวาง</p>
                <p className="text-xs text-slate-400 mt-1">รองรับไฟล์ภาพ JPG, PNG, WEBP (สแกนภาษาไทย + อังกฤษ)</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Memo Header Setup */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <span>1. ข้อมูลส่วนหัวบันทึกข้อความและข้อระเบียบ</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">หน่วยงานที่ขอซื้อจ้าง</label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">บทนำ/วัตถุประสงค์ (คำอธิบายสั้นๆ)</label>
            <input
              type="text"
              value={introCourse}
              onChange={e => setIntroCourse(e.target.value)}
              placeholder="เช่น วัสดุสำหรับการจัดประชุมเชิงปฏิบัติการ..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-2">ข้อระเบียบอ้างอิงในการจัดซื้อจัดจ้าง</label>
            <select
              value={regulatoryText}
              onChange={e => setRegulatoryText(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              {REGULATION_OPTIONS.map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>ช่วงวันที่จัดงาน (สำหรับใส่ในตาราง Excel)</span>
            </label>
            <input
              type="text"
              value={excelDateRange}
              onChange={e => setExcelDateRange(e.target.value)}
              placeholder="เช่น ระหว่างวันที่ 20 - 22 พฤศจิกายน 2567"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>สถานที่จัดงาน (สำหรับใส่ในตาราง Excel)</span>
            </label>
            <input
              type="text"
              value={excelLocation}
              onChange={e => setExcelLocation(e.target.value)}
              placeholder="เช่น ณ ห้องประชุม สทอภ. หรือ โรงแรม..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Requester & Approver Contact Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          {/* Requester */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>ผู้ขออนุมัติ (เจ้าหน้าที่/ผู้รับผิดชอบ)</span>
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={requesterName}
                  onChange={e => { setRequesterName(e.target.value); setSearchReq(e.target.value); setShowReqDropdown(true); }}
                  onFocus={() => setShowReqDropdown(true)}
                  placeholder="พิมพ์ค้นหารายชื่อบุคลากร สทอภ...."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
              {showReqDropdown && contacts.length > 0 && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {contacts
                    .filter(c => c.name.toLowerCase().includes(searchReq.toLowerCase()))
                    .slice(0, 10)
                    .map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setRequesterName(c.name);
                          setRequesterPosition(c.position || 'เจ้าหน้าที่ผู้รับผิดชอบ');
                          setShowReqDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-xs space-y-0.5 border-b border-slate-50"
                      >
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-slate-500 text-[11px]">{c.position} • {c.section}</div>
                      </div>
                    ))}
                </div>
              )}
              <input
                type="text"
                value={requesterPosition}
                onChange={e => setRequesterPosition(e.target.value)}
                placeholder="ตำแหน่งผู้ขออนุมัติ"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={requesterDate}
                onChange={e => setRequesterDate(e.target.value)}
                placeholder="วันที่ขออนุมัติ (เช่น / พฤศจิกายน / 2568)"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Approver */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>ผู้ลงนามอนุมัติ (ผู้อำนวยการ/ผู้บังคับบัญชา)</span>
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={approverName}
                  onChange={e => { setApproverName(e.target.value); setSearchApp(e.target.value); setShowAppDropdown(true); }}
                  onFocus={() => setShowAppDropdown(true)}
                  placeholder="พิมพ์ค้นหารายชื่อผู้บริหาร/ผอ. สทอภ...."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
              {showAppDropdown && contacts.length > 0 && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {contacts
                    .filter(c => c.name.toLowerCase().includes(searchApp.toLowerCase()))
                    .slice(0, 10)
                    .map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setApproverName(c.name);
                          setApproverPosition(c.position || 'ผอ.สคร.');
                          setShowAppDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-xs space-y-0.5 border-b border-slate-50"
                      >
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-slate-500 text-[11px]">{c.position} • {c.section}</div>
                      </div>
                    ))}
                </div>
              )}
              <input
                type="text"
                value={approverPosition}
                onChange={e => setApproverPosition(e.target.value)}
                placeholder="ตำแหน่งผู้ลงนามอนุมัติ"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={approverDate}
                onChange={e => setApproverDate(e.target.value)}
                placeholder="วันที่ลงนามอนุมัติ (เช่น / พฤศจิกายน / 2568)"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Invoices and Items Management */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>2. รายการบิลและตารางพัสดุ ({invoices.length} ใบเสร็จ)</span>
          </h2>
          <div className="text-sm font-black text-slate-800 bg-emerald-50 text-emerald-900 px-4 py-2 rounded-2xl border border-emerald-200">
            ยอดเงินรวมสุทธิ: <span className="text-emerald-700 text-base">{calculateGrandTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span> บาท
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-700">ยังไม่มีรายการบิล/ใบเสร็จ</p>
              <p className="text-xs text-slate-400 mt-1">อัปโหลดรูปภาพบิลด้านบน หรือกดปุ่ม "เพิ่มบิลใหม่" เพื่อเริ่มกรอกรายการ</p>
            </div>
            <button
              onClick={handleAddInvoice}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มบิลใหม่</span>
            </button>
          </div>
        ) : (
          invoices.map((inv, invIdx) => (
            <div key={inv.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5 relative">
              {/* Invoice Header Form */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    {invIdx + 1}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {inv.vendor_name || `บิลใบเสร็จที่ ${invIdx + 1}`}
                  </h3>
                </div>
                <button
                  onClick={() => handleDeleteInvoice(inv.id)}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl text-xs flex items-center gap-1 font-medium transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบบิลนี้</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อร้านค้า/ผู้ขาย</label>
                  <input
                    type="text"
                    value={inv.vendor_name}
                    onChange={e => handleUpdateInvoice(inv.id, 'vendor_name', e.target.value)}
                    placeholder="เช่น บริษัท ไอที ซิตี้ จำกัด (มหาชน)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">เลขที่ใบเสร็จ/ใบกำกับภาษี</label>
                  <input
                    type="text"
                    value={inv.invoice_number}
                    onChange={e => handleUpdateInvoice(inv.id, 'invoice_number', e.target.value)}
                    placeholder="เช่น INV-2024-001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">วันที่ใบเสร็จ (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={inv.invoice_date}
                    onChange={e => handleUpdateInvoice(inv.id, 'invoice_date', e.target.value)}
                    placeholder="เช่น 28 พฤศจิกายน 2567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-200/70 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-12 text-center">ลำดับ</th>
                      <th className="p-3 w-28">รหัสสินค้า</th>
                      <th className="p-3 min-w-[200px]">รายละเอียดรายการพัสดุ</th>
                      <th className="p-3 w-20 text-center">จำนวน</th>
                      <th className="p-3 w-20 text-center">หน่วยนับ</th>
                      <th className="p-3 w-28 text-right">ราคา/หน่วย</th>
                      <th className="p-3 w-28 text-right">ราคารวม (บาท)</th>
                      <th className="p-3 w-24 text-center">รูปภาพประกอบ</th>
                      <th className="p-3 w-12 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inv.items.map((item, itemIdx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="p-3 text-center text-slate-500 font-medium">{invIdx + 1}.{itemIdx + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.item_code}
                            onChange={e => handleUpdateItem(inv.id, item.id, 'item_code', e.target.value)}
                            placeholder="รหัส SKU"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={e => handleUpdateItem(inv.id, item.id, 'description', e.target.value)}
                            placeholder="ระบุรายละเอียดสินค้า/พัสดุ"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateItem(inv.id, item.id, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={e => handleUpdateItem(inv.id, item.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={e => handleUpdateItem(inv.id, item.id, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-right font-medium"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {item.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] transition">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.photo ? 'เปลี่ยนรูป' : '+ แนบรูป'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                if (e.target.files?.[0]) handleItemPhotoUpload(inv.id, item.id, e.target.files[0]);
                              }}
                            />
                          </label>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteItem(inv.id, item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleAddItem(inv.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มแถวรายการสินค้า</span>
                </button>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500 font-medium">ส่วนลดท้ายบิล:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={inv.discount}
                    onChange={e => handleUpdateInvoice(inv.id, 'discount', e.target.value)}
                    className="w-28 px-2 py-1 rounded-lg border border-slate-200 text-right font-medium"
                  />
                  <span className="text-slate-500">บาท</span>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="text-center pt-2">
          <button
            onClick={handleAddInvoice}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบิลร้านค้าถัดไป</span>
          </button>
        </div>
      </div>

      {/* Section 3: Generate Document Action Buttons */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-slate-900">3. สร้างและดาวน์โหลดเอกสาร (One-Click Download)</h2>
          <p className="text-xs text-slate-500">
            ระบบจะนำข้อมูลด้านบนไปสร้างไฟล์รายงานขอความเห็นชอบ (.docx) และตารางสรุปค่าใช้จ่าย (.xlsx) ตามรูปแบบราชการ สทอภ. ทันที
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleGenerateWord}
            disabled={isGeneratingDocx || invoices.length === 0}
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl shadow-lg hover:shadow-xl transition disabled:opacity-50 space-y-3 group"
          >
            {isGeneratingDocx ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <FileText className="w-8 h-8 text-blue-200 group-hover:scale-110 transition-transform" />
            )}
            <div className="text-center">
              <div className="font-bold text-sm">ดาวน์โหลดเอกสาร Word (.docx)</div>
              <div className="text-[11px] text-blue-200 mt-0.5">รายงานขอความเห็นชอบจัดซื้อจัดจ้าง</div>
            </div>
          </button>

          <button
            onClick={() => handleGenerateExcel(false)}
            disabled={isGeneratingExcel || invoices.length === 0}
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-lg hover:shadow-xl transition disabled:opacity-50 space-y-3 group"
          >
            {isGeneratingExcel ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-8 h-8 text-emerald-200 group-hover:scale-110 transition-transform" />
            )}
            <div className="text-center">
              <div className="font-bold text-sm">ดาวน์โหลด Excel สรุปค่าใช้จ่าย (.xlsx)</div>
              <div className="text-[11px] text-emerald-200 mt-0.5">ตารางสรุปเบิกเงินค่าพัสดุประจำบิล</div>
            </div>
          </button>

          <button
            onClick={() => handleGenerateExcel(true)}
            disabled={isGeneratingIllus || invoices.length === 0}
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-600 to-indigo-800 hover:from-purple-700 hover:to-indigo-900 text-white rounded-2xl shadow-lg hover:shadow-xl transition disabled:opacity-50 space-y-3 group"
          >
            {isGeneratingIllus ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <ImageIcon className="w-8 h-8 text-purple-200 group-hover:scale-110 transition-transform" />
            )}
            <div className="text-center">
              <div className="font-bold text-sm">ดาวน์โหลด Excel ภาพประกอบ (.xlsx)</div>
              <div className="text-[11px] text-purple-200 mt-0.5">ใบภาพประกอบพัสดุพร้อมรูปถ่าย</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
