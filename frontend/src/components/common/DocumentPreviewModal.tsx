import React, { useState } from 'react';
import { X, Printer, Download, FileText, ZoomIn, ZoomOut, RotateCcw, Copy, Check } from 'lucide-react';
import { bahttext } from 'bahttext';

interface Item {
  item_code?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  discount: number;
  grand_total?: number;
  items: Item[];
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: string;
  introCourse?: string;
  regulatoryText?: string;
  requesterName?: string;
  requesterPosition?: string;
  requesterDate?: string;
  approverName?: string;
  approverPosition?: string;
  approverDate?: string;
  invoices?: Invoice[];
  onDownload?: () => void;
}

function formatPrice(val: number): string {
  if (val % 1 === 0) {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function formatVendorWithPrefix(vendor: string): string {
  if (!vendor) return '';
  const trimmed = vendor.trim();
  if (
    trimmed.startsWith('บริษัท') ||
    trimmed.startsWith('ร้าน') ||
    trimmed.startsWith('ห้างหุ้นส่วน') ||
    trimmed.startsWith('หจก.') ||
    trimmed.startsWith('บจก.')
  ) {
    return `จาก${trimmed}`;
  }
  return `จากบริษัท ${trimmed}`;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  department = 'สำนักบริหารเครือข่ายและสร้างความตระหนัก (สบร.)',
  introCourse = 'จัดซื้อวัสดุสำหรับการจัดกิจกรรมและดำเนินงานโครงการ',
  regulatoryText = 'หนังสือคณะกรรมการวินิจฉัยปัญหาการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ กรมบัญชีกลาง ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119 ลงวันที่ 7 มีนาคม 2561 ตาราง 1 ลำดับที่ 3',
  requesterName = 'นางสาวศิริพักตร์ เสมียนคิด',
  requesterPosition = 'เจ้าหน้าที่ผู้รับผิดชอบ',
  requesterDate = '   /            / 2568',
  approverName = 'นางสาวปราณปริยา วงค์ษา',
  approverPosition = 'ผู้อำนวยการสำนักบริหารเครือข่ายและสร้างความตระหนัก',
  approverDate = '   /            / 2568',
  invoices = [],
  onDownload,
}) => {
  const [zoomScale, setZoomScale] = useState(100);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Flatten all items across invoices exactly like docxGenerator
  const flatItems: {
    idx: number;
    code: string;
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    vendor: string;
    invNum: string;
    invDate: string;
    invoiceIdx: number;
  }[] = [];

  const invoiceRanges: {
    invoiceIdx: number;
    start: number;
    end: number;
    subtotal: number;
    discount: number;
    grandTotal: number;
  }[] = [];

  let globalCounter = 1;

  invoices.forEach((inv, invIdx) => {
    const startIdx = globalCounter;
    let invSubtotal = 0;

    (inv.items || []).forEach(item => {
      const desc = item.description || '';
      const code = item.item_code || '';
      invSubtotal += item.total_price || 0;

      flatItems.push({
        idx: globalCounter++,
        code,
        description: desc,
        qty: item.quantity || 1,
        unit: item.unit || 'ชิ้น',
        unitPrice: item.unit_price || 0,
        totalPrice: item.total_price || 0,
        vendor: inv.vendor_name || 'ร้านค้า/บริษัทผู้ขาย',
        invNum: inv.invoice_number || '-',
        invDate: inv.invoice_date || '-',
        invoiceIdx: invIdx,
      });
    });

    const endIdx = globalCounter - 1;
    const discount = Number(inv.discount || 0);
    const grandTotal = Math.max(0, invSubtotal - discount);

    invoiceRanges.push({
      invoiceIdx: invIdx,
      start: startIdx,
      end: endIdx,
      subtotal: invSubtotal,
      discount,
      grandTotal,
    });
  });

  const totalItemsCount = flatItems.length;
  const grandSubtotal = flatItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalDiscount = invoiceRanges.reduce((sum, r) => sum + r.discount, 0);
  const grandTotalPaid = grandSubtotal - totalDiscount;
  const thaiTextAmount = bahttext(grandTotalPaid);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let text = `บันทึกข้อความ\nส่วนราชการ: ${department} โทร. 033 005 833\nที่: สคร.     /2568    วันที่: ${requesterDate}\nเรื่อง: รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง จำนวน ${totalItemsCount} รายการ\nเรียน: ${approverPosition} ผ่าน รก.หน.ฝถท.\n\n`;
    text += `ด้วย ${department} ได้ดำเนินการจัดซื้อวัสดุสำหรับการจัด ${introCourse} จำนวน ${totalItemsCount} รายการ โดยมีรายละเอียดดังต่อไปนี้:\n\n`;
    
    flatItems.forEach(item => {
      const descText = item.code ? `${item.code} ${item.description}` : item.description;
      text += `${item.idx}. ค่า ${descText} จำนวน ${item.qty} ${item.unit} เป็นเงิน ${formatPrice(item.totalPrice)} บาท ${formatVendorWithPrefix(item.vendor)} ตามใบเสร็จเลขที่ ${item.invNum} ลงวันที่ ${item.invDate}\n`;
    });

    text += `\nรวม ${totalItemsCount} รายการ เป็นเงินทั้งสิ้น ${formatPrice(grandTotalPaid)} บาท (${thaiTextAmount})\n`;
    text += `การจัดซื้อจัดจ้างดังกล่าว เป็นการดำเนินการตาม ${regulatoryText}\nจึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ\n\n`;
    text += `( ${requesterName} )\n${requesterPosition}\n\n( ${approverName} )\n${approverPosition}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full max-h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Control Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between shrink-0 bg-slate-50 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 font-display">
                ตัวอย่างบันทึกข้อความราชการ (Live A4 Preview)
              </h3>
              <p className="text-[11px] text-slate-500">
                จำลองหน้ากระดาษ A4 เสมือนจริงตรงตามไฟล์ Word (.docx) 100%
              </p>
            </div>
          </div>

          {/* Controls: Zoom, Copy, Print, Download */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
              <button
                onClick={() => setZoomScale(prev => Math.max(60, prev - 10))}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                title="ย่อขนาด"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-700 px-1.5 min-w-[42px] text-center">
                {zoomScale}%
              </span>
              <button
                onClick={() => setZoomScale(prev => Math.min(140, prev + 10))}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                title="ขยายขนาด"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomScale(100)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                title="รีเซ็ตขนาด 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Copy Full Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="คัดลอกข้อความทั้งหมด"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-xs"
              title="พิมพ์เอกสาร"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download docx Button */}
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด Word (.docx)</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scalable A4 Word Page Replica */}
        <div className="p-3 sm:p-8 overflow-auto flex-1 bg-slate-200/90 flex flex-col items-center custom-scroll">
          <div 
            style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}
            className="w-full max-w-[210mm] min-h-[297mm] h-auto shrink-0 bg-white text-slate-900 shadow-2xl p-8 sm:p-14 pb-16 my-2 sm:my-4 font-thai border border-slate-300/80 text-base leading-relaxed space-y-4 rounded-xs break-words transition-transform duration-200"
          >
            {/* Header: บันทึกข้อความ */}
            <div className="border-b-2 border-slate-900 pb-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight font-thai">
                บันทึกข้อความ
              </h1>
            </div>

            {/* 2. ส่วนราชการ */}
            <div className="text-base text-slate-900 leading-snug">
              <span className="font-bold">ส่วนราชการ  </span>
              <span>{department}  โทร. 033 005 833</span>
            </div>

            {/* 3. ที่ และ วันที่ */}
            <div className="flex flex-wrap justify-between items-center text-base text-slate-900 leading-snug">
              <div>
                <span className="font-bold">ที่  </span>
                <span>สคร.             /2568</span>
              </div>
              <div className="mr-8">
                <span className="font-bold">วันที่  </span>
                <span>{requesterDate || '   /            / 2568'}</span>
              </div>
            </div>

            {/* 4. เรื่อง */}
            <div className="text-base text-slate-900 leading-snug">
              <span className="font-bold">เรื่อง  </span>
              <span className="font-bold">รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง  จำนวน {totalItemsCount}  รายการ</span>
            </div>

            {/* 5. เรียน */}
            <div className="text-base text-slate-900 leading-snug pb-2">
              <span className="font-bold">เรียน  </span>
              <span>{approverPosition || 'ผอ.สคร.'}  ผ่าน รก.หน.ฝถท.</span>
            </div>

            <div className="h-2" />

            {/* 6. Intro Paragraph */}
            <p className="text-base text-slate-900 text-justify indent-12 leading-relaxed">
              ด้วย {department}  ได้ดำเนินการจัดซื้อวัสดุสำหรับการจัด  {introCourse}  จำนวน  {totalItemsCount}  รายการ  โดยใช้งบประมาณโครงการจัดกิจกรรมพัฒนาเครือข่ายและสร้างความตระหนัก  ซึ่งมีรายละเอียดดังต่อไปนี้
            </p>

            {/* 7. Numbered Items Paragraphs */}
            <div className="space-y-2.5 pt-1">
              {flatItems.map(item => {
                const descText = item.code ? `${item.code} ${item.description}` : item.description;
                const priceStr = formatPrice(item.totalPrice);
                const matchingRange = invoiceRanges.find(r => r.end === item.idx && r.discount > 0);

                return (
                  <div key={item.idx} className="space-y-1">
                    <p className="text-base text-slate-900 text-justify indent-8 leading-relaxed">
                      <span>{item.idx}. ค่า </span>
                      <span className="font-bold">{descText}</span>
                      <span>  จำนวน  {item.qty}  {item.unit}  เป็นเงิน  {priceStr}  บาท  {formatVendorWithPrefix(item.vendor)}  ตามใบเสร็จรับเงิน/ใบกำกับภาษี เลขที่ {item.invNum} ลงวันที่ {item.invDate}</span>
                    </p>

                    {/* Discount note if present */}
                    {matchingRange && (
                      <p className="text-sm italic text-slate-600 indent-12">
                        หมายเหตุ : รายการที่ {matchingRange.start}-{matchingRange.end} มีส่วนลดสุทธิ {formatPrice(matchingRange.discount)} บาท รวมเป็นเงินทั้งสิ้น {formatPrice(matchingRange.grandTotal)} บาท
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 8. Total Summary Paragraph */}
            <p className="text-base font-bold text-slate-900 text-justify indent-8 pt-2 leading-relaxed">
              รวม {totalItemsCount} รายการ เป็นเงินทั้งสิ้น {formatPrice(grandTotalPaid)} บาท ({thaiTextAmount})
            </p>

            {/* 9. Regulatory Reference Paragraph */}
            <p className="text-base text-slate-900 text-justify indent-8 leading-relaxed">
              การจัดซื้อจัดจ้างดังกล่าว เป็นการดำเนินการตาม {regulatoryText}
            </p>

            <div className="h-2" />

            {/* 10. Conclusion Paragraph */}
            <p className="text-base text-slate-900 text-justify indent-8 leading-relaxed">
              จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
            </p>

            <div className="h-6" />

            {/* Signature Blocks */}
            <div className="space-y-8 pr-4">
              {/* Requester Signature Block */}
              <div className="text-right space-y-1">
                <p className="text-base font-bold text-slate-900">
                  ( {requesterName || 'นางสาวศิริพักตร์  เสมียนคิด'} )
                </p>
                <p className="text-sm text-slate-700">
                  {requesterPosition || 'เจ้าหน้าที่ผู้รับผิดชอบ'}
                </p>
                <p className="text-sm text-slate-500">
                  {requesterDate || '   /            / 2568'}
                </p>
              </div>

              {/* Approver Signature Block */}
              <div className="text-right space-y-1 pt-4">
                <p className="text-base font-bold text-slate-900">
                  ( {approverName || 'นางสาวปราณปริยา   วงค์ษา'} )
                </p>
                <p className="text-sm text-slate-700">
                  {approverPosition || 'ผอ.สคร.'}
                </p>
                <p className="text-sm text-slate-500">
                  {approverDate || '   /            / 2568'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
