import React from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                ตัวอย่างบันทึกข้อความ (Word .docx Preview)
              </h3>
              <p className="text-xs text-slate-500">
                แสดงผลตรงตามไฟล์ Word (.docx) ที่จะดาวน์โหลด 100%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด Word (.docx)
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
              title="พิมพ์เอกสาร"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Exact A4 Word Page Replica */}
        <div className="p-3 sm:p-8 overflow-y-auto flex-1 bg-slate-200/80 flex flex-col items-center">
          <div className="w-full max-w-[210mm] min-h-[297mm] h-auto shrink-0 bg-white text-slate-900 shadow-2xl p-8 sm:p-14 pb-16 my-2 sm:my-6 font-sans border border-slate-300/80 text-base leading-relaxed space-y-4 rounded-xs break-words">
            
            {/* 1. Header Title: บันทึกข้อความ (Bold 29pt) */}
            <div className="border-b-2 border-slate-900 pb-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight font-serif">
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

            {/* Signature Blocks (Right Aligned matching Word template) */}
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
