const API_URL = '/api/vendors';
let currentId = null;
let debounceTimer = null;
let mode = 'new';
const fieldIds = ['vendor-name', 'contact-person', 'contact-email', 'contact-phone', 'is-active', 'contract-start-date', 'contract-end-date'];

function applyFieldSizes() {
  const c = document.getElementById('vendor-code'); if(c) c.style.flex = 'none'; if(c) c.style.width = '150px';
  const s = document.getElementById('is-active'); if(s) s.style.flex = 'none'; if(s) s.style.width = '80px';
}

function toggleMode() {
  if (mode === 'new') {
    mode = 'find';
    document.getElementById('mode-toggle-btn').textContent = 'New';
    document.getElementById('mode-toggle-btn').className = 'btn-mode-new';
    document.getElementById('mode-label').textContent = 'Find Record';
  } else {
    mode = 'new';
    document.getElementById('mode-toggle-btn').textContent = 'Find';
    document.getElementById('mode-toggle-btn').className = 'btn-mode-find';
    document.getElementById('mode-label').textContent = 'New Entry';
    loadNextId();
  }
  resetForm(true);
}

async function loadNextId() {
  try {
    const res = await fetch(`${API_URL}/next-id`);
    const json = await res.json();
    if (json.success) setIdBadge(json.next_id + ' (preview)');
  } catch (e) {}
}

function handleCodeInput(v) {
  if (mode !== 'find') return;
  clearTimeout(debounceTimer);
  const code = v.trim();
  if (!code) { resetForm(false); loadNextId(); return; }
  debounceTimer = setTimeout(() => fetchByCode(code), 500);
}

async function fetchByCode(code) {
  try {
    const res = await fetch(`${API_URL}/code/${encodeURIComponent(code)}`);
    const json = await res.json();
    if (json.success) { populateForm(json.data); showMessage('Record found.', 'info'); }
    else { resetForm(false); showMessage('No record found.', 'error'); }
  } catch (err) { showMessage('Could not reach server.', 'error'); }
}

function populateForm(data) {
  currentId = data.vendor_id;
  setIdBadge(currentId);
  document.getElementById('vendor-code').value = data.vendor_code || '';
  document.getElementById('vendor-name').value = data.vendor_name || '';
  document.getElementById('contact-person').value = data.contact_person || '';
  document.getElementById('contact-email').value = data.contact_email || '';
  document.getElementById('contact-phone').value = data.contact_phone || '';
  document.getElementById('contract-start-date').value = data.contract_start_date || '';
  document.getElementById('contract-end-date').value = data.contract_end_date || '';
  document.getElementById('is-active').value = data.is_active != null ? data.is_active : '1';
  if (mode === 'find') {
    addGreenTint(fieldIds);
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('save-btn').className = 'btn-save btn-update';
  }
}

function resetForm(clearCode) {
  currentId = null;
  if (clearCode) document.getElementById('vendor-code').value = '';
  document.getElementById('vendor-name').value = '';
  document.getElementById('contact-person').value = '';
  document.getElementById('contact-email').value = '';
  document.getElementById('contact-phone').value = '';
  document.getElementById('contract-start-date').value = '';
  document.getElementById('contract-end-date').value = '';
  document.getElementById('is-active').value = '1';
  removeGreenTint(fieldIds);
  document.getElementById('save-btn').textContent = 'Save';
  document.getElementById('save-btn').className = 'btn-save';
  hideMessage();
  resetIdBadge();
}

async function handleSave() {
  const payload = {
    vendor_code: document.getElementById('vendor-code').value.trim(),
    vendor_name: document.getElementById('vendor-name').value.trim(),
    contact_person: document.getElementById('contact-person').value.trim(),
    contact_email: document.getElementById('contact-email').value.trim(),
    contact_phone: document.getElementById('contact-phone').value.trim(),
    contract_start_date: document.getElementById('contract-start-date').value,
    contract_end_date: document.getElementById('contract-end-date').value,
    is_active: document.getElementById('is-active').value
  };
  if (!payload.vendor_code || !payload.vendor_name) return showMessage('Code and Name required.', 'error');
  try {
    const res = await fetch(currentId ? `${API_URL}/${currentId}` : API_URL, {
      method: currentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      if (!currentId) { resetForm(true); if (mode === 'new') loadNextId(); showMessage('Vendor saved.', 'success'); }
      else showMessage('Vendor updated.', 'success');
    } else showMessage(json.message || 'Error saving.', 'error');
  } catch (e) { showMessage('Server error.', 'error'); }
}

async function handleNext() {
  if (!currentId) return showMessage('Use Find mode.', 'info');
  try {
    const res = await fetch(`${API_URL}/next/${currentId}`);
    const json = await res.json();
    if (json.success) populateForm(json.data);
    else showMessage(json.message || 'Last record.', 'info');
  } catch (e) {}
}

async function handlePrevious() {
  if (!currentId) return showMessage('Use Find mode.', 'info');
  try {
    const res = await fetch(`${API_URL}/previous/${currentId}`);
    const json = await res.json();
    if (json.success) populateForm(json.data);
    else showMessage(json.message || 'First record.', 'info');
  } catch (e) {}
}

function handleExit() { window.location.href = '../../index.html'; }

window.onload = () => { applyFieldSizes(); loadNextId(); };
