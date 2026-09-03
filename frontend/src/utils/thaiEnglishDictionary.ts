// ============================================================================
// THAI & ENGLISH PROCUREMENT LEXICON, DICTIONARY & LINGUISTIC SPELL CHECKER
// High-accuracy dictionary comparison and OCR typo repair for invoices & receipts
// ============================================================================

/**
 * Standard Levenshtein Distance
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ============================================================================
// 1. MASTER ENGLISH PROCUREMENT & BRAND DICTIONARY
// ============================================================================

export const MASTER_ENGLISH_DICTIONARY: string[] = [
  // Major Brands (Office, Hardware, Electronics, Retail)
  'DOUBLE A', 'HORSE', 'ELEPHANT', 'STAEDTLER', 'PILOT', 'PENTEL', 'STABILO', 'FABER-CASTELL', 'ROTEL',
  'QUANTUM', 'FASTER', 'MONAMI', 'ZEBRA', 'ARTLINE', 'CASIO',
  '3M', 'SCOTT', 'KLEENEX', 'POST-IT', 'SCOTCH', 'ARROW', 'ARO', 'TOWA',
  'CANON', 'EPSON', 'HP', 'BROTHER', 'FUJITSU', 'PANASONIC', 'PHILIPS', 'SAMSUNG', 'SONY',
  'SCHNEIDER', 'BOSCH', 'MAKITA', 'STANLEY', 'DEWALT', 'TOTAL', 'INGCO',
  'GIANT KINGKONG', 'KINGKONG', 'LEETECH', 'LUZINO', 'NANO', 'CHANG', 'HACO', 'YAZAKI', 'BCC',
  'LOGITECH', 'SANDISK', 'KINGSTON', 'CORSAIR', 'ASUS', 'ACER', 'LENOVO', 'DELL',

  // Stationery & Office Supplies
  'PAPER', 'COPY', 'LASER', 'INKJET', 'PRINT', 'PRINTER', 'PHOTO', 'GLOSSY', 'MATTE',
  'FILE', 'FOLDER', 'BINDER', 'LEVER', 'RING', 'EXPANDING', 'POCKET', 'DIVIDER',
  'PEN', 'BALLPOINT', 'GEL', 'ROLLER', 'FOUNTAIN', 'HIGHLIGHTER', 'MARKER', 'WHITEBOARD', 'PERMANENT',
  'PENCIL', 'MECHANICAL', 'LEAD', 'ERASER', 'CORRECTION', 'FLUID', 'TAPE',
  'SCISSORS', 'CUTTER', 'BLADE', 'KNIFE', 'RULER', 'SCALE',
  'STAPLER', 'STAPLES', 'REMOVER', 'PUNCH', 'PERFORATOR', 'CLIP', 'PAPERCLIP', 'FASTENER',
  'ENVELOPE', 'MAILER', 'LABEL', 'STICKER', 'NOTEBOOK', 'NOTEPAD', 'MEMO', 'PAD', 'DIARY',
  'GLUE', 'ADHESIVE', 'STICK', 'SUPERGLUE', 'EPOXY', 'SEALANT',
  'CALCULATOR', 'DESK', 'ORGANIZER', 'TRAY', 'BASKET', 'SHREDDER', 'LAMINATOR',

  // IT, Computer & Electronics
  'INK', 'CARTRIDGE', 'TONER', 'RIBBON', 'BOTTLE', 'DRUM',
  'CABLE', 'WIRE', 'CORD', 'CONNECTOR', 'ADAPTER', 'CONVERTER',
  'USB', 'HDMI', 'VGA', 'DISPLAYPORT', 'LAN', 'ETHERNET', 'RJ45', 'CAT5E', 'CAT6',
  'MOUSE', 'KEYBOARD', 'PAD', 'MONITOR', 'SCREEN', 'STAND',
  'FLASH', 'DRIVE', 'DISK', 'HARDDISK', 'SSD', 'HDD', 'MEMORY', 'CARD', 'MICROSD',
  'BATTERY', 'CHARGER', 'ALKALINE', 'LITHIUM', 'POWER', 'BANK', 'SUPPLY', 'UPS',
  'MODULE', 'SENSOR', 'BOARD', 'DEVELOPMENT', 'CONTROLLER', 'MICROCONTROLLER',
  'BLUETOOTH', 'WIRELESS', 'WIFI', 'ROUTER', 'SWITCH', 'HUB',

  // Construction, Hardware & Electrical
  'PLUG', 'SOCKET', 'RECEPTACLE', 'SWITCH', 'BREAKER', 'PANEL', 'BOX', 'JUNCTION',
  'CONDUIT', 'PIPE', 'TUBE', 'FITTING', 'ELBOW', 'COUPLING', 'TEE', 'UNION', 'CLAMP',
  'SCREW', 'NUT', 'BOLT', 'WASHER', 'ANCHOR', 'NAIL', 'RIVET',
  'TERMINAL', 'LUG', 'GLAND', 'TIE', 'CABLETIE', 'INSULATION',
  'HAMMER', 'PLIERS', 'WRENCH', 'SCREWDRIVER', 'SAW', 'DRILL', 'BIT', 'LEVEL', 'TAPE-MEASURE',
  'PAINT', 'BRUSH', 'ROLLER', 'THINNER', 'SOLVENT', 'TAPE', 'MASKING',

  // Grocery, Hygiene & Cleaning
  'TOWEL', 'KITCHEN', 'TISSUE', 'FACIAL', 'NAPKIN', 'ROLL', 'WIPES',
  'JUMBO', 'EXTRA', 'SUPER', 'MEGA', 'STANDARD', 'PREMIUM', 'PLUS',
  'CLEANER', 'DETERGENT', 'SOAP', 'DISINFECTANT', 'ALCOHOL', 'BLEACH',
  'BAG', 'GARBAGE', 'TRASH', 'GLOVE', 'MASK', 'SPONGE', 'MOP', 'BROOM',

  // Units of Measurement
  'PCS', 'PC', 'PACK', 'PK', 'BOX', 'BX', 'SET', 'ROLL', 'RL', 'REAM', 'RM', 'DOZ', 'DZ',
  'PAIR', 'PR', 'BAG', 'BG', 'BOTTLE', 'BTL', 'CAN', 'TUBE', 'SHEET', 'SH',
  'METER', 'METRE', 'MTR', 'CM', 'MM', 'INCH', 'FOOT', 'FT',
  'KG', 'GRAM', 'GR', 'LITER', 'LITRE', 'LTR', 'ML', 'OZ', 'VOLT', 'WATT', 'AMP',

  // Invoicing & Commercial Terms
  'TAX', 'INVOICE', 'RECEIPT', 'ORIGINAL', 'COPY',
  'TOTAL', 'SUBTOTAL', 'AMOUNT', 'PRICE', 'QTY', 'QUANTITY', 'UNIT',
  'ITEM', 'DESCRIPTION', 'DISCOUNT', 'DISC', 'NET', 'GROSS', 'VAT',
  'CASH', 'CHANGE', 'CREDIT', 'CARD', 'TRANSFER', 'PAID',
  'BRANCH', 'STORE', 'SHOP', 'COMPANY', 'LIMITED', 'CORPORATION',
  'DATE', 'TIME', 'NO', 'DOC', 'REF', 'ORDER', 'THANK', 'YOU'
];

export const ENGLISH_DICTIONARY_SET = new Set(MASTER_ENGLISH_DICTIONARY.map(w => w.toUpperCase()));

// ============================================================================
// 2. MASTER THAI PROCUREMENT & COMMERCIAL VOCABULARY
// ============================================================================

export const MASTER_THAI_DICTIONARY: string[] = [
  // Legal & Invoicing Terms
  'บริษัท', 'จำกัด (มหาชน)', 'จำกัด', 'ห้างหุ้นส่วนจำกัด', 'ห้างหุ้นส่วน', 'สำนักงานใหญ่', 'สาขา', 'สาขาที่',
  'ใบกำกับภาษีอย่างย่อ', 'ใบกำกับภาษี', 'ใบเสร็จรับเงิน', 'เอกสารออกเป็นชุด', 'ต้นฉบับ', 'สำเนา',
  'เลขประจำตัวผู้เสียภาษี', 'ผู้เสียภาษีอากร', 'ผู้เสียภาษี', 'โทรศัพท์', 'โทรสาร', 'ที่อยู่',
  'รวมเป็นเงิน', 'รวมเงิน', 'ยอดรวม', 'ยอดรวมสุทธิ', 'ยอดเงินสุทธิ', 'จำนวนเงินทั้งสิ้น', 'ยอดสุทธิ',
  'มูลค่าสินค้า', 'ฐานภาษี', 'ภาษีมูลค่าเพิ่ม', 'ส่วนลด', 'หักส่วนลด', 'เงินสด', 'เงินทอน',

  // Stationery & Office Supplies
  'กระดาษถ่ายเอกสาร A4', 'กระดาษถ่ายเอกสาร', 'กระดาษพิมพ์งาน', 'กระดาษการ์ด', 'กระดาษโน้ต',
  'กระดาษต่อเนื่อง', 'กระดาษชำระ', 'กระดาษทิชชู่', 'กระดาษคาร์บอน', 'กระดาษการ์ดขาว', 'กระดาษถนอมสายตา',
  'แฟ้มห่วง', 'แฟ้มสันกว้าง', 'แฟ้มซอง', 'แฟ้มหนีบ', 'แฟ้มเอกสาร', 'แฟ้มแขวน', 'แฟ้มเสนองาน', 'แฟ้มโชว์เอกสาร',
  'ปากกาลูกลื่น', 'ปากกาหมึกเจล', 'ปากกาเจล', 'ปากกาเน้นข้อความ', 'ปากกาเคมี', 'ปากกาไวท์บอร์ด', 'ปากกาตัดเส้น',
  'ดินสอดำ 2B', 'ดินสอดำ', 'ดินสอกด', 'ไส้ดินสอกด', 'ยางลบ', 'ยางลบดินสอ',
  'น้ำยาลบคำผิด', 'เทปลบคำผิด', 'ไส้เทปลบคำผิด', 'ไม้บรรทัด', 'ไม้บรรทัดเหล็ก', 'ไม้บรรทัดพลาสติก',
  'กรรไกร', 'มีดคัตเตอร์', 'คัตเตอร์', 'ใบมีดคัตเตอร์', 'แผ่นรองตัด',
  'ลวดเย็บกระดาษ', 'เครื่องเย็บกระดาษ', 'เครื่องเจาะกระดาษ', 'ที่ถอนลวดเย็บ',
  'คลิปหนีบกระดาษ', 'คลิปดำ', 'คลิปหนีบขาว', 'หมุดปักบอร์ด',
  'เทปใส', 'เทปใสแกนเล็ก', 'เทปกาวสองหน้า', 'เทปกาวสองหน้าบาง', 'เทปกาวสองหน้าโฟม', 'เทปผ้า', 'เทปกระดาษกาวย่น',
  'กาวน้ำ', 'กาวลาเท็กซ์', 'กาวแท่ง', 'กาวร้อน', 'กาวซิลิโคน', 'กาวตราช้าง', 'ปืนยิงกาวร้อน', 'กาวดักหนู',
  'ซองจดหมาย', 'ซองเอกสารสีน้ำตาล', 'ซองขยายข้าง', 'ซองใส่เอกสาร',
  'สมุดบันทึก', 'สมุดบัญชี', 'สมุดฉีก', 'โพสต์อิท', 'กระดาษกาวโน้ต',
  'ตลับชาด', 'แท่นประทับตรา', 'หมึกเติมแท่นประทับ', 'ตรายาง',

  // IT & Computer Supplies
  'ตลับหมึกพิมพ์', 'ตลับหมึก', 'หมึกพิมพ์', 'ผงหมึกโทนเนอร์', 'หมึกอิงค์เจ็ท', 'ริบบอน', 'ผ้าหมึกพิมพ์',
  'แฟลชไดรฟ์', 'ฮาร์ดดิสก์', 'การ์ดหน่วยความจำ', 'การ์ดรีดเดอร์',
  'สายชาร์จ', 'สายสัญญาณ', 'สายแลน', 'สายต่อพ่วง', 'สายเคเบิล', 'สายไฟคอมพิวเตอร์',
  'แป้นพิมพ์', 'คีย์บอร์ด', 'เมาส์ไร้สาย', 'เมาส์', 'แผ่นรองเมาส์',
  'แบตเตอรี่', 'ถ่านอัลคาไลน์', 'ถ่านไฟฉาย', 'ถ่านชาร์จ', 'ซองใส่บัตร', 'สายคล้องบัตร',
  'จอมอนิเตอร์', 'เครื่องพิมพ์เลเซอร์', 'เครื่องพิมพ์อิงค์เจ็ท', 'เครื่องเคลือบบัตร', 'พลาสติกเคลือบบัตร',

  // Hardware, Electrical & Tools
  'ตู้กันน้ำพลาสติกฝาทึบ', 'ตู้กันน้ำพลาสติกฝาใส', 'ตู้กันน้ำพลาสติก', 'ตู้กันน้ำ', 'ตู้ไฟสวิตช์บอร์ด', 'กล่องกันน้ำ', 'กล่องพักสายไฟ',
  'ท่อหด', 'ท่อตรงยูพีวีซี', 'ท่อยูพีวีซี', 'ท่อร้อยสายไฟ', 'ท่อพีวีซี', 'ท่อเฟล็กซ์', 'ท่ออ่อน',
  'ข้อต่อตรง', 'ข้องอ 90', 'กิ๊บจับท่อ', 'แคล้มก้ามปู', 'ข้อต่อท่อ',
  'หัวแร้งบัดกรีด้ามปืน', 'หัวแร้งบัดกรี', 'หัวแร้ง', 'ตะกั่วบัดกรี', 'ตะกั่วเส้น', 'น้ำยาประสานบัดกรี', 'ที่ดูดตะกั่ว',
  'เคเบิ้ลแกลนด์', 'เคเบิลแกลนด์', 'เคเบิ้ลไทร์', 'เคเบิลไทร์', 'สายรัดเคเบิ้ลไทร์', 'สายรัดสายไฟ', 'หางปลา', 'ปลอกสายไฟ',
  'สายไฟ VAF', 'สายไฟ VCT', 'สายไฟ THW', 'สายไฟ NYY', 'สายไฟอ่อน', 'สายไฟทองแดง',
  'สวิตช์ไฟ', 'สวิตช์', 'เต้ารับกราวด์คู่', 'เต้ารับ', 'เบรกเกอร์', 'เมนเบรกเกอร์',
  'พาวเวอร์ปลั๊ก', 'ปลั๊กไฟ', 'ปลั๊กพ่วง', 'รางปลั๊กไฟ', 'เทปพันสายไฟ',
  'หลอดไฟ LED', 'หลอดไฟ', 'โคมไฟ', 'สปอร์ตไลท์', 'สายดิน',

  // General Grocery & Cleaning Supplies
  'กระดาษอเนกประสงค์', 'กระดาษเช็ดมือ', 'สบู่เหลวล้างมือ', 'แอลกอฮอล์เจล', 'แอลกอฮอล์ทำความสะอาด',
  'น้ำยาล้างจาน', 'น้ำยาถูพื้น', 'น้ำยาเช็ดกระจก', 'น้ำยาฆ่าเชื้อ', 'ผงซักฟอก',
  'ถุงขยะดำ', 'ถุงขยะชา', 'ถุงขยะใส', 'ถุงพลาสติก', 'ถุงซิปล็อค',
  'ถุงมือยาง', 'ถุงมือผ้า', 'หน้ากากอนามัย', 'ฟองน้ำล้างจาน', 'ผ้าไมโครไฟเบอร์', 'ไม้กวาด', 'ไม้ถูพื้น'
];

// ============================================================================
// 3. KNOWN HIGH-FREQUENCY THAI OCR CORRECTION RULES
// ============================================================================

export const THAI_OCR_FIXES: [RegExp, string][] = [
  // Legal & Invoicing Typos
  [/บริษัท[\s\.]*จำกั[ดคตกัดุ]/g, 'บริษัท จำกัด'],
  [/บหาชน/g, 'มหาชน'],
  [/จํากัด/g, 'จำกัด'],
  [/บรษท|บริษท/g, 'บริษัท'],
  [/หจก(?!\.)/g, 'หจก.'],
  [/สำน้กงานใหญ่|สํานักงานใหญ่/g, 'สำนักงานใหญ่'],
  [/สาซา|สๅขๅ/g, 'สาขา'],
  [/ใบกํากับภาษี|ใบกำกับภาษึ/g, 'ใบกำกับภาษี'],
  [/ใบเสร็จร้บเงิน|ใบเสร็จรับเงืน/g, 'ใบเสร็จรับเงิน'],
  [/ผู้เสียภาษือากร|ผู้เสึยภาษี/g, 'ผู้เสียภาษี'],
  [/เลขประจําตัว/g, 'เลขประจำตัว'],

  // Stationery & Office Typos
  [/กระดาศ/g, 'กระดาษ'],
  [/กระดาษถายเอกสาร/g, 'กระดาษถ่ายเอกสาร'],
  [/กระดาษต่อเนือง/g, 'กระดาษต่อเนื่อง'],
  [/กระดาษทิชชู(?!\่)/g, 'กระดาษทิชชู่'],
  [/แฟม(?=ห่วง|สัน|ซอง|หนีบ|เอกสาร|ตราช้าง)/g, 'แฟ้ม'],
  [/แฟ้มสันกวาง/g, 'แฟ้มสันกว้าง'],
  [/ปากกาลูกลืน/g, 'ปากกาลูกลื่น'],
  [/ปากกาหมึกเจลลี่/g, 'ปากกาเจล'],
  [/ปากกาเน้นขอความ|เน้นขอความ/g, 'ปากกาเน้นข้อความ'],
  [/ปากกาไวทบอร์ด/g, 'ปากกาไวท์บอร์ด'],
  [/นำยาลบคำผิด|นำยาลบ/g, 'น้ำยาลบคำผิด'],
  [/เทปลบคำผิค|เทปลบคำผิด/g, 'เทปลบคำผิด'],
  [/ไมบรรทัด|ไม๊บรรทัด/g, 'ไม้บรรทัด'],
  [/กรรไก(?!\w)/g, 'กรรไกร'],
  [/มีดคัตเตอร|คัตเตอร(?!\w)/g, 'คัตเตอร์'],
  [/ใบมีดคัตเตอร/g, 'ใบมีดคัตเตอร์'],
  [/ลวดเยบกระดาษ|ลวดเย็บกระดาษ/g, 'ลวดเย็บกระดาษ'],
  [/เครืองเย็บกระดาษ|เครืองเย็บ/g, 'เครื่องเย็บกระดาษ'],
  [/เครืองเจาะกระดาษ/g, 'เครื่องเจาะกระดาษ'],
  [/คลิปหนีบกระดาษ/g, 'คลิปหนีบกระดาษ'],
  [/เทปกระดาษกาวยน/g, 'เทปกระดาษกาวย่น'],
  [/เทปกาวสองหนา/g, 'เทปกาวสองหน้า'],
  [/ซองเอกสารสีนำตาล|ซองเอกสารสีนํ้าตาล/g, 'ซองเอกสารสีน้ำตาล'],
  [/สมุดบนทึก|สมุดบันทีก/g, 'สมุดบันทึก'],
  [/สมุดบญชี/g, 'สมุดบัญชี'],
  [/โพสตอิท|โพสท์อิท|โพสอิท/g, 'โพสต์อิท'],
  [/ยางลบดินสอ/g, 'ยางลบดินสอ'],

  // IT & Computer Typos
  [/ตลัปหมึก|ตลับหมืก/g, 'ตลับหมึก'],
  [/ตลับหมึกพิมพ|หมึกพิมพ/g, 'หมึกพิมพ์'],
  [/ผงหมึกโทนเนอร|โทนเนอร/g, 'โทนเนอร์'],
  [/หมึกอิงคเจ็ท|อิงค์เจ็ต/g, 'อิงค์เจ็ท'],
  [/แฟลชไดรฟ|แฟลชไดร์ฟ/g, 'แฟลชไดรฟ์'],
  [/ฮารดดิสก์|ฮาร์ดดิส/g, 'ฮาร์ดดิสก์'],
  [/การดหน่วยความจำ/g, 'การ์ดหน่วยความจำ'],
  [/สายชารจ|สายชารท์/g, 'สายชาร์จ'],
  [/สายสญญาณ/g, 'สายสัญญาณ'],
  [/แปนพิมพ์|แป้นพิมพ/g, 'แป้นพิมพ์'],
  [/คีย์บอรด/g, 'คีย์บอร์ด'],
  [/เมาสไร้สาย|เม้าส์ไร้สาย|เม้าส์/g, 'เมาส์'],
  [/แผนรองเมาส์|แผ่นรองเมาส/g, 'แผ่นรองเมาส์'],
  [/ถ่านอลคาไลน์|ถ่านอัลคาไลน/g, 'ถ่านอัลคาไลน์'],

  // Hardware & Electrical Typos
  [/ปลิ๊ก|ปลื๊ก|บลั๊ก|ปลัก(?!ๆ)/g, 'ปลั๊ก'],
  [/รางปลักไฟ|รางปลั๊ก/g, 'รางปลั๊กไฟ'],
  [/สวิทช์|สวิตช(?!ก)/g, 'สวิตช์'],
  [/เตารับกราวด์คู่|เต้ารับกราวด์/g, 'เต้ารับกราวด์คู่'],
  [/เบรกเกอร|เบรคเกอร์/g, 'เบรกเกอร์'],
  [/ท่อรอยสายไฟ/g, 'ท่อร้อยสายไฟ'],
  [/ท่อหดความร้อน|ท่อหค/g, 'ท่อหด'],
  [/ท่อตรงยูพึวีซี|ท่อยูพีวีซี/g, 'ท่อยูพีวีซี'],
  [/ท่อพึวีซี/g, 'ท่อพีวีซี'],
  [/ขอต่อตรง/g, 'ข้อต่อตรง'],
  [/ของอ 90/g, 'ข้องอ 90'],
  [/กิ๊ปจับท่อ|กิ๊บจบท่อ/g, 'กิ๊บจับท่อ'],
  [/แคลมก้ามปู/g, 'แคล้มก้ามปู'],
  [/กาวตราชาง/g, 'กาวตราช้าง'],
  [/ปืนยิงกาวรอน|ปืนกาวรอน/g, 'ปืนกาวร้อน'],
  [/กาวซิลีโคน|กาวซิลิโคน/g, 'กาวซิลิโคน'],
  [/เทปพนสายไฟ/g, 'เทปพันสายไฟ'],
  [/หัวแรงบัดกรี|หัวแร้งบัดกรึ|หัวแ(?:\s|$)/g, 'หัวแร้งบัดกรี '],
  [/ตะกัวบัดกรี|ตะกั่วบัดกรึ/g, 'ตะกั่วบัดกรี'],
  [/ตะกั่ว\s*(\d+)\s*กรัม\s*บา(?:\s|$)/g, 'ตะกั่วบัดกรี $1 กรัม '],
  [/เคเบิลแกลนด(?:\s|$)|เคเบิลแกลนด์|เคเบิ้ลแกลนด(?:\s|$)/g, 'เคเบิ้ลแกลนด์ '],
  [/สายรัดสายไฟ\s*C(?:\s|$)/g, 'สายรัดสายไฟ เคเบิ้ลไทร์ '],
  [/\bTAI-FC\b/gi, 'TAI-FONG'],
  [/นำยาประสานบัดกรี/g, 'น้ำยาประสานบัดกรี'],
  [/เคเบิลไทร(?!์)|สายรัดเคเบิล(?!ไทร์)|สายรัดสายรัด/g, 'สายรัด'],
  [/สายรัดเคเบิ้ลไทร์ เคเบิ้ลไทร์/g, 'สายรัดเคเบิ้ลไทร์'],
  [/สายไฟทองแดงไส้เต็ม/g, 'สายไฟทองแดงไส้เต็ม'],
  [/ตู้กนน้ำพลาสติก|ตู้กันน[ำา\u0e4d\u0e32]*/g, 'ตู้กันน้ำ']
];

// ============================================================================
// 4. KNOWN HIGH-FREQUENCY ENGLISH OCR CORRECTION RULES
// ============================================================================

export const ENGLISH_OCR_EXACT_MAP: Record<string, string> = {
  'PAPBR': 'PAPER',
  'PAPEK': 'PAPER',
  'PAPEH': 'PAPER',
  'TOWBL': 'TOWEL',
  'TOVVEL': 'TOWEL',
  'T0WEL': 'TOWEL',
  'SC0TT': 'SCOTT',
  'SCOIT': 'SCOTT',
  'SCOT': 'SCOTT',
  'D0UBLE': 'DOUBLE',
  'DOUBLB': 'DOUBLE',
  'STABlL0': 'STABILO',
  'STABLO': 'STABILO',
  'HlGHLlGHTER': 'HIGHLIGHTER',
  'HIGHTLIGHTER': 'HIGHLIGHTER',
  'MARKBR': 'MARKER',
  'MARKEK': 'MARKER',
  'KB-': 'KEYBOARD',
  'KEYB0ARD': 'KEYBOARD',
  'M0USE': 'MOUSE',
  'CABL3': 'CABLE',
  'BATTBRY': 'BATTERY',
  'CARTRlDGE': 'CARTRIDGE',
  'T0NER': 'TONER',
  'SWlTCH': 'SWITCH',
  'S0CKET': 'SOCKET',
  'BRE4KER': 'BREAKER',
  'C0NDUIT': 'CONDUIT',
  'AM0UNT': 'AMOUNT',
  'PRlCE': 'PRICE',
  'T0TAL': 'TOTAL',
  'TOTA1': 'TOTAL',
  'SUBT0TAL': 'SUBTOTAL',
  '1NV0ICE': 'INVOICE',
  'INV01CE': 'INVOICE',
  'RECElPT': 'RECEIPT',
  'RECIEPT': 'RECEIPT',
  'KLEEN3X': 'KLEENEX',
  'ELEPH4NT': 'ELEPHANT',
  'STAEDLER': 'STAEDTLER',
  'STAEDTLERK': 'STAEDTLER',
  'STAEDTLER-': 'STAEDTLER',
  'PERMANET': 'PERMANENT',
  'PERMENENT': 'PERMANENT',
  'PEMANENT': 'PERMANENT',
  'PIL0T': 'PILOT',
  'PENT3L': 'PENTEL'
};

// ============================================================================
// 5. FUZZY ENGLISH DICTIONARY SPELL-CHECKER
// ============================================================================

/**
 * Checks if a word is an alphanumeric SKU or model number that should NEVER be mutated
 * e.g. 'A4', '2B', '16mm', 'JSN-SR04T', '18650', '22AWG', 'Cat6'
 */
export function isSkuOrModelCode(word: string): boolean {
  if (!word || word.length <= 1) return true;
  // Contains digits and letters mixed (e.g. A4, 2B, 16mm, RJ45)
  if (/\d/.test(word) && /[a-zA-Z]/.test(word)) return true;
  // Contains technical model hyphens/slashes
  if (/[-_\/]/.test(word) && /\d/.test(word)) return true;
  // Pure digits or barcodes
  if (/^\d+$/.test(word)) return true;
  return false;
}

/**
 * Fuzzy matches an English word against the Master English Dictionary
 * Returns the corrected dictionary word if distance is close (<= 1 for len 4-6, <= 2 for len 7+)
 */
export function correctEnglishWordWithFuzzyDictionary(rawWord: string): string {
  if (!rawWord || rawWord.length <= 1) return rawWord;
  const upper = rawWord.toUpperCase();
  const upperCount = (rawWord.match(/[A-Z]/g) || []).length;
  const lowerCount = (rawWord.match(/[a-z]/g) || []).length;
  const isMajorityUpper = upperCount >= lowerCount;
  const isCapitalized = rawWord.length > 1 && rawWord[0] === rawWord[0].toUpperCase() && rawWord.slice(1) === rawWord.slice(1).toLowerCase();

  const formatCasing = (matched: string) => {
    if (isMajorityUpper) return matched.toUpperCase();
    if (isCapitalized) return matched[0].toUpperCase() + matched.slice(1).toLowerCase();
    return matched.toLowerCase();
  };

  // 1. Direct dictionary match -> already correct
  if (ENGLISH_DICTIONARY_SET.has(upper)) return rawWord;

  // 2. Direct exact OCR typo map (check before SKU check to catch SC0TT, AR0, JUMB0, etc.)
  if (ENGLISH_OCR_EXACT_MAP[upper]) {
    return formatCasing(ENGLISH_OCR_EXACT_MAP[upper]);
  }

  // 3. OCR Digit Confusion: 0 -> O, 1 -> I, 5 -> S
  if (/\d/.test(upper)) {
    const deobfuscated = upper.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S');
    if (ENGLISH_DICTIONARY_SET.has(deobfuscated)) {
      return formatCasing(deobfuscated);
    }
  }

  // 4. If it is a real technical SKU or model code (e.g. A4, 2B, 16mm, ESP32, Cat6), protect it!
  if (isSkuOrModelCode(rawWord)) return rawWord;

  // 5. Fuzzy Levenshtein match against Master Dictionary
  if (upper.length >= 4) {
    const maxDist = upper.length >= 7 ? 2 : 1;
    let bestMatch = '';
    let minDist = 999;

    for (const dictWord of MASTER_ENGLISH_DICTIONARY) {
      // Fast length filter (+/- 1 character)
      if (Math.abs(dictWord.length - upper.length) > maxDist) continue;

      const dist = levenshteinDistance(upper, dictWord);
      if (dist < minDist && dist <= maxDist) {
        minDist = dist;
        bestMatch = dictWord;
        if (dist === 1) break; // Early exit on 1-edit distance
      }
    }

    if (bestMatch && minDist <= maxDist) {
      return formatCasing(bestMatch);
    }
  }

  return rawWord;
}

// ============================================================================
// 6. MAIN EXPORT: COMPREHENSIVE LINGUISTIC DICTIONARY CORRECTION ENGINE
// ============================================================================

/**
 * Applies the full Thai & English procurement dictionary and spell checker:
 * 1. Character-level OCR repairs (Sara-Ae, Sara-Am, dangling vowels)
 * 2. Thai High-frequency procurement typo corrections
 * 3. English OCR typo corrections & fuzzy dictionary alignment
 * 4. Technical specification and unit spacing normalization
 */
export function applyThaiEnglishDictionary(text: string): string {
  if (!text) return '';
  let result = text;

  // 1. Thai Character-Level Linguistic Repairs
  // Broken Sara-Ae: เ + เ -> แ
  result = result.replace(/\u0e40\u0e40/g, '\u0e41');
  // Broken Sara-Am: ํ + า -> ำ
  result = result.replace(/\u0e4d\u0e32/g, '\u0e33');
  // Detached upper/lower vowels & tone marks
  result = result.replace(/([ก-ฮ])\s+([\u0e31\u0e34-\u0e3a\u0e47-\u0e4e])/g, '$1$2');
  // Leading dangling tone marks/vowels
  result = result.replace(/^[\u0e31\u0e34-\u0e3a\u0e47-\u0e4e]+/g, '');

  // 1.5. Transliterate pseudo-Thai OCR characters back to English brands & products
  result = result.replace(/ปากก[\.\s_~]+า/g, 'ปากกา ');
  result = result.replace(/ปากดา/g, 'ปากกา');

  // Combined Permanent + Staedtler e.g. "l2ลทเขสเทอ" or "0ยก เขสเทอก"
  result = result.replace(/l2ลท\s*เข[สล]เทอ[กรก!\d]*/gi, 'Permanent STAEDTLER');
  result = result.replace(/(?:0ยก|า0ยก)\s*เข[สล]เทอ[กรก!\d]*/gi, 'Permanent STAEDTLER');

  // Standalone STAEDTLER (e.g. เขสเทอก, เขสเทอก!, เขสเทอ, เขลเทอก)
  result = result.replace(/เข[สล]เทอ[กรก!\d]*/gi, 'STAEDTLER');

  // Standalone Permanent (e.g. 6๓กลกอทเ, ๓กลกอทเ, อถอทอทก, 8๓ตาสกอก)
  result = result.replace(/6?๓กลกอท[เtT]?/gi, 'Permanent');
  result = result.replace(/(?:อถอทอทก!|อถอทอทก|8๓ตาสกอก!|8๓ตาสกอก)/gi, 'Permanent');

  // Units: 1.0mเ -> 1.0mm, 0.5mเ -> 0.5mm, 0.7mเ -> 0.7mm
  result = result.replace(/(\d+(?:\.\d+)?)\s*m[เ1Il|](?=\s|$|[^ก-๙a-zA-Z])/gi, '$1mm');

  // Color / Marker codes: W44M / W4M -> น้ำเงิน M, เขียว#โท -> เขียว
  result = result.replace(/W44M|W4M/g, 'น้ำเงิน M');
  result = result.replace(/เขียว#โท/g, 'เขียว');

  // 1.8 Script Boundary Normalization: ensure glued Thai & English tokens are cleanly separated
  result = result
    .replace(/([\u0e00-\u0e7f])([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])([\u0e00-\u0e7f])/g, '$1 $2');

  // Trailing Sara-E on Latin words is impossible in Thai orthography (misread 't' or 'l')
  result = result.replace(/([A-Za-z]{2,})[เ\u0e40](?=\s|$|[^ก-๙])/g, '$1t');

  // 2. High-Frequency Thai Procurement Lexicon Typos
  for (const [pattern, replacement] of THAI_OCR_FIXES) {
    result = result.replace(pattern, replacement);
  }

  // 3. English Word Tokenization & Fuzzy Dictionary Spell-Checking
  result = result.replace(/\b([A-Za-z0-9\-_]{2,})\b/g, (match) => {
    return correctEnglishWordWithFuzzyDictionary(match);
  });

  // 4. Spacing around common units & technical specifications (excluding gsm)
  result = result
    .replace(/([ก-๙a-zA-Z])(\d+(?:\.\d+)?(?:sq\.?mm|ตร\.?มม\.?|มม\.?|ซม\.?|เมตร|mm|cm|kg|ml|oz|v|w|l))\b/gi, '$1 $2')
    .replace(/\b(\d+(?:\.\d+)?(?:sq\.?mm|ตร\.?มม\.?|มม\.?|ซม\.?|เมตร|mm|cm|kg|ml|oz|v|w|l))([ก-๙a-zA-Z])/gi, '$1 $2');

  return result.replace(/\s{2,}/g, ' ').trim();
}
