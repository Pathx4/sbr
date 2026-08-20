import React from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';

interface ItemRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  docNumber?: string;
  docDate?: string;
  subject?: string;
  requesterName?: string;
  requesterPosition?: string;
  approverName?: string;
  approverPosition?: string;
  items?: ItemRow[];
  totalAmount?: number;
  totalAmountText?: string;
  onDownload?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  title = 'ตัวอย่างเอกสารบันทึกข้อความ (Live Preview)',
  docNumber = 'สทอภ (สบร) / 2568',
  docDate = '20 สิงหาคม 2568',
  subject = 'ขออนุมัติจัดซื้อจัดจ้างพัสดุ/บริการ',
  requesterName = 'เจ้าหน้าที่ผู้ขอซื้อ',
  requesterPosition = 'ปฏิบัติงาน',
  approverName = 'ผู้อำนวยการสำนัก',
  approverPosition = 'ผู้อำนวยการสำนักบริหารเครือข่ายและสร้างความตระหนัก',
  items = [],
  totalAmount = 0,
  totalAmountText = '',
  onDownload,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500">พรีวิวเค้าโครงเอกสารราชการเสมือนจริงก่อนสั่งพิมพ์หรือส่งออก</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลดเอกสาร
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

        {/* Modal Body: A4 Paper Simulation */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl p-8 sm:p-12 font-sans border border-slate-200 text-sm leading-relaxed space-y-6">
            {/* Garuda / Header Icon */}
            <div className="text-center space-y-1">
              <div className="w-14 h-14 mx-auto bg-slate-50 rounded-full flex items-center justify-center border border-slate-300 font-serif font-black text-xl text-slate-700">
                ครุฑ
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">บันทึกข้อความ</h2>
            </div>

            {/* Memo Header Fields */}
            <div className="space-y-1.5 border-b border-slate-300 pb-4 text-xs sm:text-sm">
              <div className="flex justify-between">
                <p><strong>หน่วยงาน:</strong> สำนักบริหารเครือข่ายและสร้างความตระหนัก (สบร.) โทร. 1234</p>
                <p><strong>ที่:</strong> {docNumber}</p>
              </div>
              <div className="flex justify-between">
                <p><strong>วันที่:</strong> {docDate}</p>
              </div>
              <div>
                <p><strong>เรื่อง:</strong> {subject}</p>
              </div>
              <div>
                <p><strong>เรียน:</strong> {approverName} ({approverPosition})</p>
              </div>
            </div>

            {/* Memo Body Content */}
            <div className="space-y-3 text-xs sm:text-sm">
              <p className="indent-8 text-slate-800">
                ด้วย สำนักบริหารเครือข่ายและสร้างความตระหนัก มีความประสงค์จะดำเนินการจัดซื้อ/จัดจ้างพัสดุเพื่อใช้ในการดำเนินกิจกรรมตามภารกิจโครงการ โดยมีรายละเอียดรายการพัสดุดังต่อไปนี้:
              </p>

              {/* Items Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="p-2 border-r border-slate-300 text-center w-10">ลำดับ</th>
                      <th className="p-2 border-r border-slate-300">รายการ</th>
                      <th className="p-2 border-r border-slate-300 text-center w-16">จำนวน</th>
                      <th className="p-2 border-r border-slate-300 text-center w-16">หน่วย</th>
                      <th className="p-2 border-r border-slate-300 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-2 text-right w-28">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b border-slate-200">
                          <td className="p-2 border-r border-slate-200 text-center text-slate-600">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-800">{item.description}</td>
                          <td className="p-2 border-r border-slate-200 text-center text-slate-700">{item.quantity}</td>
                          <td className="p-2 border-r border-slate-200 text-center text-slate-700">{item.unit}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700">{item.unit_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-medium font-mono text-slate-900">{item.total_price.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400">
                          (ไม่มีรายการสินค้า)
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-300">
                      <td colSpan={5} className="p-2.5 text-right border-r border-slate-300 text-slate-700">
                        รวมเงินทั้งสิ้น {totalAmountText && `(${totalAmountText})`}
                      </td>
                      <td className="p-2.5 text-right text-indigo-700 font-mono font-bold">
                        ฿ {totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="indent-8 text-slate-800">
                จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
              </p>
            </div>

            {/* Signature Area */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-12">
                <p className="text-transparent select-none">.</p>
                <div className="space-y-1">
                  <p className="text-slate-400">ลงชื่อ..........................................................</p>
                  <p className="font-semibold text-slate-800">({requesterName})</p>
                  <p className="text-slate-500">{requesterPosition}</p>
                  <p className="text-slate-400 text-[11px]">ผู้ขออนุมัติ</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="text-transparent select-none">.</p>
                <div className="space-y-1">
                  <p className="text-slate-400">ลงชื่อ..........................................................</p>
                  <p className="font-semibold text-slate-800">({approverName})</p>
                  <p className="text-slate-500">{approverPosition}</p>
                  <p className="text-slate-400 text-[11px]">ผู้อนุมัติ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
