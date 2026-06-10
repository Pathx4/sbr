// State Management
let state = {
    apiProvider: localStorage.getItem('api_provider') || 'gemini',
    geminiApiKey: localStorage.getItem('gemini_api_key') || '',
    openaiApiKey: localStorage.getItem('openai_api_key') || '',
    groqApiKey: localStorage.getItem('groq_api_key') || '',
    
    get apiKey() {
        if (this.apiProvider === 'openai') return this.openaiApiKey;
        if (this.apiProvider === 'groq') return this.groqApiKey;
        return this.geminiApiKey;
    },
    set apiKey(val) {
        if (this.apiProvider === 'openai') {
            this.openaiApiKey = val;
            localStorage.setItem('openai_api_key', val);
        } else if (this.apiProvider === 'groq') {
            this.groqApiKey = val;
            localStorage.setItem('groq_api_key', val);
        } else {
            this.geminiApiKey = val;
            localStorage.setItem('gemini_api_key', val);
        }
    },

    invoices: [],
    contacts: [],
    fileMap: new Map(),  // fileId -> File object for preview
    department: 'สคร.',
    phone: '',
    memo_no: '',
    date: '',
    subject: 'รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง  จำนวน 0  รายการ',
    to_text: 'ผอ.สคร.',
    intro_text: '',
    regulatory_text: 'ทั้งนี้ การดำเนินการจัดซื้อ/จัดจ้างดังกล่าว เป็นการดำเนินการตามหนังสือคณะกรรมการวินิจฉัยปัญหาการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ กรมบัญชีกลาง ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119 ลงวันที่ 7 มีนาคม 2561 เรื่องแนวทางการปฎิบัติในการดำเนินการจัดหาพัสดุที่เกี่ยวกับค่าใช้จ่ายในการบริหารงาน ค่าใช้จ่ายในการฝึกอบรม การจัดงาน และการประชุมของหน่วยงานของรัฐ ตาราง 1 ลำดับที่ 3',
    requester_name: '',
    requester_position: '',
    requester_date: '',
    approver_name: 'นางสาวปราณปริยา   วงค์ษา',
    approver_position: 'ผอ.สคร.',
    approver_date: '',
    
    // Excel loan details
    loan_contract_no: '',
    loan_date: '',
    loan_amount: '',
    loan_date_thai: ''
};

// Thai month names for date formatting
const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatDateToThai(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');  // yyyy-mm-dd
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]) + 543;
    const month = THAI_MONTHS[parseInt(parts[1]) - 1] || '';
    const day = parseInt(parts[2]);
    return `${day} ${month} ${year}`;
}

function formatDateForDoc(dateStr) {
    // For the Word document date field: "  วันเดือนปี  " format
    if (!dateStr) return '   /          / ';
    return ' ' + formatDateToThai(dateStr) + ' ';
}

// DOM Elements
const elements = {
    themeToggle: document.getElementById('btn-theme-toggle'),
    btnSettings: document.getElementById('btn-settings'),
    modalSettings: document.getElementById('modal-settings'),
    btnModalClose: document.getElementById('btn-modal-close'),
    btnGuide: document.getElementById('btn-guide'),
    modalGuide: document.getElementById('modal-guide'),
    btnGuideClose: document.getElementById('btn-guide-close'),
    selectProvider: document.getElementById('select-provider'),
    labelApiKey: document.getElementById('label-api-key'),
    helpApiKey: document.getElementById('help-api-key'),
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
    btnAiAnalyze: document.getElementById('btn-ai-analyze'),
    toast: document.getElementById('toast'),
    
    // Form Inputs
    inputDept: document.getElementById('input-dept'),
    inputPhone: document.getElementById('input-phone'),
    contactDropdown: document.getElementById('contact-dropdown'),
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
    
    // Intro Template Inputs
    inputIntroCourse: document.getElementById('input-intro-course'),
    inputIntroBudget: document.getElementById('input-intro-budget'),
    inputIntroBudgetCode: document.getElementById('input-intro-budgetcode'),
    inputIntroBudgetName: document.getElementById('input-intro-budgetname'),
    textareaRegulatory: document.getElementById('textarea-regulatory'),
    
    // Image Preview Side Panel
    btnPreviewClose: document.getElementById('btn-preview-close'),
    previewFilename: document.getElementById('preview-filename'),
    previewImage: document.getElementById('preview-image'),
    
    // Totals Display
    txtSummaryQty: document.getElementById('txt-summary-qty'),
    txtSummaryTotal: document.getElementById('txt-summary-total'),
    txtSummaryThai: document.getElementById('txt-summary-thai'),
    
    // Excel-specific bindings
    inputExcelLoanNo: document.getElementById('input-excel-loan-no'),
    inputExcelLoanDate: document.getElementById('input-excel-loan-date'),
    inputExcelLoanAmount: document.getElementById('input-excel-loan-amount'),
    btnGenerateExcel: document.getElementById('btn-generate-excel')
};

// ==========================================
// Theme Management
// ==========================================
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

elements.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// ==========================================
// Toast Notification
// ==========================================
function showToast(message, isError = false) {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${isError ? 'error' : ''}`;
    elements.toast.classList.remove('hidden');
    setTimeout(() => elements.toast.classList.add('hidden'), 4000);
}

// ==========================================
// Dropzone State
// ==========================================
function updateDropzoneState(isValid) {
    if (isValid) {
        elements.dropzone.classList.remove('disabled');
        elements.dropzone.querySelector('p').innerHTML = `ลากไฟล์ภาพบิลมาวางที่นี่ หรือ <span>คลิกเพื่อเลือกไฟล์</span>`;
    } else {
        elements.dropzone.classList.add('disabled');
        elements.dropzone.querySelector('p').innerHTML = `<span style="color: var(--danger); font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> กรุณาตั้งค่า API Key ที่ใช้งานได้เพื่อเปิดการอัปโหลด</span>`;
    }
}

// ==========================================
// API Key / Provider Management
// ==========================================
function updateApiKeyUIDisplay() {
    const provider = elements.selectProvider.value;
    if (provider === 'openai') {
        elements.labelApiKey.textContent = 'OpenAI API Key';
        elements.inputApiKey.placeholder = 'ป้อน sk-...';
        elements.inputApiKey.value = state.openaiApiKey;
        elements.helpApiKey.innerHTML = 'รับ API Key ของคุณได้ที่ <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform <i class="fa-solid fa-external-link"></i></a>';
    } else if (provider === 'groq') {
        elements.labelApiKey.textContent = 'Groq API Key';
        elements.inputApiKey.placeholder = 'ป้อน gsk_...';
        elements.inputApiKey.value = state.groqApiKey;
        elements.helpApiKey.innerHTML = 'รับ API Key ของคุณได้ฟรีที่ <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq Console <i class="fa-solid fa-external-link"></i></a>';
    } else {
        elements.labelApiKey.textContent = 'Gemini API Key';
        elements.inputApiKey.placeholder = 'ป้อน AIzaSy...';
        elements.inputApiKey.value = state.geminiApiKey;
        elements.helpApiKey.innerHTML = 'รับ API Key ของคุณได้ฟรีที่ <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer">Google AI Studio <i class="fa-solid fa-external-link"></i></a>';
    }
}

elements.btnSettings.addEventListener('click', () => {
    elements.selectProvider.value = state.apiProvider;
    updateApiKeyUIDisplay();
    elements.keyStatusContainer.innerHTML = '';
    elements.btnSaveSettings.disabled = !state.apiKey;
    elements.modalSettings.classList.add('active');
});

elements.selectProvider.addEventListener('change', () => {
    state.apiProvider = elements.selectProvider.value;
    updateApiKeyUIDisplay();
    elements.keyStatusContainer.innerHTML = `<div style="color: var(--warning); font-size: 12px; font-weight: 500;"><i class="fa-solid fa-circle-info"></i> กรุณากดปุ่ม "ตรวจสอบคีย์" ก่อนบันทึกคีย์ใหม่</div>`;
    elements.btnSaveSettings.disabled = true;
});

elements.inputApiKey.addEventListener('input', () => {
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

elements.btnGuide.addEventListener('click', () => elements.modalGuide.classList.add('active'));
elements.btnGuideClose.addEventListener('click', () => elements.modalGuide.classList.remove('active'));
elements.modalGuide.addEventListener('click', (e) => {
    if (e.target === elements.modalGuide) elements.modalGuide.classList.remove('active');
});

elements.btnSaveSettings.addEventListener('click', () => {
    const key = elements.inputApiKey.value.trim();
    const provider = elements.selectProvider.value;
    state.apiProvider = provider;
    localStorage.setItem('api_provider', provider);
    state.apiKey = key;
    updateDropzoneState(true);
    elements.keyStatusDot.className = 'status-dot dot-green';
    closeModal();
    showToast('บันทึก API Key สำเร็จ');
});

elements.btnTestKey.addEventListener('click', async () => {
    const key = elements.inputApiKey.value.trim();
    const provider = elements.selectProvider.value;
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key, provider })
        });
        const data = await response.json();
        if (data.valid) {
            elements.keyStatusContainer.innerHTML = `
                <div style="color: var(--success); font-weight: 600; padding: 6px 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); font-size: 12px; line-height: 1.4;">
                    <i class="fa-solid fa-circle-check"></i> ${data.message}
                </div>`;
            elements.btnSaveSettings.disabled = false;
            showToast('API Key สามารถใช้งานได้จริง!');
        } else {
            elements.keyStatusContainer.innerHTML = `
                <div style="color: var(--danger); padding: 8px 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); line-height: 1.4; font-size: 12px;">
                    <div style="font-weight: 600;"><i class="fa-solid fa-circle-xmark"></i> ${data.error}</div>
                    <div style="font-size: 11px; margin-top: 4px; color: var(--text-muted);">${data.tip}</div>
                </div>`;
            elements.btnSaveSettings.disabled = true;
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

// ==========================================
// Contact Autocomplete
// ==========================================
let contactDropdownActiveIdx = -1;

async function fetchContacts() {
    try {
        const response = await fetch('/api/contacts');
        if (response.ok) {
            state.contacts = await response.json();
            console.log(`[Contacts] Loaded ${state.contacts.length} contacts`);
        }
    } catch (e) {
        console.warn('[Contacts] Failed to fetch contacts:', e);
    }
}

function renderContactDropdown(query) {
    const dropdown = elements.contactDropdown;
    if (!query || query.length < 1) {
        dropdown.style.display = 'none';
        return;
    }
    
    const q = query.toLowerCase();
    const results = state.contacts.filter(c => {
        return c.name.toLowerCase().includes(q) ||
               (c.nickname && c.nickname.toLowerCase().includes(q)) ||
               (c.position && c.position.toLowerCase().includes(q));
    }).slice(0, 15);
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="contact-no-result"><i class="fa-solid fa-search"></i> ไม่พบบุคลากรที่ตรงกับ "' + query + '"</div>';
        dropdown.style.display = 'block';
        return;
    }
    
    dropdown.innerHTML = results.map((c, i) => `
        <div class="contact-item ${i === contactDropdownActiveIdx ? 'active' : ''}" data-idx="${i}">
            <div class="contact-item-name">${c.name}</div>
            <div class="contact-item-info">
                <span><i class="fa-solid fa-briefcase"></i> ${c.position || '-'}</span>
                <span><i class="fa-solid fa-phone"></i> ${c.mobile || c.desk || '-'}</span>
                <span><i class="fa-solid fa-building"></i> ${c.sheet || ''}</span>
            </div>
        </div>
    `).join('');
    
    dropdown.style.display = 'block';
    
    // Bind click events
    dropdown.querySelectorAll('.contact-item').forEach((item, i) => {
        item.addEventListener('click', () => selectContact(results[i]));
    });
}

function extractFirstName(fullName) {
    if (!fullName) return '';
    // Remove nickname in parentheses at the end
    let cleanName = fullName.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (cleanName === '- ว่าง -') return '';
    
    // Regex for common Thai prefixes, including space variants
    const prefixRegex = /^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|ดร|ศาสตราจารย์|ผศ\.ดร\.|รศ\.ดร\.|ผศ\.|รศ\.|ศ\.|ว่าที่\s*ร\.ต\.\s*หญิง|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรีหญิง|ว่าที่ร้อยตรี)\s*/i;
    let nameWithoutPrefix = cleanName.replace(prefixRegex, '').trim();
    
    // Split by whitespace and get the first part (first name)
    let parts = nameWithoutPrefix.split(/\s+/);
    return parts[0] || '';
}

function selectContact(contact) {
    // Build phone display: "เบอร์  (ชื่อจริง)" or just "เบอร์"
    const phoneNum = contact.mobile || contact.desk || '';
    const firstName = extractFirstName(contact.name);
    const phoneDisplay = firstName ? `${phoneNum}  (${firstName})` : phoneNum;
    
    elements.inputPhone.value = phoneDisplay;
    
    // Clean name: remove nickname in parentheses for formal name
    let formalName = contact.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    elements.inputReqName.value = formalName;
    elements.inputReqPos.value = contact.position || '';
    
    // Auto-fill "เรียน" field: fixed "ผอ.สคร." + auto "ผ่าน" if has section head
    let toText = 'ผอ.สคร.';
    if (contact.section_head && contact.section_head !== contact.name) {
        // Clean section head name
        let headName = contact.section_head.replace(/\s*\([^)]*\)\s*$/, '').trim();
        toText += `  ผ่าน ${headName}`;
    }
    elements.inputTo.value = toText;
    
    // Close dropdown
    elements.contactDropdown.style.display = 'none';
    contactDropdownActiveIdx = -1;
    
    syncInputs();
    showToast(`เลือก: ${contact.name}`);
}

elements.inputPhone.addEventListener('input', (e) => {
    contactDropdownActiveIdx = -1;
    renderContactDropdown(e.target.value.trim());
});

elements.inputPhone.addEventListener('focus', (e) => {
    if (e.target.value.trim().length >= 1) {
        renderContactDropdown(e.target.value.trim());
    }
});

// Keyboard navigation for dropdown
elements.inputPhone.addEventListener('keydown', (e) => {
    const dropdown = elements.contactDropdown;
    if (dropdown.style.display === 'none') return;
    
    const items = dropdown.querySelectorAll('.contact-item');
    if (items.length === 0) return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        contactDropdownActiveIdx = Math.min(contactDropdownActiveIdx + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('active', i === contactDropdownActiveIdx));
        items[contactDropdownActiveIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        contactDropdownActiveIdx = Math.max(contactDropdownActiveIdx - 1, 0);
        items.forEach((it, i) => it.classList.toggle('active', i === contactDropdownActiveIdx));
        items[contactDropdownActiveIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (contactDropdownActiveIdx >= 0 && contactDropdownActiveIdx < items.length) {
            items[contactDropdownActiveIdx].click();
        }
    } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#input-phone') && !e.target.closest('#contact-dropdown')) {
        elements.contactDropdown.style.display = 'none';
    }
});

// ==========================================
// Image Preview Side Panel
// ==========================================
let previewZoomLevel = 100;
const ZOOM_STEP = 25;
const ZOOM_MIN = 50;
const ZOOM_MAX = 300;

function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImage.src = e.target.result;
        elements.previewFilename.textContent = file.name;
        previewZoomLevel = 100;
        updatePreviewZoom();
        document.getElementById('image-preview-panel').classList.add('open');
    };
    reader.readAsDataURL(file);
}

function closePreviewPanel() {
    document.getElementById('image-preview-panel').classList.remove('open');
    elements.previewImage.src = '';
}

function updatePreviewZoom() {
    document.getElementById('preview-zoom-level').textContent = previewZoomLevel + '%';
    const scale = previewZoomLevel / 100;
    elements.previewImage.style.transform = `scale(${scale})`;
    // When zoomed beyond 100%, allow image to expand beyond container
    if (scale > 1) {
        elements.previewImage.style.maxWidth = 'none';
        elements.previewImage.style.width = '100%';
    } else {
        elements.previewImage.style.maxWidth = '100%';
        elements.previewImage.style.width = '';
    }
}

elements.btnPreviewClose.addEventListener('click', closePreviewPanel);

document.getElementById('btn-preview-zoom-in').addEventListener('click', () => {
    previewZoomLevel = Math.min(previewZoomLevel + ZOOM_STEP, ZOOM_MAX);
    updatePreviewZoom();
});

document.getElementById('btn-preview-zoom-out').addEventListener('click', () => {
    previewZoomLevel = Math.max(previewZoomLevel - ZOOM_STEP, ZOOM_MIN);
    updatePreviewZoom();
});

document.getElementById('btn-preview-fit').addEventListener('click', () => {
    previewZoomLevel = 100;
    updatePreviewZoom();
    document.getElementById('preview-panel-body').scrollTo({ top: 0, behavior: 'smooth' });
});

// Keyboard shortcut: Escape to close panel
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('image-preview-panel').classList.contains('open')) {
        closePreviewPanel();
    }
});

// ==========================================
// Dropzone & File Upload
// ==========================================
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
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
});

elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFiles(e.target.files);
});

async function handleFiles(files) {
    if (!state.apiKey) {
        showToast('กรุณากรอก API Key ก่อนอัปโหลดไฟล์', true);
        elements.btnSettings.click();
        return;
    }
    for (let i = 0; i < files.length; i++) {
        await uploadAndProcessFile(files[i]);
    }
}

async function uploadAndProcessFile(file) {
    const fileId = 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Store file reference for preview
    state.fileMap.set(fileId, file);
    
    const itemEl = document.createElement('div');
    itemEl.className = 'upload-item';
    itemEl.id = fileId;
    itemEl.innerHTML = `
        <span class="upload-item-name"><i class="fa-solid fa-image"></i> ${file.name}</span>
        <div class="upload-item-actions">
            <button class="btn-preview-img" data-file-id="${fileId}" title="ดูภาพ"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-delete-upload" data-file-id="${fileId}" title="ลบรูปภาพและกลุ่มบิล" style="color: var(--danger); background: transparent;"><i class="fa-solid fa-trash"></i></button>
            <span class="upload-item-status status-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> กำลังถอดข้อมูล...</span>
        </div>
    `;
    elements.uploadList.appendChild(itemEl);
    
    // Bind preview button
    itemEl.querySelector('.btn-preview-img').addEventListener('click', (e) => {
        e.stopPropagation();
        const fId = e.currentTarget.dataset.fileId;
        const f = state.fileMap.get(fId);
        if (f) showImagePreview(f);
    });
    
    // Bind delete button
    itemEl.querySelector('.btn-delete-upload').addEventListener('click', (e) => {
        e.stopPropagation();
        const fId = e.currentTarget.dataset.fileId;
        deleteUpload(fId);
    });
    
    // Auto-open preview panel when uploading
    showImagePreview(file);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', state.apiKey);
    formData.append('provider', state.apiProvider);
    
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
        
        itemEl.querySelector('.upload-item-status').className = 'upload-item-status status-success';
        itemEl.querySelector('.upload-item-status').innerHTML = '<i class="fa-solid fa-circle-check"></i> สำเร็จ';
        
        addInvoiceToState(extractedData, fileId);
        showToast(`ถอดข้อมูลจาก ${file.name} สำเร็จ!`);
        
    } catch (error) {
        console.error(error);
        itemEl.querySelector('.upload-item-status').className = 'upload-item-status status-error';
        itemEl.querySelector('.upload-item-status').innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ล้มเหลว`;
        showToast(`ผิดพลาด (${file.name}): ${error.message}`, true);
    }
}

// ==========================================
// Invoice Management
// ==========================================
function mergeDuplicateItems(items) {
    const merged = [];
    items.forEach(item => {
        const code = (item.item_code || '').trim();
        const desc = (item.description || '').trim();
        const qty = parseInt(item.quantity) || 1;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const totalPrice = parseFloat(item.total_price) || (qty * unitPrice);
        
        const existing = merged.find(m => 
            m.item_code.toLowerCase() === code.toLowerCase() && 
            m.description.toLowerCase() === desc.toLowerCase()
        );
        
        if (existing) {
            existing.quantity += qty;
            existing.total_price += totalPrice;
        } else {
            merged.push({
                item_code: code,
                description: desc,
                quantity: qty,
                unit: item.unit || 'ชิ้น',
                unit_price: unitPrice,
                total_price: totalPrice
            });
        }
    });
    return merged;
}

function addInvoiceToState(data, fileId = null) {
    const mergedItems = mergeDuplicateItems(data.items || []);
    const invoice = {
        id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        fileId: fileId,
        vendor_name: data.vendor_name || 'ชื่อร้านค้า/บริษัท',
        invoice_number: data.invoice_number || 'เลขที่ใบกำกับภาษี',
        invoice_date: data.invoice_date || '28 ตุลาคม 2567',
        doc_type: data.doc_type || 'ใบเสร็จรับเงิน/ใบกำกับภาษี',
        discount: data.discount || 0,
        items: mergedItems.map(item => ({
            id: 'item-' + Math.random().toString(36).substr(2, 9),
            item_code: item.item_code || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'ชิ้น',
            unit_price: item.unit_price || 0,
            total_price: item.total_price || (item.quantity * item.unit_price) || 0
        }))
    };
    state.invoices.push(invoice);
    renderInvoices();
    calculateTotals();
}

function renderInvoices() {
    const container = elements.invoicesContainer;
    const emptyState = document.getElementById('empty-state');
    
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
                    <td style="width: 40%;"><input type="text" class="cell-desc" value="${item.description}" placeholder="รายละเอียดสินค้า"></td>
                    <td style="width: 8%;"><input type="number" class="cell-qty" value="${item.quantity}" style="width: 100%; text-align: center; border: 1px solid var(--divider);" min="1"></td>
                    <td style="width: 10%;"><input type="text" class="cell-unit" value="${item.unit || 'ชิ้น'}" style="width: 100%; text-align: center; border: 1px solid var(--divider);" placeholder="หน่วย"></td>
                    <td style="width: 12%;"><input type="number" class="cell-price" value="${item.unit_price}" style="width: 100%; text-align: right; border: 1px solid var(--divider);" min="0"></td>
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
                    <label>ประเภทเอกสาร</label>
                    <input type="text" class="inv-doc-type" value="${inv.doc_type || 'ใบเสร็จรับเงิน/ใบกำกับภาษี'}" placeholder="ประเภทเอกสาร เช่น ใบเสร็จรับเงิน">
                </div>
                <div class="form-group">
                    <label>วันที่เอกสาร</label>
                    <input type="text" class="inv-date" value="${inv.invoice_date}">
                </div>
                <div class="form-group">
                    <label>ส่วนลด (บาท)</label>
                    <input type="number" class="inv-discount" value="${inv.discount}" min="0">
                </div>
                <div class="form-group" style="justify-content: flex-end; flex-direction: row; gap: 8px; align-items: flex-end;">
                    ${inv.fileId ? `
                    <button class="btn-primary btn-sm btn-rescan-invoice" data-file-id="${inv.fileId}" data-invoice-id="${inv.id}" title="สแกนใหม่อีกครั้ง" style="background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);">
                        <i class="fa-solid fa-rotate"></i> สแกนใหม่
                    </button>
                    ` : ''}
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
                            <th style="text-align: center;">หน่วย</th>
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

function bindInvoiceEvents(card, invIdx) {
    card.querySelector('.inv-vendor').addEventListener('input', (e) => {
        state.invoices[invIdx].vendor_name = e.target.value;
        calculateTotals();
    });
    
    card.querySelector('.inv-number').addEventListener('input', (e) => {
        state.invoices[invIdx].invoice_number = e.target.value;
    });

    card.querySelector('.inv-doc-type').addEventListener('input', (e) => {
        state.invoices[invIdx].doc_type = e.target.value;
    });
    
    card.querySelector('.inv-date').addEventListener('input', (e) => {
        state.invoices[invIdx].invoice_date = e.target.value;
    });
    
    card.querySelector('.inv-discount').addEventListener('input', (e) => {
        state.invoices[invIdx].discount = parseFloat(e.target.value) || 0;
        calculateTotals();
        updateCardTotals(card, state.invoices[invIdx]);
    });
    
    card.querySelector('.btn-delete-invoice').addEventListener('click', () => {
        const fileId = state.invoices[invIdx].fileId;
        if (fileId) {
            deleteUpload(fileId);
        } else {
            state.invoices.splice(invIdx, 1);
            renderInvoices();
            calculateTotals();
        }
    });

    const rescanBtn = card.querySelector('.btn-rescan-invoice');
    if (rescanBtn) {
        rescanBtn.addEventListener('click', (e) => {
            const fId = e.currentTarget.dataset.fileId;
            const invId = e.currentTarget.dataset.invoiceId;
            reprocessInvoice(fId, invId);
        });
    }
    
    card.querySelector('.btn-add-item').addEventListener('click', () => {
        state.invoices[invIdx].items.push({
            id: 'item-' + Math.random().toString(36).substr(2, 9),
            item_code: '', description: '', quantity: 1, unit: 'ชิ้น', unit_price: 0, total_price: 0
        });
        renderInvoices();
        calculateTotals();
    });
    
    const rows = card.querySelectorAll('tbody tr');
    rows.forEach((row, rowIdx) => {
        const item = state.invoices[invIdx].items[rowIdx];
        
        row.querySelector('.cell-code').addEventListener('input', (e) => { item.item_code = e.target.value; });
        row.querySelector('.cell-desc').addEventListener('input', (e) => { item.description = e.target.value; });
        row.querySelector('.cell-unit').addEventListener('input', (e) => { item.unit = e.target.value; });
        
        row.querySelector('.cell-qty').addEventListener('input', (e) => {
            item.quantity = parseInt(e.target.value) || 1;
            item.total_price = item.quantity * item.unit_price;
            row.querySelector('.cell-total').textContent = item.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            calculateTotals();
            updateCardTotals(card, state.invoices[invIdx]);
        });
        
        row.querySelector('.cell-price').addEventListener('input', (e) => {
            item.unit_price = parseFloat(e.target.value) || 0;
            item.total_price = item.quantity * item.unit_price;
            row.querySelector('.cell-total').textContent = item.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            calculateTotals();
            updateCardTotals(card, state.invoices[invIdx]);
        });
        
        row.querySelector('.btn-delete-item').addEventListener('click', () => {
            state.invoices[invIdx].items.splice(rowIdx, 1);
            renderInvoices();
            calculateTotals();
        });
    });
    
    updateCardTotals(card, state.invoices[invIdx]);
}

function deleteUpload(fileId) {
    // 1. Remove left-side list item
    const el = document.getElementById(fileId);
    if (el) el.remove();
    
    // 2. Remove from state.fileMap
    const file = state.fileMap.get(fileId);
    state.fileMap.delete(fileId);
    
    // 3. Find associated invoice card and delete it
    const invIndex = state.invoices.findIndex(inv => inv.fileId === fileId);
    if (invIndex !== -1) {
        state.invoices.splice(invIndex, 1);
    }
    
    // 4. Close preview panel if this file was previewed
    if (file && elements.previewFilename.textContent === file.name) {
        closePreviewPanel();
    }
    
    // 5. Render invoices and recalculate totals
    renderInvoices();
    calculateTotals();
    showToast('ลบไฟล์อัปโหลดและกลุ่มบิลที่เกี่ยวข้องแล้ว');
}

async function reprocessInvoice(fileId, invoiceId) {
    const file = state.fileMap.get(fileId);
    if (!file) {
        showToast('ไม่พบไฟล์ต้นฉบับสำหรับสแกนใหม่', true);
        return;
    }
    
    const invoiceIdx = state.invoices.findIndex(inv => inv.id === invoiceId);
    if (invoiceIdx === -1) return;
    
    // Show loading indicator on the upload-item status
    const uploadItemEl = document.getElementById(fileId);
    let statusEl = null;
    if (uploadItemEl) {
        statusEl = uploadItemEl.querySelector('.upload-item-status');
        if (statusEl) {
            statusEl.className = 'upload-item-status status-loading';
            statusEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังสแกนใหม่...';
        }
    }
    
    // Disable the rescan button during reprocessing
    const cardEl = document.querySelector(`.invoice-item-card[data-id="${invoiceId}"]`);
    const rescanBtn = cardEl ? cardEl.querySelector('.btn-rescan-invoice') : null;
    if (rescanBtn) {
        rescanBtn.disabled = true;
        rescanBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสแกน...';
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', state.apiKey);
    formData.append('provider', state.apiProvider);
    
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
        
        if (statusEl) {
            statusEl.className = 'upload-item-status status-success';
            statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> สแกนใหม่สำเร็จ';
        }
        
        // Overwrite the existing invoice in state
        const originalInvoice = state.invoices[invoiceIdx];
        
        const mergedExtractedItems = mergeDuplicateItems(extractedData.items || []);
        
        state.invoices[invoiceIdx] = {
            id: originalInvoice.id,
            fileId: originalInvoice.fileId,
            vendor_name: extractedData.vendor_name || 'ชื่อร้านค้า/บริษัท',
            invoice_number: extractedData.invoice_number || 'เลขที่ใบกำกับภาษี',
            invoice_date: extractedData.invoice_date || '28 ตุลาคม 2567',
            doc_type: extractedData.doc_type || 'ใบเสร็จรับเงิน/ใบกำกับภาษี',
            discount: extractedData.discount || 0,
            items: mergedExtractedItems.map(item => ({
                id: 'item-' + Math.random().toString(36).substr(2, 9),
                item_code: item.item_code || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                unit: item.unit || 'ชิ้น',
                unit_price: item.unit_price || 0,
                total_price: item.total_price || (item.quantity * item.unit_price) || 0
            }))
        };
        
        renderInvoices();
        calculateTotals();
        showToast(`สแกนไฟล์ ${file.name} ใหม่อีกครั้งสำเร็จ!`);
        
    } catch (error) {
        console.error(error);
        if (statusEl) {
            statusEl.className = 'upload-item-status status-error';
            statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> สแกนใหม่ล้มเหลว`;
        }
        if (rescanBtn) {
            rescanBtn.disabled = false;
            rescanBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> สแกนใหม่';
        }
        showToast(`ผิดพลาดในการสแกนใหม่ (${file.name}): ${error.message}`, true);
    }
}

function updateCardTotals(card, invoice) {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.total_price, 0);
    const netTotal = Math.max(0, subtotal - invoice.discount);
    card.querySelector('.inv-subtotal-val').textContent = subtotal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    card.querySelector('.inv-nettotal-val').textContent = netTotal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

elements.btnAddInvoice.addEventListener('click', () => {
    addInvoiceToState({
        vendor_name: 'บริษัท/ร้านค้าใหม่',
        invoice_number: 'เลขที่บิล',
        invoice_date: 'วันที่',
        items: [], discount: 0, grand_total: 0
    });
});

// ==========================================
// Intro Text Builder (Template)
// ==========================================
function buildIntroText(totalItems) {
    const dept = elements.inputDept.value || 'สคร.';
    const course = elements.inputIntroCourse.value.trim();
    const budget = elements.inputIntroBudget.value.trim();
    const budgetCode = elements.inputIntroBudgetCode.value.trim();
    const budgetName = elements.inputIntroBudgetName.value.trim();
    
    // Build the full intro text following the fixed template
    let text = `\t\tด้วย ${dept} ได้ดำเนินการจัดซื้อวัสดุสำหรับการจัด หลักสูตร ${course || '........'}`;
    text += ` โดยใช้งบประมาณ ${budget || '..........'}`;
    
    let budgetPart = budgetCode || 'xxxx/xxxxx/xxx/xxxxxx/xxxxx/ xxxxxxxxxxx';
    if (budgetName) {
        budgetPart += ` (${budgetName})`;
    }
    
    text += ` รหัสงบประมาณ ${budgetPart}`;
    text += ` ซึ่งมีรายละเอียดดังต่อไปนี้`;
    
    return text;
}

// Listen for intro field changes
[elements.inputIntroCourse, elements.inputIntroBudget, elements.inputIntroBudgetCode, elements.inputIntroBudgetName].forEach(input => {
    input.addEventListener('input', () => {
        let totalItems = 0;
        state.invoices.forEach(inv => totalItems += inv.items.length);
        state.intro_text = buildIntroText(totalItems);
    });
});

// ==========================================
// Totals Calculation
// ==========================================
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
    
    elements.txtSummaryQty.textContent = `${totalItems} รายการ`;
    elements.txtSummaryTotal.textContent = `${grandNetTotal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท`;
    elements.txtSummaryThai.textContent = bahtText(grandNetTotal);
    
    state.subject = `รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง  จำนวน ${totalItems}  รายการ`;
    elements.inputSubject.value = state.subject;
    
    state.intro_text = buildIntroText(totalItems);

    if (state.invoices.length > 0 && totalItems > 0) {
        elements.btnAiAnalyze.style.display = 'inline-flex';
    } else {
        elements.btnAiAnalyze.style.display = 'none';
    }
}

// ==========================================
// Sync Inputs to State
// ==========================================
const syncInputs = () => {
    state.department = elements.inputDept.value;
    state.phone = elements.inputPhone.value;
    state.memo_no = elements.inputMemoNo.value;
    state.date = formatDateForDoc(elements.inputDate.value);
    state.subject = elements.inputSubject.value;
    state.to_text = elements.inputTo.value;
    state.intro_text = buildIntroText(0); // Will be rebuilt with correct count in generate
    state.regulatory_text = elements.textareaRegulatory.value;
    state.requester_name = elements.inputReqName.value;
    state.requester_position = elements.inputReqPos.value;
    state.requester_date = formatDateForDoc(elements.inputReqDate.value);
    state.approver_name = elements.inputAppName.value;
    state.approver_position = elements.inputAppPos.value;
    state.approver_date = formatDateForDoc(elements.inputAppDate.value);
    
    // Sync Excel loan inputs
    state.loan_contract_no = elements.inputExcelLoanNo.value.trim();
    state.loan_date = elements.inputExcelLoanDate.value;
    state.loan_amount = parseFloat(elements.inputExcelLoanAmount.value) || 0;
    state.loan_date_thai = formatDateToThai(state.loan_date);
};

const formInputs = [
    elements.inputDept, elements.inputPhone, elements.inputMemoNo,
    elements.inputDate, elements.inputSubject, elements.inputTo,
    elements.inputReqName, elements.inputReqPos, elements.inputReqDate,
    elements.inputAppName, elements.inputAppPos, elements.inputAppDate,
    elements.inputIntroCourse, elements.inputIntroBudget, elements.inputIntroBudgetCode,
    elements.inputIntroBudgetName, elements.textareaRegulatory,
    elements.inputExcelLoanNo, elements.inputExcelLoanDate, elements.inputExcelLoanAmount
];
formInputs.forEach(input => input.addEventListener('input', syncInputs));

// ==========================================
// BahtText (Thai phonetic number)
// ==========================================
function bahtText(num) {
    if (num === 0) return "ศูนย์บาทถ้วน";
    const numbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    
    let str = "";
    let [baht, satang] = num.toFixed(2).split(".");
    
    function helper(nStr) {
        let text = "";
        let len = nStr.length;
        for (let i = 0; i < len; i++) {
            let digit = parseInt(nStr[i]);
            let pos = len - i - 1;
            if (digit !== 0) {
                if (pos === 1 && digit === 1) text += "สิบ";
                else if (pos === 1 && digit === 2) text += "ยี่สิบ";
                else if (pos === 0 && digit === 1 && len > 1) text += "เอ็ด";
                else text += numbers[digit] + positions[pos];
            }
        }
        return text;
    }
    
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
    
    let satangVal = parseInt(satang);
    if (satangVal === 0) {
        str += "ถ้วน";
    } else {
        str += helper(satang) + "สตางค์";
    }
    return str;
}

// ==========================================
// Generate Word Document
// ==========================================
elements.btnGenerate.addEventListener('click', async () => {
    if (state.invoices.length === 0) {
        showToast('กรุณาอัปโหลดภาพบิลหรือเพิ่มบิลอย่างน้อย 1 ใบก่อนสร้างไฟล์', true);
        return;
    }
    
    syncInputs();
    
    // Rebuild intro with correct total items count
    let totalItems = 0;
    state.invoices.forEach(inv => totalItems += inv.items.length);
    state.intro_text = buildIntroText(totalItems);
    state.date = formatDateForDoc(elements.inputDate.value);
    state.requester_date = formatDateForDoc(elements.inputReqDate.value);
    state.approver_date = formatDateForDoc(elements.inputAppDate.value);
    
    const originalBtnText = elements.btnGenerate.innerHTML;
    elements.btnGenerate.disabled = true;
    elements.btnGenerate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างไฟล์...';
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'สร้างเอกสารล้มเหลว');
        }
        
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

// ==========================================
// Generate Excel Document
// ==========================================
elements.btnGenerateExcel.addEventListener('click', async () => {
    if (state.invoices.length === 0) {
        showToast('กรุณาอัปโหลดภาพบิลหรือเพิ่มบิลอย่างน้อย 1 ใบก่อนสร้างไฟล์ Excel', true);
        return;
    }
    
    syncInputs();
    
    const originalBtnText = elements.btnGenerateExcel.innerHTML;
    elements.btnGenerateExcel.disabled = true;
    elements.btnGenerateExcel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างไฟล์...';
    
    try {
        const response = await fetch('/api/generate_excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'สร้าง Excel ล้มเหลว');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'สรุปค่าใช้จ่าย_เบิกเงินค่าพัสดุ.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('สร้างและดาวน์โหลดไฟล์ Excel สำเร็จ!');
        
    } catch (error) {
        console.error(error);
        showToast(`เกิดข้อผิดพลาด: ${error.message}`, true);
    } finally {
        elements.btnGenerateExcel.disabled = false;
        elements.btnGenerateExcel.innerHTML = originalBtnText;
    }
});

// ==========================================
// AI Analyze
// ==========================================
elements.btnAiAnalyze.addEventListener('click', async () => {
    let allItems = [];
    state.invoices.forEach(inv => {
        inv.items.forEach(item => {
            allItems.push({ description: item.description, quantity: item.quantity });
        });
    });
    
    if (allItems.length === 0) {
        showToast('ไม่พบรายการสินค้าเพื่อส่งไปวิเคราะห์', true);
        return;
    }
    
    if (!state.apiKey) {
        showToast('กรุณากรอก API Key ในเมนูตั้งค่าก่อนให้ AI วิเคราะห์', true);
        elements.btnSettings.click();
        return;
    }
    
    const originalText = elements.btnAiAnalyze.innerHTML;
    elements.btnAiAnalyze.disabled = true;
    elements.btnAiAnalyze.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังวิเคราะห์บิล...';
    
    try {
        const response = await fetch('/api/analyze_purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: state.apiKey,
                provider: state.apiProvider,
                items: allItems,
                department: elements.inputDept.value || 'สคร.'
            })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'การวิเคราะห์บิลล้มเหลว');
        }
        
        const data = await response.json();
        
        // Only update regulatory text from AI analysis
        elements.textareaRegulatory.value = data.regulatory_text || '';
        state.regulatory_text = data.regulatory_text || '';
        
        showToast('AI วิเคราะห์ข้อมูลและเรียบเรียงข้อความสำเร็จ!');
        
    } catch (error) {
        console.error(error);
        showToast(`เกิดข้อผิดพลาดในการวิเคราะห์: ${error.message}`, true);
    } finally {
        elements.btnAiAnalyze.disabled = false;
        elements.btnAiAnalyze.innerHTML = originalText;
    }
});

// ==========================================
// Startup / Init
// ==========================================
async function validateSavedKeyOnLoad() {
    if (!state.apiKey) {
        updateDropzoneState(false);
        elements.keyStatusDot.className = 'status-dot dot-gray';
        showToast('ไม่พบ API Key, กรุณาตั้งค่าเพื่อเปิดใช้งานการอัปโหลดรูปภาพบิล', true);
        elements.btnSettings.click();
        return;
    }
    
    elements.keyStatusDot.className = 'status-dot';
    elements.keyStatusDot.style.backgroundColor = 'var(--warning)';
    
    try {
        const response = await fetch('/api/validate_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: state.apiKey, provider: state.apiProvider })
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
        updateDropzoneState(true);
        elements.keyStatusDot.className = 'status-dot dot-gray';
        elements.keyStatusDot.style.backgroundColor = '';
    }
}

window.addEventListener('load', async () => {
    validateSavedKeyOnLoad();
    calculateTotals();
    await fetchContacts();
});
