import React, { useState, useEffect, useRef, useMemo } from 'react';
import { runTesseract } from '../utils/tesseractWorker';
import { 
  Upload, FileText, FileSpreadsheet, Plus, Trash2, CheckCircle2, 
  AlertCircle, AlertTriangle, Building2, UserCheck, Search, Image as ImageIcon,
  Loader2, Crop, Eye
} from 'lucide-react';
import contactsData from '../data/contacts.json';
import { generateWordDocument } from '../utils/docxGenerator';
import { generateExcelDocument } from '../utils/excelGenerator';
import { preprocessImageForOcr, parseThaiReceiptOcr, extractVendorNameFromText, cleanCompanyName } from '../utils/imageOcrOptimizer';
import { getStoredUser } from '../utils/auth';

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
  fileObject?: File;
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

// Strip nickname in parentheses e.g. "น.ส.ศิริพักตร์ เสลียนคิด (ปูเป้)" -> "น.ส.ศิริพักตร์ เสลียนคิด"
const stripNickname = (name: string): string => {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
};

// Convert ISO Date (YYYY-MM-DD) to Thai Date String e.g. "15 มกราคม 2568"
const formatIsoToThaiDate = (isoStr: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) return isoStr;
  return `${day} ${months[monthIdx]} ${year + 543}`;
};

// Convert ISO Date Range to Thai string e.g. "ระหว่างวันที่ 20 - 22 พฤศจิกายน 2567"
const formatIsoRangeToThai = (startDateStr: string, endDateStr: string): string => {
  if (!startDateStr) return '';
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  if (!sY || !sM || !sD) return '';
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  if (!endDateStr || startDateStr === endDateStr) {
    return `ระหว่างวันที่ ${sD} ${months[sM - 1]} ${sY + 543}`;
  }

  const [eY, eM, eD] = endDateStr.split('-').map(Number);
  if (!eY || !eM || !eD) {
    return `ระหว่างวันที่ ${sD} ${months[sM - 1]} ${sY + 543}`;
  }

  if (sY === eY && sM === eM) {
    return `ระหว่างวันที่ ${sD} - ${eD} ${months[sM - 1]} ${sY + 543}`;
  } else if (sY === eY) {
    return `ระหว่างวันที่ ${sD} ${months[sM - 1]} - ${eD} ${months[eM - 1]} ${sY + 543}`;
  } else {
    return `ระหว่างวันที่ ${sD} ${months[sM - 1]} ${sY + 543} - ${eD} ${months[eM - 1]} ${eY + 543}`;
  }
};

export const getTodayThaiDate = (): string => {
  const d = new Date();
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export default function AutoWordPage() {
  // State
  const [department, setDepartment] = useState('สำนักบริหารเครือข่ายและสร้างความตระหนัก (สบร.)');
  const [introCourse, setIntroCourse] = useState('จัดซื้อวัสดุสำหรับการจัดกิจกรรมและดำเนินงานโครงการ');
  const [regulatoryText] = useState(REGULATION_OPTIONS[0].value);
  const [excelStartDate, setExcelStartDate] = useState('');
  const [excelEndDate, setExcelEndDate] = useState('');
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
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Interactive Crop Canvas State
  const [cropSelection, setCropSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

      // 1. Default Approver: น.ส.ปราณปริยา  วงค์ษา (นก)
      const defaultApp = data.find(c => c.name.includes('ปราณปริยา'));
      if (defaultApp) {
        setApproverName(defaultApp.name);
        setApproverPosition(
          defaultApp.position === 'ผู้อำนวยการสำนัก'
            ? 'ผู้อำนวยการสำนักบริหารเครือข่ายและสร้างความตระหนัก'
            : (defaultApp.position || 'ผู้อำนวยการสำนักบริหารเครือข่ายและสร้างความตระหนัก')
        );
      } else {
        setApproverName('น.ส.ปราณปริยา  วงค์ษา (นก)');
        setApproverPosition('ผู้อำนวยการสำนักบริหารเครือข่ายและสร้างความตระหนัก');
      }

      // 2. Default Requester: Auto-fill from currently logged-in user profile
      const loggedUser = getStoredUser();
      if (loggedUser && loggedUser.name) {
        setRequesterName(loggedUser.name);
        setRequesterPosition(loggedUser.position || 'เจ้าหน้าที่ผู้รับผิดชอบ');
      } else {
        const defaultReq = data.find(c => c.name.includes('ศิริพักตร์'));
        if (defaultReq) {
          setRequesterName(defaultReq.name);
          setRequesterPosition(defaultReq.position || 'เจ้าหน้าที่ผู้รับผิดชอบ');
        }
      }
    }
  }, []);

  const activeInvoice = invoices.find(inv => inv.id === activeInvoiceId) || invoices[0] || null;

  const duplicateDescriptions = useMemo(() => {
    if (!activeInvoice) return [];
    const counts: Record<string, number> = {};
    activeInvoice.items.forEach(i => {
      const desc = i.description.trim().toLowerCase();
      if (desc) counts[desc] = (counts[desc] || 0) + 1;
    });
    return Object.keys(counts).filter(d => counts[d] > 1);
  }, [activeInvoice]);

  // Comprehensive Pairwise Duplicate Invoice Detector
  const duplicateInvoicesInfo = useMemo(() => {
    const duplicateInvIds = new Set<string>();
    const duplicateDetails: string[] = [];

    const getCleanNum = (num?: string) => num ? num.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
    const getCleanVendor = (v?: string) => v ? v.replace(/[^\wก-ฮa-zA-Z0-9]/g, '').toLowerCase() : '';

    for (let i = 0; i < invoices.length; i++) {
      for (let j = i + 1; j < invoices.length; j++) {
        const invA = invoices[i];
        const invB = invoices[j];

        let isDup = false;
        let reason = '';

        // 1. Check Same Image File Uploaded (Filename + File Size)
        if (invA.fileObject && invB.fileObject) {
          if (invA.fileObject.name === invB.fileObject.name && invA.fileObject.size === invB.fileObject.size) {
            isDup = true;
            reason = `รูปภาพไฟล์เดียวกัน (${invA.fileObject.name})`;
          }
        }

        // 2. Check Invoice Number Match (clean alphanumeric)
        const numA = getCleanNum(invA.invoice_number);
        const numB = getCleanNum(invB.invoice_number);
        if (!isDup && numA && numB && numA.length >= 4 && numA === numB) {
          isDup = true;
          reason = `เลขที่ใบเสร็จตรงกัน ("${invA.invoice_number}")`;
        }

        // 3. Check Vendor + Total Price Match
        const totalA = invA.items.reduce((s, item) => s + (item.total_price || 0), 0);
        const totalB = invB.items.reduce((s, item) => s + (item.total_price || 0), 0);
        const vendorA = getCleanVendor(invA.vendor_name);
        const vendorB = getCleanVendor(invB.vendor_name);

        if (!isDup && totalA > 0 && Math.abs(totalA - totalB) < 0.01) {
          // Same total amount!
          if (vendorA && vendorB && (vendorA === vendorB || vendorA.includes(vendorB) || vendorB.includes(vendorA))) {
            isDup = true;
            reason = `ร้านค้า "${invA.vendor_name || invB.vendor_name}" ยอดเงินตรงกัน (${totalA.toLocaleString('th-TH')} บ.)`;
          } else if (invA.items.length > 0 && invB.items.length > 0 && invA.items[0].description === invB.items[0].description) {
            isDup = true;
            reason = `รายการพัสดุและยอดเงินตรงกัน (${totalA.toLocaleString('th-TH')} บ.)`;
          } else if (invoices.length === 2) {
            isDup = true;
            reason = `ยอดเงินรวมบิลตรงกัน (${totalA.toLocaleString('th-TH')} บ.)`;
          }
        }

        if (isDup) {
          duplicateInvIds.add(invA.id);
          duplicateInvIds.add(invB.id);
          if (!duplicateDetails.includes(reason)) {
            duplicateDetails.push(reason);
          }
        }
      }
    }

    return { duplicateInvIds, duplicateDetails };
  }, [invoices]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imagePreview = URL.createObjectURL(file);

      // Step 1/3: Image Preprocessing & High-DPI Upscaling
      setScanStatus(`[ใบที่ ${i + 1}/${files.length}] ขั้นตอนที่ 1/3: กำลังปรับความคมชัดภาพและขยาย Resolution (High-DPI Grayscale Preprocessing)...`);
      setScanProgress(Math.round(((i + 0.1) / files.length) * 100));
      const preprocessedUrl = await preprocessImageForOcr(file, 'grayscale');

      // Step 2/3: Dual-Language AI OCR Engine
      setScanStatus(`[ใบที่ ${i + 1}/${files.length}] ขั้นตอนที่ 2/3: กำลังถอดข้อความภาษาไทย-อังกฤษด้วย Tesseract.js OCR...`);
      const { rawText } = await runTesseract(preprocessedUrl, (pct) => {
        setScanProgress(Math.round(((i + 0.2 + (pct * 0.6) / 100) / files.length) * 100));
      });

      // Step 3/3: 2D Spatial Table Reconstruction & Noise Filtering
      setScanStatus(`[ใบที่ ${i + 1}/${files.length}] ขั้นตอนที่ 3/3: กำลังจัดกลุ่มพิกัดตาราง 2D (Spatial Table Clustering) และคัดกรองข้อความขยะ...`);
      setScanProgress(Math.round(((i + 0.9) / files.length) * 100));
      const parsed = parseThaiReceiptOcr(rawText);

      if (!parsed) continue;

      const newInvId = Date.now().toString() + '_' + i;
      const newInvoice: Invoice = {
        id: newInvId,
        vendor_name: parsed.vendor_name || 'ร้านค้า / บริษัทผู้ขาย',
        invoice_number: parsed.invoice_number || '',
        invoice_date: parsed.invoice_date || getTodayThaiDate(),
        discount: 0,
        items:
          parsed.items && parsed.items.length > 0
            ? parsed.items.map((item: any, idx: number) => ({
                id: Date.now().toString() + '_item_' + idx,
                item_code: item.item_code || '',
                description: item.description,
                quantity: item.quantity,
                unit: item.unit || 'ชิ้น',
                unit_price: item.unit_price,
                total_price: item.total_price,
              }))
            : [
                {
                  id: Date.now().toString() + '_item_0',
                  item_code: '',
                  description: 'รายการพัสดุ/สินค้า',
                  quantity: 1,
                  unit: 'ชิ้น',
                  unit_price: parsed.total_amount || 0,
                  total_price: parsed.total_amount || 0,
                },
              ],
        imagePreview,
        fileObject: file,
      };

      // Duplicate invoice number check
      if (
        parsed.invoice_number &&
        invoices.some(
          (inv) => inv.invoice_number.trim().toLowerCase() === parsed.invoice_number.trim().toLowerCase()
        )
      ) {
        setStatusMsg({
          type: 'error',
          text: `⚠️ เตือนภัยบิลซ้ำ: ใบเสร็จเลขที่ "${parsed.invoice_number}" มีอยู่ในระบบแล้ว!`,
        });
      }

      setInvoices((prev) => [...prev, newInvoice]);
      setActiveInvoiceId(newInvId);
      setScanProgress(Math.round(((i + 1) / files.length) * 100));
      setStatusMsg({ type: 'success', text: 'สแกนอ่านและคัดกรองข้อมูลบิลด้วย Tesseract.js สำเร็จ!' });
    }

    setIsScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Perform Zone OCR Scan on Cropped Selection
  const handleCropScan = async (targetType: 'items' | 'vendor' | 'auto' = 'auto') => {
    if (!activeInvoice || !activeInvoice.imagePreview) {
      setStatusMsg({ type: 'error', text: 'กรุณาอัปโหลดหรือเลือกรูปบิลก่อนสแกน' });
      return;
    }

    if (!cropSelection || cropSelection.width < 10 || cropSelection.height < 10) {
      setStatusMsg({ type: 'error', text: 'กรุณาลากกรอบสี่เหลี่ยมบนรูปภาพบิลเพื่อเลือกพื้นที่สแกน' });
      return;
    }

    const img = imageRef.current;
    if (!img) return;

    setIsScanning(true);
    setScanStatus('กำลังสแกนพื้นที่ที่เลือก (Zone Crop OCR)...');

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");

      // Calculate scale between displayed image and natural image dimensions
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      const cropX = cropSelection.x * scaleX;
      const cropY = cropSelection.y * scaleY;
      const cropW = cropSelection.width * scaleX;
      const cropH = cropSelection.height * scaleY;

      canvas.width = cropW;
      canvas.height = cropH;

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      const { rawText: text } = await runTesseract(croppedDataUrl);
      console.log("Zone Crop OCR Result:", text);

      const parsed = parseThaiReceiptOcr(text);

      if (targetType === 'vendor' || (parsed.vendor_name && parsed.vendor_name !== 'ร้านค้า / บริษัทผู้ขาย')) {
        const cleanVendor = extractVendorNameFromText(text) || cleanCompanyName(parsed.vendor_name || text);
        handleUpdateInvoice(activeInvoice.id, 'vendor_name', cleanVendor || parsed.vendor_name);
        setStatusMsg({ type: 'success', text: `ดึงชื่อร้านค้าจากพื้นที่เลือก: "${cleanVendor || parsed.vendor_name}"` });
      } else if (parsed.items.length > 0) {
        // Add extracted items to active invoice
        const newItems: Item[] = parsed.items.map((item, idx) => ({
          id: Date.now().toString() + '_crop_' + idx,
          item_code: item.item_code || '',
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'ชิ้น',
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        setInvoices(prev => prev.map(inv => {
          if (inv.id === activeInvoice.id) {
            return { ...inv, items: [...inv.items, ...newItems] };
          }
          return inv;
        }));
        setStatusMsg({ type: 'success', text: `ดึงรายการพัสดุเพิ่ม ${newItems.length} รายการ จากพื้นที่เลือกสำเร็จ!` });
      } else {
        setStatusMsg({ type: 'error', text: 'ไม่พบข้อความรายการพัสดุในพื้นที่ที่เลือก ลองลากกรอบใหม่ขยับให้ครอบคลุมตัวหนังสือและราคา' });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: `เกิดข้อผิดพลาดขณะสแกนพื้นที่เลือก: ${err.message || err}` });
    } finally {
      setIsScanning(false);
    }
  };

  // Mouse Handlers for Dragging Crop Box
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Disable native browser image dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragStart({ x, y });
    setCropSelection({ x, y, width: 0, height: 0 });
    setIsDraggingCrop(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !dragStart) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const width = currentX - dragStart.x;
    const height = currentY - dragStart.y;

    setCropSelection({
      x: width < 0 ? currentX : dragStart.x,
      y: height < 0 ? currentY : dragStart.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCrop(false);
    setDragStart(null);
  };

  const getTodayThaiDate = () => {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;
  };

  // Add Empty Invoice
  const handleAddInvoice = () => {
    const newInvId = Date.now().toString();
    const newInvoice: Invoice = {
      id: newInvId,
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
    setActiveInvoiceId(newInvId);
  };

  const handleDeleteInvoice = (invId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invId));
    if (activeInvoiceId === invId) {
      const remaining = invoices.filter(inv => inv.id !== invId);
      setActiveInvoiceId(remaining[0]?.id || null);
    }
  };

  const handleUpdateInvoice = (invId: string, field: keyof Invoice, val: any) => {
    setInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, [field]: val } : inv));
  };

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

  const handleDeleteItem = (invId: string, itemId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invId) {
        return { ...inv, items: inv.items.filter(item => item.id !== itemId) };
      }
      return inv;
    }));
  };

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

  const handleItemPhotoUpload = (invId: string, itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      handleUpdateItem(invId, itemId, 'photo', base64);
    };
    reader.readAsDataURL(file);
  };

  const calculateGrandTotal = () => {
    return invoices.reduce((acc, inv) => {
      const invTotal = inv.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
      return acc + Math.max(0, invTotal - (inv.discount || 0));
    }, 0);
  };

  const buildPayload = () => {
    return {
      department,
      intro_course: introCourse,
      regulatory_text: regulatoryText,
      excel_date_range: excelDateRange,
      excel_location: excelLocation,
      requester_name: stripNickname(requesterName),
      requester_position: requesterPosition,
      requester_date: requesterDate,
      approver_name: stripNickname(approverName),
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

  const handleGenerateWord = async () => {
    if (invoices.length === 0) {
      setStatusMsg({ type: 'error', text: 'กรุณาเพิ่มบิล/รายการพัสดุอย่างน้อย 1 รายการก่อนสร้างเอกสาร' });
      return;
    }
    if (duplicateInvoicesInfo.duplicateInvIds.size > 0) {
      const confirmProceed = window.confirm(`⚠️ คำเตือนบิลซ้ำ:\nระบบตรวจพบใบเสร็จที่มีข้อมูลซ้ำกัน ${duplicateInvoicesInfo.duplicateInvIds.size} ใบ (${duplicateInvoicesInfo.duplicateDetails.join(', ')})\n\nคุณต้องการส่งออกเอกสารโดยรวมบิลซ้ำอยู่หรือไม่?`);
      if (!confirmProceed) return;
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

  const handleGenerateExcel = async (isIllustration = false) => {
    if (invoices.length === 0) {
      setStatusMsg({ type: 'error', text: 'กรุณาเพิ่มบิล/รายการพัสดุอย่างน้อย 1 รายการก่อนสร้างตาราง Excel' });
      return;
    }
    if (duplicateInvoicesInfo.duplicateInvIds.size > 0) {
      const confirmProceed = window.confirm(`⚠️ คำเตือนบิลซ้ำ:\nระบบตรวจพบใบเสร็จที่มีข้อมูลซ้ำกัน ${duplicateInvoicesInfo.duplicateInvIds.size} ใบ (${duplicateInvoicesInfo.duplicateDetails.join(', ')})\n\nคุณต้องการส่งออกเอกสารโดยรวมบิลซ้ำอยู่หรือไม่?`);
      if (!confirmProceed) return;
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
    <div className="max-w-[1600px] mx-auto space-y-6 pb-16 px-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Crop className="w-3.5 h-3.5 text-blue-400" />
              <span>Interactive Side-by-Side Crop OCR Engine (No Server Needed)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight font-display text-white">
              ระบบเอกสารอัตโนมัติ (Auto-Word & Excel Generator)
            </h1>
            <p className="text-slate-300 text-xs max-w-3xl">
              แสดงรูปภาพบิลคู่กับตารางข้อมูล คุณสามารถลากกรอบสี่เหลี่ยมบนรูปภาพบิลฝั่งซ้ายเพื่อสแกนเฉพาะจุด เช่น ลากคลุมตารางสินค้าหรือชื่อร้านค้า ข้อความจะวิ่งลงตารางให้อัตโนมัติทันที
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            >
              <Upload className="w-4 h-4" />
              <span>+ อัปโหลดรูปบิลใหม่</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Scanning Status Loader Banner */}
      {isScanning && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col space-y-2">
          <div className="flex items-center gap-3 text-xs font-bold">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span>{scanStatus || 'กำลังประมวลผลสแกนข้อความ...'}</span>
          </div>
          {scanProgress > 0 && (
            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold transition-all ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' 
            : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-sm'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-auto text-[11px] opacity-70 hover:opacity-100">ปิด</button>
        </div>
      )}

      {/* Global Top Duplicate Invoice Alert Banner */}
      {duplicateInvoicesInfo.duplicateDetails.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-xl space-y-2 border-2 border-rose-300 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-sm md:text-base">
              <AlertTriangle className="w-6 h-6 text-amber-300 shrink-0" />
              <span>⚠️ ตรวจพบบิลซ้ำในระบบ! ({duplicateInvoicesInfo.duplicateInvIds.size} ใบเสร็จมีข้อมูลตรงกัน)</span>
            </div>
            {activeInvoice && duplicateInvoicesInfo.duplicateInvIds.has(activeInvoice.id) && (
              <button
                type="button"
                onClick={() => handleDeleteInvoice(activeInvoice.id)}
                className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl shadow-md transition shrink-0"
              >
                ลบบิลซ้ำใบนี้ออก
              </button>
            )}
          </div>
          <p className="text-xs text-rose-100 font-semibold">
            รายละเอียดบิลที่ซ้ำกัน: {duplicateInvoicesInfo.duplicateDetails.join(' | ')}
          </p>
          <p className="text-[11px] text-rose-200 font-medium">
            💡 กรุณาคลิกเลือกปุ่มแท็บบิลสีแดงด้านซ้าย แล้วกด "ลบบิลซ้ำใบนี้ออก" ก่อนสร้างเอกสาร
          </p>
        </div>
      )}

      {/* Main Side-by-Side Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Receipt Viewer & Crop Box (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4 sticky top-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">รูปภาพบิล (ลากคลุมกรอบเพื่อสแกน)</h2>
            </div>
            {activeInvoice && (
              <span className="text-[11px] font-semibold text-slate-500">
                บิลที่ {invoices.findIndex(i => i.id === activeInvoice.id) + 1} / {invoices.length}
              </span>
            )}
          </div>

          {/* Invoice Tabs Selector */}
          {invoices.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-100">
              {invoices.map((inv, idx) => {
                const isDup = duplicateInvoicesInfo.duplicateInvIds.has(inv.id);
                return (
                  <button
                    key={inv.id}
                    onClick={() => setActiveInvoiceId(inv.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                      inv.id === activeInvoiceId
                        ? isDup ? 'bg-rose-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm'
                        : isDup ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{inv.vendor_name ? inv.vendor_name.slice(0, 15) : `บิลที่ ${idx + 1}`}</span>
                    {isDup && (
                      <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-full animate-pulse">
                        ⚠️ บิลซ้ำ
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Interactive Crop Image Box */}
          {activeInvoice && activeInvoice.imagePreview ? (
            <div className="space-y-3">
              <div
                className="relative bg-slate-900 rounded-2xl overflow-hidden cursor-crosshair select-none border border-slate-300 min-h-[420px] max-h-[600px] flex items-center justify-center"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={activeInvoice.imagePreview}
                  alt="Receipt Preview"
                  draggable={false}
                  onDragStart={e => e.preventDefault()}
                  className="max-w-full max-h-[580px] object-contain select-none pointer-events-none"
                />

                {/* Selection Bounding Box Overlay */}
                {cropSelection && cropSelection.width > 0 && cropSelection.height > 0 && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/20 backdrop-blur-[1px] shadow-lg pointer-events-none"
                    style={{
                      left: `${cropSelection.x}px`,
                      top: `${cropSelection.y}px`,
                      width: `${cropSelection.width}px`,
                      height: `${cropSelection.height}px`
                    }}
                  >
                    <span className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      พื้นที่สแกนเฉพาะจุด ({Math.round(cropSelection.width)}x{Math.round(cropSelection.height)})
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Crop Scan */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleCropScan('auto')}
                  disabled={isScanning || !cropSelection}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-40"
                >
                  {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crop className="w-3.5 h-3.5" />}
                  <span>สแกนเฉพาะกรอบที่ลากคลุม</span>
                </button>
                <button
                  onClick={() => handleCropScan('vendor')}
                  disabled={isScanning || !cropSelection}
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition disabled:opacity-40"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>ดึงชื่อร้าน</span>
                </button>
                <button
                  onClick={() => setCropSelection(null)}
                  className="px-3 py-2 text-slate-500 hover:bg-slate-100 text-xs font-medium rounded-xl transition"
                >
                  ล้างกรอบ
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 rounded-2xl p-12 text-center transition cursor-pointer space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">คลิกที่นี่ เพื่อเลือกรูปภาพบิล</p>
                <p className="text-[11px] text-slate-400 mt-0.5">รองรับรูปถ่ายบิล JPG, PNG, WEBP</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Form, Contacts & Items Table (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Memo Header Setup */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>1. ข้อมูลส่วนหัวบันทึกข้อความและผู้ลงนามอนุมัติ</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">หน่วยงานที่ขอซื้อจ้าง</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">บทนำ/วัตถุประสงค์ (คำอธิบายสั้นๆ)</label>
                <input
                  type="text"
                  value={introCourse}
                  onChange={e => setIntroCourse(e.target.value)}
                  placeholder="เช่น วัสดุสำหรับการจัดประชุมเชิงปฏิบัติการ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {/* Quick Purpose Template Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    { label: '+ อบรม/สัมมนา', text: 'จัดซื้อวัสดุสำหรับการจัดกิจกรรมฝึกอบรมและสัมมนาโครงการ' },
                    { label: '+ ประชุมเชิงปฏิบัติการ', text: 'จัดซื้อวัสดุสำหรับการจัดประชุมเชิงปฏิบัติการ (Workshop)' },
                    { label: '+ ดำเนินงานวิจัย', text: 'จัดซื้อวัสดุอุปกรณ์สำหรับการดำเนินงานวิจัยและพัฒนาระบบ' },
                    { label: '+ วัสดุสำนักงานทั่วไป', text: 'จัดซื้อวัสดุอุปกรณ์สำนักงานสำหรับการปฏิบัติงานประจำปี' }
                  ].map((tmpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIntroCourse(tmpl.text)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-medium transition border border-slate-200/60"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                <label className="block text-[11px] font-semibold text-slate-700">
                  ช่วงวันที่จัดงาน (สำหรับตาราง Excel)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block mb-0.5">วันเริ่มต้น</span>
                    <input
                      type="date"
                      value={excelStartDate}
                      onChange={e => {
                        const s = e.target.value;
                        setExcelStartDate(s);
                        setExcelDateRange(formatIsoRangeToThai(s, excelEndDate));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block mb-0.5">วันสิ้นสุด</span>
                    <input
                      type="date"
                      value={excelEndDate}
                      onChange={e => {
                        const endVal = e.target.value;
                        setExcelEndDate(endVal);
                        setExcelDateRange(formatIsoRangeToThai(excelStartDate, endVal));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">ข้อความวันที่ในตาราง Excel (ระบบสรุปให้อัตโนมัติ หรือพิมพ์แก้ไขได้)</span>
                  <input
                    type="text"
                    value={excelDateRange}
                    onChange={e => setExcelDateRange(e.target.value)}
                    placeholder="เช่น ระหว่างวันที่ 20 - 22 พฤศจิกายน 2567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">สถานที่จัดงาน (สำหรับตาราง Excel)</label>
                <input
                  type="text"
                  value={excelLocation}
                  onChange={e => setExcelLocation(e.target.value)}
                  placeholder="เช่น ณ ห้องประชุม สทอภ."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Requester & Approver Contact Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              {/* Requester */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>ผู้ขออนุมัติ (เจ้าหน้าที่/ผู้รับผิดชอบ)</span>
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={requesterName}
                      onChange={e => { setRequesterName(e.target.value); setSearchReq(e.target.value); setShowReqDropdown(true); }}
                      onFocus={() => setShowReqDropdown(true)}
                      placeholder="พิมพ์ค้นหารายชื่อบุคลากร สทอภ...."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none pr-8"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                  {showReqDropdown && contacts.length > 0 && (
                    <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-auto">
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
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs space-y-0.5 border-b border-slate-50"
                          >
                            <div className="font-semibold text-slate-800">{c.name}</div>
                            <div className="text-slate-500 text-[10px]">{c.position} • {c.section}</div>
                          </div>
                        ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={requesterPosition}
                    onChange={e => setRequesterPosition(e.target.value)}
                    placeholder="ตำแหน่งผู้ขออนุมัติ"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="date"
                      onChange={e => setRequesterDate(formatIsoToThaiDate(e.target.value))}
                      className="px-2 py-1 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={requesterDate}
                      onChange={e => setRequesterDate(e.target.value)}
                      placeholder="วันที่ขออนุมัติ"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setRequesterDate(getTodayThaiDate())}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 shrink-0 transition"
                    >
                      วันนี้
                    </button>
                  </div>
                </div>
              </div>

              {/* Approver */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ผู้ลงนามอนุมัติ (ผู้อำนวยการ/ผู้บังคับบัญชา)</span>
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={approverName}
                      onChange={e => { setApproverName(e.target.value); setSearchApp(e.target.value); setShowAppDropdown(true); }}
                      onFocus={() => setShowAppDropdown(true)}
                      placeholder="พิมพ์ค้นหารายชื่อผู้บริหาร/ผอ. สทอภ...."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none pr-8"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                  {showAppDropdown && contacts.length > 0 && (
                    <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-auto">
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
                            className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs space-y-0.5 border-b border-slate-50"
                          >
                            <div className="font-semibold text-slate-800">{c.name}</div>
                            <div className="text-slate-500 text-[10px]">{c.position} • {c.section}</div>
                          </div>
                        ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={approverPosition}
                    onChange={e => setApproverPosition(e.target.value)}
                    placeholder="ตำแหน่งผู้ลงนามอนุมัติ"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="date"
                      onChange={e => setApproverDate(formatIsoToThaiDate(e.target.value))}
                      className="px-2 py-1 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={approverDate}
                      onChange={e => setApproverDate(e.target.value)}
                      placeholder="วันที่ลงนามอนุมัติ"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setApproverDate(getTodayThaiDate())}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 shrink-0 transition"
                    >
                      วันนี้
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Global Duplicate Invoice Alert Banner */}
          {duplicateInvoicesInfo.duplicateDetails.length > 0 && (
            <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg space-y-1.5 border border-rose-400">
              <div className="flex items-center gap-2 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 animate-bounce" />
                <span>⚠️ ตรวจพบบิลซ้ำในระบบ ({duplicateInvoicesInfo.duplicateInvIds.size} ใบเสร็จ)</span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                พบบิลที่มีข้อมูลซ้ำกัน: {duplicateInvoicesInfo.duplicateDetails.join(' | ')}
              </p>
              <p className="text-[11px] text-rose-200 font-normal">
                💡 คำแนะนำ: โปรดสลับไปยังแท็บบิลที่ขึ้นเตือน "⚠️ บิลซ้ำ" แล้วกดปุ่ม "ลบบิลซ้ำนี้ออก" ก่อนสร้างเอกสาร
              </p>
            </div>
          )}

          {/* Section 2: Active Invoice Items Table */}
          {activeInvoice ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              {/* Active Invoice Duplicate Card Warning */}
              {duplicateInvoicesInfo.duplicateInvIds.has(activeInvoice.id) && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 flex flex-wrap items-center justify-between gap-3 text-xs font-bold shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>⚠️ เตือนภัยบิลซ้ำ: ใบเสร็จนี้มีข้อมูลซ้ำกับบิลอื่นในระบบ (เลขที่บิล / ร้านค้า / ยอดเงิน)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteInvoice(activeInvoice.id)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shrink-0 transition shadow-sm"
                  >
                    ลบบิลซ้ำนี้ออก
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    ตารางพัสดุ ({activeInvoice.vendor_name || 'บิลใบเสร็จ'})
                  </h3>
                </div>
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  รวมบิลนี้: {activeInvoice.items.reduce((s, i) => s + (i.total_price || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">ชื่อร้านค้า/ผู้ขาย</label>
                  <input
                    type="text"
                    value={activeInvoice.vendor_name}
                    onChange={e => handleUpdateInvoice(activeInvoice.id, 'vendor_name', e.target.value)}
                    placeholder="เช่น บริษัท ซีอาร์ซี ไทวัสดุ จำกัด"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                  {/* Quick Store Name Selector Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      { label: '+ ไทวัสดุ', full: 'บริษัท ซีอาร์ซี ไทวัสดุ จำกัด' },
                      { label: '+ OfficeMate', full: 'บริษัท ซีโอแอล จำกัด (มหาชน)' },
                      { label: '+ HomePro', full: 'บริษัท โฮม โปรดักส์ เซ็นเตอร์ จำกัด (มหาชน)' },
                      { label: '+ DoHome', full: 'บริษัท ดูโฮม จำกัด (มหาชน)' },
                      { label: '+ Global House', full: 'บริษัท สยามโกลบอลเฮ้าส์ จำกัด (มหาชน)' },
                      { label: '+ IT City', full: 'บริษัท ไอที ซิตี้ จำกัด (มหาชน)' },
                      { label: '+ Advice', full: 'บริษัท แอดไวซ์ ไอที อินฟิเนท จำกัด (มหาชน)' },
                      { label: '+ B2S', full: 'บริษัท บีทูเอส จำกัด' },
                      { label: '+ Big C', full: 'บริษัท บิ๊กซี ซูเปอร์เซ็นเตอร์ จำกัด (มหาชน)' },
                      { label: '+ Lotus', full: 'บริษัท เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด' }
                    ].map((store, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleUpdateInvoice(activeInvoice.id, 'vendor_name', store.full)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-medium transition border border-slate-200/60"
                      >
                        {store.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">เลขที่ใบเสร็จ</label>
                  <input
                    type="text"
                    value={activeInvoice.invoice_number}
                    onChange={e => handleUpdateInvoice(activeInvoice.id, 'invoice_number', e.target.value)}
                    placeholder="เช่น INV-2024-001"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">วันที่ใบเสร็จ</label>
                  <div className="flex gap-1 items-center">
                    <input
                      type="date"
                      onChange={e => handleUpdateInvoice(activeInvoice.id, 'invoice_date', formatIsoToThaiDate(e.target.value))}
                      className="px-1.5 py-1 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activeInvoice.invoice_date}
                      onChange={e => handleUpdateInvoice(activeInvoice.id, 'invoice_date', e.target.value)}
                      placeholder="เช่น 28 พฤศจิกายน 2567"
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateInvoice(activeInvoice.id, 'invoice_date', getTodayThaiDate())}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 shrink-0 transition"
                    >
                      วันนี้
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Discount Calculator Bar */}
              <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">ส่วนลดท้ายบิล (บาท):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={activeInvoice.discount || ''}
                    onChange={e => handleUpdateInvoice(activeInvoice.id, 'discount', Number(e.target.value))}
                    placeholder="0.00"
                    className="w-28 px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-rose-600 bg-white"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">คำนวณส่วนลดด่วน:</span>
                  {[1, 3, 5, 7, 10].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const subtotal = activeInvoice.items.reduce((s, i) => s + (i.total_price || 0), 0);
                        const disc = Math.round((subtotal * pct / 100) * 100) / 100;
                        handleUpdateInvoice(activeInvoice.id, 'discount', disc);
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-lg text-[10px] border border-blue-200 transition"
                    >
                      -{pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleUpdateInvoice(activeInvoice.id, 'discount', 0)}
                    className="px-2 py-0.5 bg-white hover:bg-rose-50 text-rose-600 font-medium rounded-lg text-[10px] border border-rose-200 transition"
                  >
                    ล้าง
                  </button>
                </div>
              </div>

              {/* Duplicate Item Warning Alert */}
              {duplicateDescriptions.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>⚠️ คำเตือน: พบรายการพัสดุชื่อซ้ำกันในบิลนี้ ({duplicateDescriptions.length} รายการ) โปรดตรวจสอบอีกครั้ง</span>
                </div>
              )}

              {/* Items Table */}
              <datalist id="thai-units">
                {['ชิ้น', 'ชุด', 'กล่อง', 'แพ็ค', 'เครื่อง', 'ตัว', 'ม้วน', 'เล่ม', 'แผ่น', 'อัน', 'คู่', 'ตลับ', 'กิโลกรัม', 'เมตร'].map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>

              <div className="overflow-x-auto border border-slate-200/70 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-10 text-center">ลำดับ</th>
                      <th className="p-2.5 w-24">รหัสสินค้า</th>
                      <th className="p-2.5 min-w-[160px]">รายละเอียดพัสดุ</th>
                      <th className="p-2.5 w-16 text-center">จำนวน</th>
                      <th className="p-2.5 w-20 text-center">หน่วย</th>
                      <th className="p-2.5 w-28 text-right">ราคา/หน่วย</th>
                      <th className="p-2.5 w-24 text-right">รวม (บาท)</th>
                      <th className="p-2.5 w-20 text-center">รูปภาพ</th>
                      <th className="p-2.5 w-10 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoice.items.map((item, itemIdx) => {
                      const isDuplicate = duplicateDescriptions.includes(item.description.trim().toLowerCase());
                      const isHighPrice = item.unit_price > 50000;
                      const isInvalidQty = item.quantity <= 0;
                      const isFocused = focusedItemId === item.id;

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => setFocusedItemId(item.id)}
                          className={`hover:bg-slate-50/60 transition ${isFocused ? 'bg-blue-50/40 ring-1 ring-blue-300' : isDuplicate ? 'bg-amber-50/30' : ''}`}
                        >
                          <td className="p-2 text-center text-slate-400 font-medium">{itemIdx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.item_code}
                              onFocus={() => setFocusedItemId(item.id)}
                              onChange={e => handleUpdateItem(activeInvoice.id, item.id, 'item_code', e.target.value)}
                              placeholder="SKU"
                              className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description}
                              onFocus={() => setFocusedItemId(item.id)}
                              onChange={e => handleUpdateItem(activeInvoice.id, item.id, 'description', e.target.value)}
                              placeholder="รายละเอียดสินค้า"
                              className={`w-full px-2 py-1 rounded-lg border text-xs font-medium ${
                                isDuplicate ? 'border-amber-400 bg-amber-50/50 text-amber-900' : 'border-slate-200'
                              }`}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onFocus={() => setFocusedItemId(item.id)}
                              onChange={e => handleUpdateItem(activeInvoice.id, item.id, 'quantity', e.target.value)}
                              className={`w-full px-1.5 py-1 rounded-lg border text-xs text-center ${
                                isInvalidQty ? 'border-rose-400 bg-rose-50 text-rose-700 font-bold' : 'border-slate-200'
                              }`}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="thai-units"
                              value={item.unit}
                              onFocus={() => setFocusedItemId(item.id)}
                              onChange={e => handleUpdateItem(activeInvoice.id, item.id, 'unit', e.target.value)}
                              placeholder="หน่วย"
                              className="w-full px-1.5 py-1 rounded-lg border border-slate-200 text-xs text-center font-medium focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onFocus={() => setFocusedItemId(item.id)}
                              onChange={e => handleUpdateItem(activeInvoice.id, item.id, 'unit_price', e.target.value)}
                              className={`w-full px-2 py-1 rounded-lg border text-xs text-right font-medium ${
                                isHighPrice ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200'
                              }`}
                            />
                            {isHighPrice && (
                              <span className="text-[8px] font-bold text-amber-700 block text-right">⚠️ มากกว่า 50,000</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800">
                            {item.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center">
                            <label className="cursor-pointer inline-flex items-center gap-0.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px]">
                              <ImageIcon className="w-3 h-3 text-blue-600" />
                              <span>{item.photo ? 'มีรูป' : '+รูป'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  if (e.target.files?.[0]) handleItemPhotoUpload(activeInvoice.id, item.id, e.target.files[0]);
                                }}
                              />
                            </label>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleDeleteItem(activeInvoice.id, item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Quick Unit Selection Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {focusedItemId && activeInvoice.items.some(i => i.id === focusedItemId)
                      ? `หน่วยนับสำหรับรายการที่ ${activeInvoice.items.findIndex(i => i.id === focusedItemId) + 1}:` 
                      : 'เลือกคลิกแถวรายการที่ต้องการ แล้วกดหน่วยนับด่วน:'}
                  </span>
                  {['ชิ้น', 'ชุด', 'กล่อง', 'แพ็ค', 'เครื่อง', 'ตัว', 'ม้วน', 'เล่ม', 'แผ่น', 'อัน', 'คู่', 'ตลับ'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        const targetItem = activeInvoice.items.find(i => i.id === focusedItemId) 
                          || activeInvoice.items.find(i => !i.unit) 
                          || activeInvoice.items[activeInvoice.items.length - 1];
                        if (targetItem) {
                          handleUpdateItem(activeInvoice.id, targetItem.id, 'unit', u);
                        }
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] border border-slate-200 transition shadow-xs"
                    >
                      + {u}
                    </button>
                  ))}
                </div>

                {/* Apply unit to ALL items in invoice button */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">ใช้กับทุกรายการ:</span>
                  {['ชิ้น', 'ชุด', 'กล่อง'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        setInvoices(prev => prev.map(inv => {
                          if (inv.id === activeInvoice.id) {
                            return {
                              ...inv,
                              items: inv.items.map(i => ({ ...i, unit: u }))
                            };
                          }
                          return inv;
                        }));
                      }}
                      className="px-1.5 py-0.5 bg-slate-200/80 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[9px] font-bold transition"
                    >
                      ทุกรายการ={u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleAddItem(activeInvoice.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มรายการสินค้า</span>
                </button>

                <button
                  onClick={() => handleDeleteInvoice(activeInvoice.id)}
                  className="text-rose-500 hover:bg-rose-50 px-3 py-1 rounded-xl text-xs font-semibold transition"
                >
                  ลบบิลนี้
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-3">
              <p className="text-sm font-bold text-slate-700">ยังไม่มีรายการบิล</p>
              <button
                onClick={handleAddInvoice}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
              >
                + เพิ่มบิลใหม่
              </button>
            </div>
          )}

          {/* Section 3: Document Generation Download Buttons */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">3. สร้างเอกสาร Word & Excel (One-Click Download)</h2>
              <div className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                รวมสุทธิทุกบิล: {calculateGrandTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleGenerateWord}
                disabled={isGeneratingDocx || invoices.length === 0}
                className="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl shadow-md transition disabled:opacity-40"
              >
                {isGeneratingDocx ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5 text-blue-200" />}
                <span className="font-bold text-xs">ดาวน์โหลด Word (.docx)</span>
              </button>

              <button
                onClick={() => handleGenerateExcel(false)}
                disabled={isGeneratingExcel || invoices.length === 0}
                className="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-md transition disabled:opacity-40"
              >
                {isGeneratingExcel ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5 text-emerald-200" />}
                <span className="font-bold text-xs">ดาวน์โหลด Excel สรุป (.xlsx)</span>
              </button>

              <button
                onClick={() => handleGenerateExcel(true)}
                disabled={isGeneratingIllus || invoices.length === 0}
                className="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-purple-600 to-indigo-800 hover:from-purple-700 hover:to-indigo-900 text-white rounded-2xl shadow-md transition disabled:opacity-40"
              >
                {isGeneratingIllus ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 text-purple-200" />}
                <span className="font-bold text-xs">ดาวน์โหลด Excel ภาพ (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
