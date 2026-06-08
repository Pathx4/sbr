// State Management
let state = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    invoices: [],
    department: 'สคร.',
    phone: '033 005 833  (ณัฐภัท)',
    memo_no: 'สคร.             /2567',
    date: 'พฤศจิกายน  2567',
    subject: 'รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง  จำนวน 0  รายการ',
    to_text: 'ผอ.สคร.  ผ่าน รก.หน.ฝถท.',
    intro_text: '\t\tด้วย สคร. ได้ดำเนินการจัดซื้อวัสดุสำหรับการจัด หลักสูตร “ด้านการประยุกต์เทคโนโลยี Internet of Thing” จำนวน 0 รายการ โดยมีวัตถุประสงค์ตาม  โครงการพัฒนากำลังคนเพื่อเตรียมทักษะด้านปัญญาประดิษฐ์ (AI) มุ่งสร้างฟันเฟืองสำหรับการขับเคลื่อนประเทศในอนาคต (กองทุน บพค.)  โดยใช้งบประมาณ (รหัสงบประมาณ 2568/51200/116/642203/68054/ 685120171_6805-68054 (หลักสูตร ด้านประยุกต์เทคโนโลยี Internet of Thing หัวข้อ การประยุกต์ใช้เทคโนโลยี Internet of Thing เพื่อออกแบบระบบตรวจจับ ติดตาม บริหารจัดการภัยพิบัติและปัญหาสิ่งแวดล้อมในภูมิภาค_โครงการพัฒนากำลังคนเพื่อเตรียมทักษะด้านปัญญาประดิษฐ์ (AI) มุ่งสร้างฟันเฟืองสำหรับการขับเคลื่อนประเทศในอนาคต (กองทุน บพค.)  ซึ่งมีรายละเอียดดังต่อไปนี้',
    regulatory_text: 'ทั้งนี้ การดำเนินการจัดซื้อ/จัดจ้างดังกล่าว เป็นการดำเนินการตามหนังสือคณะกรรมการวินิจฉัยปัญหาการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ กรมบัญชีกลาง ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119 ลงวันที่ 7 มีนาคม 2561 เรื่องแนวทางการปฎิบัติในการดำเนินการจัดหาพัสดุที่เกี่ยวกับค่าใช้จ่ายในการบริหารงาน ค่าใช้จ่ายในการฝึกอบรม การจัดงาน และการประชุมของหน่วยงานของรัฐ ตาราง 1 ลำดับที่  3',
    requester_name: 'นางสาวศิริพักตร์  เสมียนคิด',
    requester_position: 'เจ้าหน้าที่/ผู้รับผิดชอบ',
    requester_date: '   / พฤศจิกายน / 2567',
    approver_name: 'นางสาวปราณปริยา   วงค์ษา',
    approver_position: 'ผอ.สคร.',
    approver_date: '   / พฤศจิกายน / 2567'
};

// DOM Elements
const elements = {
    themeToggle: document.getElementById('btn-theme-toggle'),
    btnSettings: document.getElementById('btn-settings'),
    modalSettings: document.getElementById('modal-settings'),
    btnModalClose: document.getElementById('btn-modal-close'),
    inputApiKey: document.getElementById('input-api-key'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnTestKey: document.getElementById('btn-test-key'),
    keyStatusContainer: document.getElementById('key-status-container'),
    keyStatusDot: document.getElementById('key-status-dot'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    uploadList: document.getElementById('upload-list'),
    invoicesContainer: document.getElementById('invoices-container'),
    btnAddInvoice: document.getElementById('btn-add-invoice'),
    btnGenerate: document.getElementById('btn-generate'),
    toast: document.getElementById('toast'),
    
    // Form Inputs
    inputDept: document.getElementById('input-dept'),
    inputPhone: document.getElementById('input-phone'),
    inputMemoNo: document.getElementById('input-memo-no'),
    inputDate: document.getElementById('input-date'),
    inputSubject: document.getElementById('input-subject'),
    inputTo: document.getElementById('input-to'),
    inputReqName: document.getElementById('input-req-name'),
    inputReqPos: document.getElementById('input-req-pos'),
    inputReqDate: document.getElementById('input-req-date'),
    inputAppName: document.getElementById('input-app-name'),
    inputAppPos: document.getElementById('input-app-pos'),
    inputAppDate: document.getElementById('input-app-date'),
    textareaIntro: document.getElementById('textarea-intro'),
    textareaRegulatory: document.getElementById('textarea-regulatory'),
    
    // Totals Display
    txtSummaryQty: document.getElementById('txt-summary-qty'),
    txtSummaryTotal: document.getElementById('txt-summary-total'),
    txtSummaryThai: document.getElementById('txt-summary-thai')
};

// Initialize Theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// Theme Toggle Click Handler
elements.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// Show Toast Notification
function showToast(message, isError = false) {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${isError ? 'error' : ''}`;
    elements.toast.classList.remove('hidden');
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 4000);
}

function updateDropzoneState(isValid) {
    if (isValid) {
        elements.dropzone.classList.remove('disabled');
        elements.dropzone.querySelector('p').innerHTML = `ลากไฟล์ภาพบิลมาวางที่นี่ หรือ <span>คลิกเพื่อเลือกไฟล์</span>`;
    } else {
        elements.dropzone.classList.add('disabled');
        elements.dropzone.querySelector('p').innerHTML = `<span style="color: var(--danger); font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> กรุณาตั้งค่า API Key ที่ใช้งานได้เพื่อเปิดการอัปโหลด</span>`;
    }
}

// Modal management
elements.btnSettings.addEventListener('click', () => {
    elements.inputApiKey.value = state.apiKey;
    elements.keyStatusContainer.innerHTML = '';
    // Enable save only if they already have a key. If they edit it, they must re-verify.
    elements.btnSaveSettings.disabled = !state.apiKey;
    elements.modalSettings.classList.add('active');
});

elements.inputApiKey.addEventListener('input', () => {
    // Force re-verification if they change the key
    elements.btnSaveSettings.disabled = true;
    elements.keyStatusContainer.innerHTML = `<div style="color: var(--warning); font-size: 12px; font-weight: 500;"><i class="fa-solid fa-circle-info"></i> กรุณากดปุ่ม "ตรวจสอบคีย์" ก่อนบันทึกคีย์ใหม่</div>`;
});

elements.btnModalClose.addEventListener('click', closeModal);
elements.modalSettings.addEventListener('click', (e) => {
    if (e.target === elements.modalSettings) closeModal();
});

function closeModal() {
    elements.modalSettings.classList.remove('active');
}

elements.btnSaveSettings.addEventListener('click', () => {
    const key = elements.inputApiKey.value.trim();
    state.apiKey = key;
    localStorage.setItem('gemini_api_key', key);
    
    // Automatically trust saved key and enable UI
    updateDropzoneState(true);
    elements.keyStatusDot.className = 'status-dot dot-green';
    
    closeModal();
    showToast('บันทึก API Key สำเร็จ');
});

elements.btnTestKey.addEventListener('click', async () => {
    const key = elements.inputApiKey.value.trim();
    if (!key) {
        elements.keyStatusContainer.innerHTML = `<div style="color: var(--danger); font-weight: 600;"><i class="fa-solid fa-circle-xmark"></i> กรุณากรอก API Key</div>`;
        elements.btnSaveSettings.disabled = true;
        return;
    }
    
    const originalText = elements.btnTestKey.innerHTML;
    elements.btnTestKey.disabled = true;
    elements.btnTestKey.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจ...';
    elements.keyStatusContainer.innerHTML = `<div style="color: var(--warning); font-weight: 500;"><i class="fa-solid fa-circle-notch fa-spin"></i> กำลังตรวจสอบ API Key...</div>`;
    
    try {
        const response = await fetch('/api/validate_key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ api_key: key })
        });
        
        const data = await response.json();
        if (data.valid) {
            elements.keyStatusContainer.innerHTML = `
                <div style="color: var(--success); font-weight: 600; padding: 6px 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); font-size: 12px; line-height: 1.4;">
                    <i class="fa-solid fa-circle-check"></i> ${data.message}
                </div>
            `;
            elements.btnSaveSettings.disabled = false; // Enable save button!
            showToast('API Key สามารถใช้งานได้จริง!');
        } else {
            elements.keyStatusContainer.innerHTML = `
                <div style="color: var(--danger); padding: 8px 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); line-height: 1.4; font-size: 12px;">
                    <div style="font-weight: 600;"><i class="fa-solid fa-circle-xmark"></i> ${data.error}</div>
                    <div style="font-size: 11px; margin-top: 4px; color: var(--text-muted);">${data.tip}</div>
                </div>
            `;
            elements.btnSaveSettings.disabled = true; // Block save button!
            showToast('API Key ไม่สามารถใช้งานได้', true);
        }
    } catch (error) {
        elements.keyStatusContainer.innerHTML = `<div style="color: var(--danger); font-weight: 600; font-size: 12px;"><i class="fa-solid fa-circle-xmark"></i> เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</div>`;
        elements.btnSaveSettings.disabled = true;
        showToast('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', true);
    } finally {
        elements.btnTestKey.disabled = false;
        elements.btnTestKey.innerHTML = originalText;
    }
});

// Dropzone Drag/Drop
elements.dropzone.addEventListener('click', () => elements.fileInput.click());

elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
});

elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
});

elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

// Process files sequential
async function handleFiles(files) {
    if (!state.apiKey) {
        showToast('กรุณากรอก Gemini API Key ก่อนอัปโหลดไฟล์', true);
        elements.btnSettings.click();
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadAndProcessFile(file);
    }
}

async function uploadAndProcessFile(file) {
    // 1. Add item to upload list
    const fileId = 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const itemEl = document.createElement('div');
    itemEl.className = 'upload-item';
    itemEl.id = fileId;
    itemEl.innerHTML = `
        <span class="upload-item-name"><i class="fa-solid fa-image"></i> ${file.name}</span>
        <span class="upload-item-status status-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> กำลังถอดข้อมูล...</span>
    `;
    elements.uploadList.appendChild(itemEl);
    
    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', state.apiKey);
    
    try {
        const response = await fetch('/api/extract', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'ถอดข้อมูลบิลล้มเหลว');
        }
        
        const extractedData = await response.json();
        
        // Mark as Success in upload list
        itemEl.querySelector('.upload-item-status').className = 'upload-item-status status-success';
        itemEl.querySelector('.upload-item-status').innerHTML = '<i class="fa-solid fa-circle-check"></i> สำเร็จ';
        
        // Add invoice to State
        addInvoiceToState(extractedData);
        
        showToast(`ถอดข้อมูลจาก ${file.name} สำเร็จ!`);
        
    } catch (error) {
        console.error(error);
        itemEl.querySelector('.upload-item-status').className = 'upload-item-status status-error';
        itemEl.querySelector('.upload-item-status').innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ล้มเหลว`;
        showToast(`ผิดพลาด (${file.name}): ${error.message}`, true);
    }
}

// Add invoice to State and update DOM
function addInvoiceToState(data) {
    const invoice = {
        id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        vendor_name: data.vendor_name || 'ชื่อร้านค้า/บริษัท',
        invoice_number: data.invoice_number || 'เลขที่ใบกำกับภาษี',
        invoice_date: data.invoice_date || '28 ตุลาคม 2567',
        doc_type: 'ใบเสร็จรับเงิน/ใบกำกับภาษี',
        discount: data.discount || 0,
        items: (data.items || []).map(item => ({
            id: 'item-' + Math.random().toString(36).substr(2, 9),
            item_code: item.item_code || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || (item.quantity * item.unit_price) || 0
        }))
    };
    
    state.invoices.push(invoice);
    renderInvoices();
    calculateTotals();
}

// Render Invoices List
function renderInvoices() {
    const container = elements.invoicesContainer;
    const emptyState = document.getElementById('empty-state');
    
    // Clear list but keep empty state if no invoices
    const invoiceCards = container.querySelectorAll('.invoice-item-card');
    invoiceCards.forEach(c => c.remove());
    
    if (state.invoices.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    state.invoices.forEach((inv, invIdx) => {
        const card = document.createElement('div');
        card.className = 'invoice-item-card';
        card.dataset.id = inv.id;
        
        let itemsHtml = '';
        inv.items.forEach((item, itemIdx) => {
            itemsHtml += `
                <tr data-id="${item.id}">
                    <td style="width: 5%; text-align: center;">${itemIdx + 1}</td>
                    <td style="width: 15%;"><input type="text" class="cell-code" value="${item.item_code}" placeholder="รหัสสินค้า"></td>
                    <td style="width: 50%;"><input type="text" class="cell-desc" value="${item.description}" placeholder="รายละเอียดสินค้า"></td>
                    <td style="width: 10%;"><input type="number" class="cell-qty" value="${item.quantity}" style="width: 100%; text-align: center; border: 1px solid var(--divider);" min="1"></td>
                    <td style="width: 10%;"><input type="number" class="cell-price" value="${item.unit_price}" style="width: 100%; text-align: right; border: 1px solid var(--divider);" min="0"></td>
                    <td style="width: 10%; text-align: right; font-weight: 600;" class="cell-total">${item.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="width: 5%; text-align: center;">
                        <button class="btn-delete-item" style="color: var(--danger); background: transparent; font-size: 14px;" title="ลบรายการ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        card.innerHTML = `
            <div class="invoice-header-editor">
                <div class="form-group">
                    <label>บริษัท/ห้างร้าน</label>
                    <input type="text" class="inv-vendor" value="${inv.vendor_name}">
                </div>
                <div class="form-group">
                    <label>เลขที่เอกสาร</label>
                    <input type="text" class="inv-number" value="${inv.invoice_number}">
                </div>
                <div class="form-group">
                    <label>วันที่เอกสาร</label>
                    <input type="text" class="inv-date" value="${inv.invoice_date}">
                </div>
                <div class="form-group">
                    <label>ส่วนลด (บาท)</label>
                    <input type="number" class="inv-discount" value="${inv.discount}" min="0">
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <button class="btn-danger btn-sm btn-delete-invoice" title="ลบใบเสร็จนี้">
                        <i class="fa-solid fa-trash"></i> ลบกลุ่มบิล
                    </button>
                </div>
            </div>
            
            <div class="items-table-container">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="text-align: center;">#</th>
                            <th>รหัสสินค้า</th>
                            <th>รายการ</th>
                            <th style="text-align: center;">จำนวน</th>
                            <th style="text-align: right;">ราคา/หน่วย</th>
                            <th style="text-align: right;">จำนวนเงิน</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn-secondary btn-sm btn-add-item">
                    <i class="fa-solid fa-plus"></i> เพิ่มแถวสินค้า
                </button>
                <div style="text-align: right; font-size: 13px; color: var(--text-muted);">
                    ยอดรวมย่อย: <span class="inv-subtotal-val" style="font-weight: 600; color: var(--text-main); margin-right: 12px;">0.00</span>
                    ยอดรวมสุทธิ: <span class="inv-nettotal-val" style="font-weight: 700; color: var(--success);">0.00</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
        bindInvoiceEvents(card, invIdx);
    });
}

// Bind event listeners to dynamic elements in invoice cards
function bindInvoiceEvents(card, invIdx) {
    const invId = card.dataset.id;
    
    // Vendor Edit
    card.querySelector('.inv-vendor').addEventListener('input', (e) => {
        state.invoices[invIdx].vendor_name = e.target.value;
        calculateTotals();
    });
    
    // Invoice Number Edit
    card.querySelector('.inv-number').addEventListener('input', (e) => {
        state.invoices[invIdx].invoice_number = e.target.value;
    });
    
    // Invoice Date Edit
    card.querySelector('.inv-date').addEventListener('input', (e) => {
        state.invoices[invIdx].invoice_date = e.target.value;
    });
    
    // Discount Edit
    card.querySelector('.inv-discount').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.invoices[invIdx].discount = val;
        calculateTotals();
        updateCardTotals(card, state.invoices[invIdx]);
    });
    
    // Delete Invoice
    card.querySelector('.btn-delete-invoice').addEventListener('click', () => {
        state.invoices.splice(invIdx, 1);
        renderInvoices();
        calculateTotals();
    });
    
    // Add Item Row
    card.querySelector('.btn-add-item').addEventListener('click', () => {
        state.invoices[invIdx].items.push({
            id: 'item-' + Math.random().toString(36).substr(2, 9),
            item_code: '',
            description: '',
            quantity: 1,
            unit_price: 0,
            total_price: 0
        });
        renderInvoices();
        calculateTotals();
    });
    
    // Rows cells events
    const rows = card.querySelectorAll('tbody tr');
    rows.forEach((row, rowIdx) => {
        const itemId = row.dataset.id;
        const item = state.invoices[invIdx].items[rowIdx];
        
        // Code edit
        row.querySelector('.cell-code').addEventListener('input', (e) => {
            item.item_code = e.target.value;
        });
        
        // Description edit
        row.querySelector('.cell-desc').addEventListener('input', (e) => {
            item.description = e.target.value;
        });
        
        // Qty edit
        row.querySelector('.cell-qty').addEventListener('input', (e) => {
            item.quantity = parseInt(e.target.value) || 1;
            item.total_price = item.quantity * item.unit_price;
            row.querySelector('.cell-total').textContent = item.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            calculateTotals();
            updateCardTotals(card, state.invoices[invIdx]);
        });
        
        // Price edit
        row.querySelector('.cell-price').addEventListener('input', (e) => {
            item.unit_price = parseFloat(e.target.value) || 0;
            item.total_price = item.quantity * item.unit_price;
            row.querySelector('.cell-total').textContent = item.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            calculateTotals();
            updateCardTotals(card, state.invoices[invIdx]);
        });
        
        // Delete item
        row.querySelector('.btn-delete-item').addEventListener('click', () => {
            state.invoices[invIdx].items.splice(rowIdx, 1);
            renderInvoices();
            calculateTotals();
        });
    });
    
    // Initial card totals display
    updateCardTotals(card, state.invoices[invIdx]);
}

function updateCardTotals(card, invoice) {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.total_price, 0);
    const netTotal = Math.max(0, subtotal - invoice.discount);
    
    card.querySelector('.inv-subtotal-val').textContent = subtotal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    card.querySelector('.inv-nettotal-val').textContent = netTotal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Add Invoice manually
elements.btnAddInvoice.addEventListener('click', () => {
    addInvoiceToState({
        vendor_name: 'บริษัท/ร้านค้าใหม่',
        invoice_number: 'เลขที่บิล',
        invoice_date: 'วันที่',
        items: [],
        discount: 0,
        grand_total: 0
    });
});

// Calculate Totals and update texts
function calculateTotals() {
    let totalItems = 0;
    let grandSubtotal = 0;
    let grandDiscount = 0;
    
    state.invoices.forEach(inv => {
        inv.items.forEach(item => {
            totalItems += 1;
            grandSubtotal += item.total_price;
        });
        grandDiscount += inv.discount;
    });
    
    const grandNetTotal = Math.max(0, grandSubtotal - grandDiscount);
    
    // Update summary UI
    elements.txtSummaryQty.textContent = `${totalItems} รายการ`;
    elements.txtSummaryTotal.textContent = `${grandNetTotal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท`;
    
    const thaiText = bahtText(grandNetTotal);
    elements.txtSummaryThai.textContent = thaiText;
    
    // Auto sync total quantities into Subject field & Intro paragraph
    // Keep user edits unless numbers change
    state.subject = `รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง  จำนวน ${totalItems}  รายการ`;
    elements.inputSubject.value = state.subject;
    
    updateIntroParagraph(totalItems);
}

function updateIntroParagraph(totalItems) {
    // Generate text replacing only quantity and course/project if needed
    const dept = elements.inputDept.value;
    const course = "“ด้านการประยุกต์เทคโนโลยี Internet of Thing”";
    const project = "โครงการพัฒนากำลังคนเพื่อเตรียมทักษะด้านปัญญาประดิษฐ์ (AI) มุ่งสร้างฟันเฟืองสำหรับการขับเคลื่อนประเทศในอนาคต (กองทุน บพค.)";
    const budget = "2568/51200/116/642203/68054/ 685120171_6805-68054 (หลักสูตร ด้านประยุกต์เทคโนโลยี Internet of Thing หัวข้อ การประยุกต์ใช้เทคโนโลยี Internet of Thing เพื่อออกแบบระบบตรวจจับ ติดตาม บริหารจัดการภัยพิบัติและปัญหาสิ่งแวดล้อมในภูมิภาค_โครงการพัฒนากำลังคนเพื่อเตรียมทักษะด้านปัญญาประดิษฐ์ (AI) มุ่งสร้างฟันเฟืองสำหรับการขับเคลื่อนประเทศในอนาคต (กองทุน บพค.)";
    
    const text = `\t\tด้วย ${dept} ได้ดำเนินการจัดซื้อวัสดุสำหรับการจัด หลักสูตร ${course} จำนวน ${totalItems} รายการ โดยมีวัตถุประสงค์ตาม  ${project}  โดยใช้งบประมาณ (รหัสงบประมาณ ${budget} ซึ่งมีรายละเอียดดังต่อไปนี้`;
    
    elements.textareaIntro.value = text;
    state.intro_text = text;
}

// Initial default textarea setups
elements.textareaIntro.value = state.intro_text;
elements.textareaRegulatory.value = state.regulatory_text;

// Sync inputs to State
const syncInputs = () => {
    state.department = elements.inputDept.value;
    state.phone = elements.inputPhone.value;
    state.memo_no = elements.inputMemoNo.value;
    state.date = elements.inputDate.value;
    state.subject = elements.inputSubject.value;
    state.to_text = elements.inputTo.value;
    state.intro_text = elements.textareaIntro.value;
    state.regulatory_text = elements.textareaRegulatory.value;
    state.requester_name = elements.inputReqName.value;
    state.requester_position = elements.inputReqPos.value;
    state.requester_date = elements.inputReqDate.value;
    state.approver_name = elements.inputAppName.value;
    state.approver_position = elements.inputAppPos.value;
    state.approver_date = elements.inputAppDate.value;
};

// Monitor general inputs change
const formInputs = [
    elements.inputDept, elements.inputPhone, elements.inputMemoNo,
    elements.inputDate, elements.inputSubject, elements.inputTo,
    elements.inputReqName, elements.inputReqPos, elements.inputReqDate,
    elements.inputAppName, elements.inputAppPos, elements.inputAppDate,
    elements.textareaIntro, elements.textareaRegulatory
];
formInputs.forEach(input => {
    input.addEventListener('input', syncInputs);
});

// Auto recalculate if department changes (forces recalculation of intro paragraph)
elements.inputDept.addEventListener('input', () => {
    let totalItems = 0;
    state.invoices.forEach(inv => totalItems += inv.items.length);
    updateIntroParagraph(totalItems);
    syncInputs();
});

// Javascript BahtText phonetic representation
function bahtText(num) {
    if (num === 0) return "ศูนย์บาทถ้วน";
    const numbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    
    let str = "";
    // split into baht and satang
    let [baht, satang] = num.toFixed(2).split(".");
    
    // Helper function for 6-digit groups
    function helper(nStr) {
        let text = "";
        let len = nStr.length;
        for (let i = 0; i < len; i++) {
            let digit = parseInt(nStr[i]);
            let pos = len - i - 1;
            if (digit !== 0) {
                if (pos === 1 && digit === 1) {
                    text += "สิบ";
                } else if (pos === 1 && digit === 2) {
                    text += "ยี่สิบ";
                } else if (pos === 0 && digit === 1 && len > 1) {
                    text += "เอ็ด";
                } else {
                    text += numbers[digit] + positions[pos];
                }
            }
        }
        return text;
    }
    
    // process baht
    let bahtVal = parseInt(baht);
    if (bahtVal > 0) {
        let groups = [];
        while (baht.length > 0) {
            groups.push(baht.slice(-6));
            baht = baht.slice(0, -6);
        }
        for (let i = groups.length - 1; i >= 0; i--) {
            str += helper(groups[i]);
            if (i > 0) str += "ล้าน";
        }
        str += "บาท";
    }
    
    // process satang
    let satangVal = parseInt(satang);
    if (satangVal === 0) {
        str += "ถ้วน";
    } else {
        str += helper(satang) + "สตางค์";
    }
    return str;
}

// Generate Document Action
elements.btnGenerate.addEventListener('click', async () => {
    if (state.invoices.length === 0) {
        showToast('กรุณาอัปโหลดภาพบิลหรือเพิ่มบิลอย่างน้อย 1 ใบก่อนสร้างไฟล์', true);
        return;
    }
    
    // Sync all latest inputs to state
    syncInputs();
    
    // Update button text and set disabled loading state
    const originalBtnText = elements.btnGenerate.innerHTML;
    elements.btnGenerate.disabled = true;
    elements.btnGenerate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างไฟล์...';
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(state)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'สร้างเอกสารล้มเหลว');
        }
        
        // Capture binary download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง.docx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('สร้างและดาวน์โหลดไฟล์ Word สำเร็จ!');
        
    } catch (error) {
        console.error(error);
        showToast(`เกิดข้อผิดพลาด: ${error.message}`, true);
    } finally {
        elements.btnGenerate.disabled = false;
        elements.btnGenerate.innerHTML = originalBtnText;
    }
});

// Validate saved key on load
async function validateSavedKeyOnLoad() {
    if (!state.apiKey) {
        updateDropzoneState(false);
        elements.keyStatusDot.className = 'status-dot dot-gray';
        showToast('ไม่พบ API Key, กรุณาตั้งค่าเพื่อเปิดใช้งานการอัปโหลดรูปภาพบิล', true);
        elements.btnSettings.click();
        return;
    }
    
    // Temporarily show yellow status for check
    elements.keyStatusDot.className = 'status-dot';
    elements.keyStatusDot.style.backgroundColor = 'var(--warning)';
    
    try {
        const response = await fetch('/api/validate_key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ api_key: state.apiKey })
        });
        
        const data = await response.json();
        if (data.valid) {
            updateDropzoneState(true);
            elements.keyStatusDot.className = 'status-dot dot-green';
            elements.keyStatusDot.style.backgroundColor = '';
        } else {
            updateDropzoneState(false);
            elements.keyStatusDot.className = 'status-dot dot-red';
            elements.keyStatusDot.style.backgroundColor = '';
            showToast('API Key ที่บันทึกไว้ไม่พร้อมใช้งาน กรุณาตั้งค่าคีย์ใหม่', true);
            elements.btnSettings.click();
        }
    } catch (e) {
        // Network issue, assume valid but show gray dot
        updateDropzoneState(true);
        elements.keyStatusDot.className = 'status-dot dot-gray';
        elements.keyStatusDot.style.backgroundColor = '';
    }
}

// Check API key setup on load
window.addEventListener('load', () => {
    validateSavedKeyOnLoad();
    calculateTotals();
});
